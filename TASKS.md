# MarineAnalytics — Task List

Checklist theo sprint + phase. Đánh dấu `[x]` khi hoàn thành. Mỗi task có owner (xem DEVELOPMENT_RULES.md mục 1).

Legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 1 — MVP AIS (Sprint 0-3)

### Sprint 0 — Scaffolding & "1 tàu lên bản đồ" (tuần 1)

Owner chính: **TL + DO** (scaffold), mọi người setup local.

- [x] **T0.1** [DO] Tạo `docker-compose.yml`: timescaledb, redis, backend, frontend
- [x] **T0.2** [DO] Tạo `.env.example` với tất cả env var cần thiết
- [x] **T0.3** [TL] Scaffolding backend: `pyproject.toml`, `app/` structure, FastAPI app factory + lifespan
- [x] **T0.4** [TL] Scaffolding frontend: Vite + React + TS, tailwind, deck.gl, maplibre-gl, react-query, zustand
- [x] **T0.5** [BE1] `core/config.py`: pydantic-settings (DB_URL, REDIS_URL, AISSTREAM_API_KEY, BBOX)
- [x] **T0.6** [BE1] `core/db.py`: async SQLAlchemy engine + session factory
- [x] **T0.7** [BE1] `core/redis.py`: async redis client
- [x] **T0.8** [BE1] Alembic init + migration tạo `vessels` + `position_reports` (hypertable)
- [x] **T0.9** [BE1] `ingestion/aisstream_client.py` bản nháp: connect WS, nhận 1 message, log ra
- [x] **T0.10** [FE1] `components/map/MapView.tsx`: MapLibre container render 1 point hardcode
- [x] **T0.11** [TL] E2E smoke: WS → decode → DB → API → map hiển thị 1 tàu
- [x] **T0.12** [DO] CI: GitHub Actions chạy lint + typecheck (ruff, mypy, eslint, tsc)

> **Demo Sprint 0**: `docker-compose up` → bản đồ hiển thị 1 tàu (data thật từ AISStream).

### Sprint 1 — Ingestion đầy đủ (tuần 2)

Owner chính: **BE1** (module khó nhất).

- [x] **T1.1** [BE1] `ingestion/decoder.py`: decode tất cả AIS message types qua `pyais` + normalize fields
- [x] **T1.2** [BE1] Unit test `decoder.py`: type 1/2/3/5/18/19/24, edge case malformed payload
- [x] **T1.3** [BE1] `ingestion/writer.py`: upsert `vessels` (static type 5/24) + insert `position_reports` (dynamic)
- [x] **T1.4** [BE1] `ingestion/writer.py`: upsert Redis `pos:{mmsi}` hash (lat/lon/sog/cog/heading/ts), TTL 1h
- [x] **T1.5** [BE1] Reconnect exponential backoff trong `aisstream_client.py` (1s→2s→4s...max 60s)
- [x] **T1.6** [BE1] BBox filter khi subscribe AISStream
- [x] **T1.7** [BE1] Structured logging + error metrics (decode error count, msg/sec)
- [x] **T1.8** [BE2] `models/` ORM: Vessel, PositionReport, Geofence, Alert (match schema ARCHITECTURE.md)
- [x] **T1.9** [BE2] `schemas/` pydantic: VesselResponse, PositionResponse, PaginatedResponse
- [ ] **T1.10** [DO] Grafana + Prometheus: dashboard msg/sec, DB size, Redis ops

> **Demo Sprint 1**: Ingestion chạy ổn định, DB có data thật, Redis có latest position.

### Sprint 2 — REST API + Bản đồ cơ bản (tuần 3)

Owner chính: **BE2** (API) + **FE1** (map).

