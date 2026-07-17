"""
SSE Load Test — simulate N concurrent SSE clients.

Tests the /sse/positions endpoint under load.
Measures: connection success rate, message throughput per client, latency.

Usage:
    python tests/load_test_sse.py --clients 100 --duration 60

Requirements: httpx (already in backend deps)
"""
from __future__ import annotations

import argparse
import asyncio
import json
import time
from collections.abc import AsyncIterator

import httpx


async def sse_client(
    client_id: int,
    base_url: str,
    duration: int,
    bbox: str,
    results: dict[str, object],
) -> None:
    url = f"{base_url}/sse/positions?bbox={bbox}"
    messages = 0
    connected = False
    errors = 0
    latencies: list[float] = []

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(duration + 10)) as client:
            async with client.stream("GET", url) as resp:
                if resp.status_code != 200:
                    results["errors"] = int(results["errors"]) + 1
                    return
                connected = True
                msg_start = time.monotonic()

                async for line in resp.aiter_lines():
                    if time.monotonic() - start > duration:
                        break
                    if line.startswith("data:"):
                        messages += 1
                        now = time.monotonic()
                        latencies.append(now - msg_start)
                        msg_start = now
                    elif line == "":
                        continue
    except Exception as e:
        errors += 1
        print(f"  client {client_id}: error: {e}")

    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    print(
        f"  client {client_id:4d}: {'OK' if connected else 'FAIL'} "
        f"msgs={messages:5d} avg_lat={avg_latency:.3f}s errors={errors}"
    )

    client_results: list[dict[str, object]] = results["clients"]  # type: ignore[assignment]
    client_results.append(
        {
            "id": client_id,
            "connected": connected,
            "messages": messages,
            "avg_latency": round(avg_latency, 3),
            "errors": errors,
        }
    )
    results["total_messages"] = int(results["total_messages"]) + messages


async def run_load_test(base_url: str, num_clients: int, duration: int, bbox: str) -> None:
    print(f"=== SSE Load Test ===")
    print(f"URL: {base_url}/sse/positions?bbox={bbox}")
    print(f"Clients: {num_clients}, Duration: {duration}s")
    print()

    results: dict[str, object] = {
        "total_messages": 0,
        "errors": 0,
        "clients": [],
    }

    start = time.monotonic()
    await asyncio.gather(
        *[sse_client(i, base_url, duration, bbox, results) for i in range(num_clients)]
    )
    elapsed = time.monotonic() - start

    clients: list[dict[str, object]] = results["clients"]  # type: ignore[assignment]
    connected_count = sum(1 for c in clients if c["connected"])
    total_msgs = int(results["total_messages"])

    print()
    print(f"=== Results ===")
    print(f"Elapsed: {elapsed:.1f}s")
    print(f"Connected: {connected_count}/{num_clients} ({connected_count / num_clients * 100:.1f}%)")
    print(f"Total messages: {total_msgs}")
    print(f"Avg msgs/sec: {total_msgs / elapsed:.1f}")
    print(f"Avg msgs/sec/client: {total_msgs / elapsed / num_clients:.1f}")
    avg_lats = [c["avg_latency"] for c in clients if c["avg_latency"] > 0]
    if avg_lats:
        print(f"Avg latency: {sum(avg_lats) / len(avg_lats):.3f}s")
    print(f"Errors: {results['errors']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="SSE Load Test")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--clients", type=int, default=100, help="Number of concurrent clients")
    parser.add_argument("--duration", type=int, default=30, help="Test duration (seconds)")
    parser.add_argument(
        "--bbox",
        default="100,0,110,25",
        help="Bounding box (min_lon,min_lat,max_lon,max_lat)",
    )
    args = parser.parse_args()

    asyncio.run(run_load_test(args.url, args.clients, args.duration, args.bbox))


if __name__ == "__main__":
    main()
