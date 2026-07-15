# MarineAnalytics — Project Overview

## Mô tả

Hệ thống thu thập, hiển thị và phân tích dữ liệu vị trí tàu thuyền (AIS) và máy bay (ADS-B) theo thời gian thực, tương tự SeaVision / MarineTraffic.

## Mục tiêu

- Thu thập dữ liệu AIS realtime từ AISStream.io (WebSocket, toàn cầu)
- Thu thập dữ liệu ADS-B từ ADSBExchange (Phase 2)
- Hiển thị vị trí tàu/máy bay trên bản đồ tương tác với clustering
- Cung cấp công cụ phân tích: track playback, heatmap, geofence alerts, dashboard thống kê
- Lưu trữ lịch sử vị trí để truy vấn/phân tích

## Phạm vi

### Trong scope

- Ingestion AIS (AISStream.io) + ADS-B (ADSBExchange)
- Realtime streaming tới client (SSE)
- Bản đồ MapLibre + deck.gl với clustering
- Info panel, bộ lọc, dashboard, track playback, heatmap, geofence alerts
- PostgreSQL + TimescaleDB lưu trữ lịch sử

### Ngoài scope (MVP)

- Auth/đa người dùng (chưa cần)
- Mobile app
- Dự báo lộ trình / AI
- Tích hợp thời tiết/bản đồ biển

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Backend | FastAPI, Python 3.11, pyais, SQLAlchemy 2 (async), asyncpg, redis-py, sse-starlette, alembic |
| Frontend | React 18, Vite, TypeScript, maplibre-gl, deck.gl, @tanstack/react-query, zustand, tailwindcss, recharts |
| Database | PostgreSQL 16 + TimescaleDB (hypertable, continuous aggregates) |
| Cache | Redis 7 |
| DevOps | docker-compose, Grafana (monitoring) |

## Nguồn dữ liệu

| Nguồn | Loại | Truy cập | Ghi chú |
|-------|------|----------|---------|
| AISStream.io | AIS | WebSocket (cần API key free) | Realtime toàn cầu, filter theo bbox |
| ADSBExchange | ADS-B | REST + rapidJSON | Máy bay, Phase 2 |

## Phasing

### Phase 1 — MVP AIS (Sprint 0-3, ~4 tuần)

Scaffolding → ingestion đầy đủ → API + bản đồ cơ bản → realtime + dashboard.

### Phase 2 — Analytics + ADS-B (Sprint 4-6, ~3 tuần)

Track playback → heatmap → geofence alerts → ADS-B ingestion → máy bay trên bản đồ.

### Phase 3 — Hardening (Sprint 7-8, ~1 tuần)

Retention, compression, monitoring, production deploy.

## Định nghĩa "Done" cho mỗi Sprint

- Code đã review và merge vào `main`
- Test pass (unit + integration tối thiểu)
- Demo chạy được end-to-end
- Cập nhật TASKS.md