- [x] **T2.1** [BE2] `api/vessels.py`: `GET /vessels/positions?bbox=...&types=...` (đọc Redis)
- [x] **T2.2** [BE2] `api/vessels.py`: `GET /vessels/{mmsi}` (đọc `vessels` table)
- [x] **T2.3** [BE2] `api/vessels.py`: `GET /vessels/{mmsi}/track?from=...&to=...` (query hypertable)
- [x] **T2.4** [BE2] Integration test cho 3 endpoint trên (testcontainers)
- [x] **T2.5** [BE2] Error handler RFC 7807 + pagination wrapper
- [x] **T2.6** [FE1] `api/client.ts` + `api/vessels.ts`: react-query hooks (`useVesselPositions`, `useVessel`, `useVesselTrack`)
- [x] **T2.7** [FE1] `types/index.ts`: TS types match backend schemas
- [x] **T2.8** [FE1] `components/map/VesselLayer.tsx`: deck.gl ScatterplotLayer + icon theo heading
- [x] **T2.9** [FE1] `components/map/ClusterLayer.tsx`: clustering khi zoom out (supercluster)
- [x] **T2.10** [FE1] `hooks/useViewport.ts`: map bbox state + trigger refetch khi move/zoom
- [x] **T2.11** [FE1] `store/mapStore.ts`: zustand (viewport, filters, selected MMSI)
- [x] **T2.12** [FE2] `components/panel/VesselInfo.tsx`: click tàu → hiện thông tin (name, MMSI, sog, cog, type, destination)
- [x] **T2.13** [FE2] `components/panel/Filters.tsx`: lọc theo ship_type, sog range
- [x] **T2.14** [FE2] Layout `App.tsx`: map full screen + sidebar panel + filter bar

> **Demo Sprint 2**: "MarineTraffic cơ bản" — tàu hiển thị, cluster, click xem info, lọc.

### Sprint 3 — Realtime SSE + Dashboard (tuần 4)

Owner chính: **BE2** (realtime) + **FE2** (dashboard).

- [x] **T3.1** [BE2] `realtime/sse.py`: SSE endpoint `/sse/positions?bbox=...` + subscriber manager
- [x] **T3.2** [BE2] `realtime/broadcaster.py`: batch loop 1s đọc Redis → push tới subscribers (filter bbox)
- [x] **T3.3** [BE2] Heartbeat 15s + cleanup subscriber rời
- [x] **T3.4** [BE2] Backpressure: drop stale positions, max clients config
- [x] **T3.5** [BE1] Continuous aggregate `vessel_counts_hourly` (migration)
- [x] **T3.6** [BE2] `api/stats.py`: `GET /stats/overview` (count tàu active, avg sog) + `GET /stats/by-type`
- [x] **T3.7** [FE1] `hooks/useSSE.ts`: EventSource wrapper + auto-reconnect + diff update markers
- [x] **T3.8** [FE1] Tích hợp SSE vào VesselLayer: update position realtime không re-create marker
- [x] **T3.9** [FE2] `components/dashboard/StatsCards.tsx`: số tàu active, tốc độ TB, vùng có nhiều tàu
- [x] **T3.10** [FE2] `components/dashboard/Charts.tsx`: recharts (bar chart theo ship_type, line chart theo giờ)
- [x] **T3.11** [FE2] Dashboard layout (toggle panel map/dashboard)
- [x] **T3.12** [TL] E2E smoke test: ingestion → Redis → SSE → map realtime

> **Demo Sprint 3**: Map realtime + dashboard thống kê. **= Phase 1 DONE**

---

## Phase 2 — Analytics + ADS-B (Sprint 4-6)

### Sprint 4 — Track Playback + Heatmap (tuần 5)

Owner chính: **FE2** + **BE2**.

- [x] **T4.1** [FE2] `components/playback/TimelineScrubber.tsx`: slider thời gian, play/pause/speed
- [x] **T4.2** [FE2] Playback vessel: query track API → animate path trên deck.gl (PathLayer)
- [x] **T4.3** [BE2] Optimize track query: chỉ SELECT cột cần, limit points (downsample nếu > 5000 points)
- [x] **T4.4** [FE1] `components/map/HeatmapLayer.tsx`: deck.gl HexagonLayer mật độ tàu
- [x] **T4.5** [BE2] `api/stats.py`: `GET /stats/heatmap?bbox=...&from=...&to=...` (aggregate grid)
- [x] **T4.6** [FE2] Toggle heatmap/scatter mode trên map

