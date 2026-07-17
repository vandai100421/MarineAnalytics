"""
Ingestion Throughput Test — measures messages processed per second.

Reads metrics from /api/v1/monitoring/metrics endpoint over a time window
and calculates ingestion rate (msg/s), decode error rate, and DB write rate.

Usage:
    python tests/load_test_ingestion.py --duration 60
"""
from __future__ import annotations

import argparse
import asyncio
import time

import httpx


async def get_metrics(client: httpx.AsyncClient, base_url: str) -> dict[str, object]:
    resp = await client.get(f"{base_url}/metrics")
    resp.raise_for_status()
    text = resp.text
    result: dict[str, object] = {}
    for line in text.split("\n"):
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split()
        if len(parts) == 2:
            try:
                result[parts[0]] = int(parts[1])
            except ValueError:
                try:
                    result[parts[0]] = float(parts[1])
                except ValueError:
                    result[parts[0]] = parts[1]
    return result


async def run_throughput_test(base_url: str, duration: int) -> None:
    print("=== Ingestion Throughput Test ===")
    print(f"URL: {base_url}/metrics")
    print(f"Duration: {duration}s")
    print()

    async with httpx.AsyncClient(timeout=10) as client:
        print("Sampling metrics...")
        start_metrics = await get_metrics(client, base_url)
        start_time = time.monotonic()

        samples: list[dict[str, object]] = [start_metrics]

        for _ in range(duration):
            await asyncio.sleep(1)
            try:
                m = await get_metrics(client, base_url)
                samples.append(m)
            except Exception as e:
                print(f"  sample error: {e}")

        end_metrics = await get_metrics(client, base_url)
        elapsed = time.monotonic() - start_time

    start_total = int(start_metrics.get("marineanalytics_messages_total", 0))
    end_total = int(end_metrics.get("marineanalytics_messages_total", 0))
    start_errors = int(start_metrics.get("marineanalytics_decode_errors_total", 0))
    end_errors = int(end_metrics.get("marineanalytics_decode_errors_total", 0))
    start_written = int(start_metrics.get("marineanalytics_positions_written_total", 0))
    end_written = int(end_metrics.get("marineanalytics_positions_written_total", 0))

    msg_delta = end_total - start_total
    error_delta = end_errors - start_errors
    written_delta = end_written - start_written

    msg_rate = msg_delta / elapsed if elapsed > 0 else 0
    error_rate = (error_delta / msg_delta * 100) if msg_delta > 0 else 0
    write_rate = written_delta / elapsed if elapsed > 0 else 0

    print()
    print("=== Results ===")
    print(f"Elapsed: {elapsed:.1f}s")
    print(f"Messages received: {msg_delta:,} ({msg_rate:.1f} msg/s)")
    print(f"Decode errors: {error_delta} ({error_rate:.2f}%)")
    print(f"Positions written: {written_delta:,} ({write_rate:.1f}/s)")
    print()
    print("Current totals:")
    print(f"  Total messages: {end_total:,}")
    print(f"  Total errors: {end_errors:,}")
    print(f"  Total written: {end_written:,}")

    if msg_rate > 0:
        print()
        print("Status: PASS" if msg_rate > 100 else "Status: LOW RATE")
    else:
        print()
        print("Status: NO DATA (is ingestion running?)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingestion Throughput Test")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--duration", type=int, default=30, help="Test duration (seconds)")
    args = parser.parse_args()

    asyncio.run(run_throughput_test(args.url, args.duration))


if __name__ == "__main__":
    main()
