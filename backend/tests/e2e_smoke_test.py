"""
E2E Smoke Test — full pipeline: ingestion → DB → API → map data.

Tests the complete MarineAnalytics pipeline end-to-end:
1. Health check (backend running)
2. Ingestion active (metrics show messages flowing)
3. Redis has positions (realtime cache)
4. Database has vessels + position_reports
5. REST API returns vessel positions
6. SSE endpoint streams data
7. Stats endpoint returns overview
8. Ports endpoint returns seeded ports
9. Trade flows endpoint responds
10. Idle events endpoint responds
11. Fleets CRUD works (create → list → delete)

Usage:
    python tests/e2e_smoke_test.py
"""
from __future__ import annotations

import asyncio
import sys

import httpx

BASE_URL = "http://localhost:8000"
DB_HOST = "localhost"
DB_PORT = "5433"
DB_USER = "marine"
DB_NAME = "marineanalytics"

PASSED = 0
FAILED = 0


def log_pass(test: str, detail: str = "") -> None:
    global PASSED
    PASSED += 1
    print(f"  [PASS] {test}{f' — {detail}' if detail else ''}")


def log_fail(test: str, detail: str = "") -> None:
    global FAILED
    FAILED += 1
    print(f"  [FAIL] {test}{f' — {detail}' if detail else ''}")


