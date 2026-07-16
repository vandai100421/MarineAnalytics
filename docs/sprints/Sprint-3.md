# Sprint 3 — Realtime SSE + Dashboard

**Thời gian:** Tuần 4  
**Phase:** Phase 1 — MVP AIS (= Phase 1 DONE)  
**Owner chính:** BE2 (realtime) + FE2 (dashboard)  
**Commit:** `4a6ad6a`

---

## Mục tiêu

Realtime SSE push vị trí tàu mỗi giây + dashboard thống kê. **= Phase 1 DONE**

---

## Task hoàn thành

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T3.1 | `realtime/sse.py`: SSE endpoint `/sse/positions?bbox=...` + subscriber manager | BE2 | ✅ |
| T3.2 | `realtime/broadcaster.py`: batch loop 1s đọc Redis → push tới subscribers (filter bbox) | BE2 | ✅ |
| T3.3 | Heartbeat 15s + cleanup subscriber rời | BE2 | ✅ |
| T3.4 | Backpressure: drop stale positions, max clients config | BE2 | ✅ |
| T3.5 | Continuous aggregate `vessel_counts_hourly` (migration) | BE1 | ✅ |
| T3.6 | `api/stats.py`: `GET /stats/overview` + `GET /stats/by-type` | BE2 | ✅ |
| T3.7 | `hooks/useSSE.ts`: EventSource wrapper + auto-reconnect + diff update markers | FE1 | ✅ |
| T3.8 | Tích hợp SSE vào VesselLayer: update position realtime không re-create marker | FE1 | ✅ |
| T3.9 | `components/dashboard/StatsCards.tsx`: số tàu active, tốc độ TB, vùng có nhiều tàu | FE2 | ✅ |
| T3.10 | `components/dashboard/Charts.tsx`: recharts (bar chart theo ship_type, line chart theo giờ) | FE2 | ✅ |
| T3.11 | Dashboard layout (toggle panel map/dashboard) | FE2 | ✅ |
| T3.12 | E2E smoke test: ingestion → Redis → SSE → map realtime | TL | ✅ |

---

## Kiến trúc Realtime SSE

```
Client (EventSource)
    ↓ /sse/positions?bbox=...
Backend SSE Endpoint
    ↓ SubscriberManager (set of Subscriber)
Broadcaster (batch loop 1s)
    ↓ scan Redis pos:* → filter bbox → push queue
Subscriber.queue (maxsize 500)
    ↓ yield event "positions"
Client cập nhật marker (diff theo MMSI)
```

### Tại sao SSE thay vì WebSocket?
- Dữ liệu chảy 1 chiều (server → client)
- EventSource tự reconnect native
- HTTP/1.1 compatible, đi qua proxy dễ
- Khi cần client→server (vẽ geofence), dùng REST POST riêng

---

## API Endpoints mới

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/sse/positions` | GET (SSE) | Realtime positions stream |
| `/api/v1/stats/overview` | GET | Active vessels, total, avg sog |
| `/api/v1/stats/by-type` | GET | Vessel count by ship type |

---

## Dashboard

- **StatsCards**: Active vessels, Total vessels, Avg speed (3 cards)
- **Charts**: Bar chart vessel count by ship type (recharts)
- **Toggle**: map view ↔ dashboard view

---

## Demo

```
Map realtime + dashboard thống kê. = Phase 1 DONE
```

- Mở `http://localhost:5173` → tàu di chuyển realtime (cập nhật mỗi 1s)
- Click tàu → info panel
- Tab Dashboard → thống kê + charts
- SSE tự reconnect khi network đứt

---

## Lessons Learned

- SSE batch 1s quan trọng — không push mỗi message (flood client)
- `asyncio.Queue(maxsize=500)` cho backpressure — drop khi client chậm
- Subscriber phải là `@dataclass(eq=False)` để hashable trong set
- Continuous aggregate cần TimescaleDB extension (guard check trong migration)
- React-query + SSE combo: REST cho initial load, SSE cho updates

---

## Metrics

- **SSE batch interval:** 1s
- **Heartbeat:** 15s
- **Max clients:** 200 (configurable)
- **Dashboard stats:** 3 cards + 1 chart
- **= Phase 1 MVP DONE** 🎉