### Sprint 5 — Geofence Alerts (tuần 6)

Owner chính: **BE2** + **FE2**.

- [x] **T5.1** [BE2] `api/geofences.py`: CRUD geofences (POST/GET/DELETE)
- [x] **T5.2** [BE2] `alerts/geofence_engine.py`: ST_Contains check khi nhận position mới → insert alert
- [x] **T5.3** [BE2] `api/alerts.py`: `GET /alerts?from=...&geofence_id=...`
- [x] **T5.4** [FE2] `components/geofence/GeofenceEditor.tsx`: vẽ polygon trên map (maplibre draw)
- [x] **T5.5** [FE2] Alert panel: danh sách alert gần đây + highlight tàu vi phạm
- [x] **T5.6** [BE2] Unit test geofence engine (ST_Contains edge cases)

### Sprint 6 — ADS-B Ingestion + Máy bay (tuần 7)

Owner chính: **BE1** + **FE1**.

- [x] **T6.1** [BE1] Migration tạo `aircraft_positions` (hypertable)
- [x] **T6.2** [BE1] `ingestion/adsbexchange_client.py`: REST poll + parse
- [x] **T6.3** [BE1] `ingestion/writer.py`: upsert Redis `air:{hex}` + insert DB
- [x] **T6.4** [BE2] `api/aircraft.py`: `GET /aircraft/positions?bbox=...`
- [x] **T6.5** [FE1] Aircraft layer: icon máy bay + rotation theo track
- [x] **T6.6** [FE1] Toggle vessel/aircraft/both trên map
- [x] **T6.7** [FE2] Info panel máy bay (flight, hex, alt, gs, type)

> **Demo Sprint 6**: Cả tàu + máy bay trên bản đồ + analytics. **= Phase 2 DONE**

---

## Phase 3 — Hardening (Sprint 7-8, ~1 tuần)

- [ ] **T7.1** [DO] Compression policy `position_reports` (7 ngày) + retention (90 ngày)
- [ ] **T7.2** [DO] Downsampling: continuous aggregate daily cho track dài hạn
- [ ] **T7.3** [BE1] Index tuning: EXPLAIN ANALYZE các query hot, thêm index nếu thiếu
- [ ] **T7.4** [BE2] Rate limit REST API + SSE max clients
- [ ] **T7.5** [DO] Backup DB (pg_basebackup) + restore test
- [ ] **T7.6** [DO] Grafana alerts: WS down, DB disk > 70%, error rate > 1%
- [ ] **T7.7** [TL] Load test: simulate 1000 SSE clients + 10k msg/s ingestion
- [ ] **T7.8** [TL] Production deploy guide (README + deploy script)
- [ ] **T7.9** [TL] E2E smoke test full pipeline

> **= Phase 3 DONE = Project complete**

---

## Tech Debt / Backlog

Ghi các item technical debt phát sinh trong quá trình làm (không thuộc sprint nào).

- [ ] TD-01: BatchWriter đã tạo nhưng chưa tích hợp vào aisstream_client (hiện write single message)
- [ ] TD-02: VesselLayer chưa có icon rotation theo heading (đang dùng scatterplot tròn)
- [ ] TD-03: Grafana + Prometheus dashboard chưa setup (T1.10 defer Phase 3)
- [ ] TD-04: Frontend bundle > 500kB, cần code-split (deck.gl/recharts lazy load)

---

## Notes

- Owner trong ngoặc vuông là người **chính**, người khác có thể support/review.
- Task blocked → đánh dấu `[!]` + ghi lý do trong standup.
- Khi hoàn thành task → đánh dấu `[x]` + commit TASKS.md trong cùng PR.
- Sprint bị trượt → move task xuống sprint sau + báo TL.