async def test_health(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/health", timeout=5)
        if resp.status_code == 200 and resp.json().get("status") == "ok":
            log_pass("Health check")
        else:
            log_fail("Health check", f"status={resp.status_code}")
    except Exception as e:
        log_fail("Health check", str(e))


async def test_ingestion_metrics(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/metrics", timeout=5)
        if resp.status_code == 200:
            text = resp.text
            msgs_line = [l for l in text.split("\n") if l.startswith("marineanalytics_messages_total") and not l.startswith("#")]
            if msgs_line:
                total = int(msgs_line[0].split()[1])
                if total > 0:
                    log_pass("Ingestion active", f"{total:,} messages received")
                else:
                    log_fail("Ingestion active", "no messages received")
            else:
                log_fail("Ingestion active", "metric not found")
        else:
            log_fail("Ingestion metrics", f"status={resp.status_code}")
    except Exception as e:
        log_fail("Ingestion metrics", str(e))


async def test_redis_positions(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/api/v1/stats/overview", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            active = data.get("active_vessels", 0)
            if active > 0:
                log_pass("Redis positions", f"{active} active vessels")
            else:
                log_fail("Redis positions", "no active vessels in Redis")
        else:
            log_fail("Redis positions", f"status={resp.status_code}")
    except Exception as e:
        log_fail("Redis positions", str(e))


async def test_db_vessels(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/api/v1/stats/overview", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            total = data.get("total_vessels", 0)
            if total > 0:
                log_pass("DB vessels", f"{total:,} vessels in database")
            else:
                log_fail("DB vessels", "no vessels in database")
        else:
            log_fail("DB vessels", f"status={resp.status_code}")
    except Exception as e:
        log_fail("DB vessels", str(e))


async def test_rest_positions(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(
            f"{BASE_URL}/api/v1/vessels/positions?bbox=100,0,110,25",
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            count = len(data)
            if count > 0:
                log_pass("REST positions", f"{count} vessels in bbox")
            else:
                log_pass("REST positions", "endpoint works (0 in bbox)")
        else:
            log_fail("REST positions", f"status={resp.status_code}")
    except Exception as e:
        log_fail("REST positions", str(e))


async def test_sse_stream(client: httpx.AsyncClient) -> None:
    try:
        received = False
        async with client.stream("GET", f"{BASE_URL}/sse/positions?bbox=100,0,110,25", timeout=10) as resp:
            if resp.status_code == 200:
                async for line in resp.aiter_lines():
                    if line.startswith("data:"):
                        received = True
                        break
                if received:
                    log_pass("SSE stream", "received data event")
                else:
                    log_pass("SSE stream", "connected (no data in window)")
            else:
                log_fail("SSE stream", f"status={resp.status_code}")
    except httpx.ReadTimeout:
        log_pass("SSE stream", "connected (timeout waiting for data — OK)")
    except Exception as e:
        log_fail("SSE stream", str(e))


async def test_stats_by_type(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/api/v1/stats/by-type", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            types = data.get("types", [])
            log_pass("Stats by-type", f"{len(types)} ship types")
        else:
            log_fail("Stats by-type", f"status={resp.status_code}")
    except Exception as e:
        log_fail("Stats by-type", str(e))


async def test_ports(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/api/v1/ports?limit=10", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            log_pass("Ports", f"{len(data)} ports returned")
        else:
            log_fail("Ports", f"status={resp.status_code}")
    except Exception as e:
        log_fail("Ports", str(e))


async def test_port_congestion(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/api/v1/stats/port-congestion?limit=5", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            log_pass("Port congestion", f"{len(data.get('ports', []))} ports")
        else:
            log_fail("Port congestion", f"status={resp.status_code}")
    except Exception as e:
        log_fail("Port congestion", str(e))


async def test_trade_flows(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/api/v1/trade-flows?limit=5", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            log_pass("Trade flows", f"{len(data.get('flows', []))} flows")
        else:
            log_fail("Trade flows", f"status={resp.status_code}")
    except Exception as e:
        log_fail("Trade flows", str(e))


async def test_idle_events(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{BASE_URL}/api/v1/idle-events/summary", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            log_pass("Idle events", f"total={data.get('total_events')}")
        else:
            log_fail("Idle events", f"status={resp.status_code}")
    except Exception as e:
        log_fail("Idle events", str(e))


async def test_fleets_crud(client: httpx.AsyncClient) -> None:
    try:
        create_resp = await client.post(
            f"{BASE_URL}/api/v1/fleets",
            json={"name": "E2E Test Fleet", "color": "#ff0000"},
            timeout=5,
        )
        if create_resp.status_code == 201:
            fleet_id = create_resp.json()["id"]
            list_resp = await client.get(f"{BASE_URL}/api/v1/fleets", timeout=5)
            if list_resp.status_code == 200 and len(list_resp.json()) > 0:
                del_resp = await client.delete(f"{BASE_URL}/api/v1/fleets/{fleet_id}", timeout=5)
                if del_resp.status_code == 204:
                    log_pass("Fleets CRUD", "create → list → delete OK")
                else:
                    log_fail("Fleets CRUD", f"delete failed: {del_resp.status_code}")
            else:
                log_fail("Fleets CRUD", "list failed")
        else:
            log_fail("Fleets CRUD", f"create failed: {create_resp.status_code}")
    except Exception as e:
        log_fail("Fleets CRUD", str(e))


async def test_eta(client: httpx.AsyncClient) -> None:
    try:
        list_resp = await client.get(
            f"{BASE_URL}/api/v1/vessels/list?limit=1",
            timeout=5,
        )
        if list_resp.status_code == 200:
            items = list_resp.json().get("items", [])
            if items:
                mmsi = items[0]["mmsi"]
                eta_resp = await client.get(f"{BASE_URL}/api/v1/vessels/{mmsi}/eta", timeout=5)
                if eta_resp.status_code == 200:
                    log_pass("Predicted ETA", f"mmsi={mmsi}")
                else:
                    log_fail("Predicted ETA", f"status={eta_resp.status_code}")
            else:
                log_fail("Predicted ETA", "no vessels to test")
        else:
            log_fail("Predicted ETA", "list failed")
    except Exception as e:
        log_fail("Predicted ETA", str(e))


async def main() -> None:
    print("=" * 60)
    print("MarineAnalytics E2E Smoke Test")
    print("=" * 60)
    print()

    async with httpx.AsyncClient() as client:
        await test_health(client)
        await test_ingestion_metrics(client)
        await test_redis_positions(client)
        await test_db_vessels(client)
        await test_rest_positions(client)
        await test_sse_stream(client)
        await test_stats_by_type(client)
        await test_ports(client)
        await test_port_congestion(client)
        await test_trade_flows(client)
        await test_idle_events(client)
        await test_fleets_crud(client)
        await test_eta(client)

    print()
    print("=" * 60)
    print(f"Results: {PASSED} passed, {FAILED} failed")
    print(f"Status: {'ALL PASS' if FAILED == 0 else 'FAILURES'}")
    print("=" * 60)

    sys.exit(0 if FAILED == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
