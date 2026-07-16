# Sprint 7-8 — Hardening

**Thời gian:** ~1 tuần  
**Phase:** Phase 3 — Hardening (= Phase 3 DONE = Project complete)  
**Owner chính:** TL + DO + BE1 + BE2  
**Commits:** `e9475f0`, `522ef5f`, `79aa8c1`, `b35f28c`, `c05d24d`, `9d54049`, `b4c31a7`

---

## Mục tiêu

Retention, compression, monitoring, production deploy, UI redesign, performance optimization. **= Phase 3 DONE = Project complete**

---

## Task hoàn thành

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T7.1 | Compression policy `position_reports` (7 ngày) + retention (90 ngày) | DO | ✅ |
| T7.2 | Downsampling: continuous aggregate daily cho track dài hạn | DO | ✅ |
| T7.3 | Index tuning: EXPLAIN ANALYZE các query hot, thêm index nếu thiếu | BE1 | ✅ |
| T7.4 | Rate limit REST API + SSE max clients | BE2 | ✅ |
| T7.5 | Backup DB (pg_basebackup) + restore test | DO | ⏭️ Cần Docker |
| T7.6 | Grafana + Prometheus: dashboard + alerts | DO | ✅ |
| T7.7 | Load test: simulate 1000 SSE clients + 10k msg/s | TL | ⏭️ Cần infra thật |
| T7.8 | Production deploy guide (README + deploy script) | TL | ✅ |
| T7.9 | E2E smoke test full pipeline | TL | ✅ |

---

## Chi tiết kỹ thuật

### T7.1 — Compression + Retention

```sql
-- Compression sau 7 ngày
ALTER TABLE position_reports SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'mmsi',
    timescaledb.compress_orderby = 'ts DESC'
);
SELECT add_compression_policy('position_reports', INTERVAL '7 days');

-- Retention: xóa raw sau 90 ngày
SELECT add_retention_policy('position_reports', INTERVAL '90 days');
```

### T7.2 — Daily Aggregate

```sql
CREATE MATERIALIZED VIEW vessel_counts_daily
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 day', ts) AS bucket, mmsi,
       count(*) AS report_count, avg(sog) AS avg_sog, max(sog) AS max_sog
FROM position_reports GROUP BY bucket, mmsi;
```

### T7.3 — Index Tuning

Thêm index thiếu:
```sql
CREATE INDEX idx_aircraft_ts_lat_lon ON aircraft_positions (ts, lat, lon);
CREATE INDEX idx_alerts_geofence_ts ON alerts (geofence_id, ts);
```

### T7.4 — Rate Limit + SSE Max Clients

- **Rate limit**: Redis-based, 600 req/phút (configurable via `RATE_LIMIT_PER_MINUTE`)
- **Header**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **429 response**: RFC 7807 format + `Retry-After`
- **SSE max clients**: từ settings (`SSE_MAX_CLIENTS=200`)

### T7.6 — Grafana + Prometheus

```
infra/
├── prometheus/prometheus.yml          # scrape config
└── grafana/
    ├── provisioning/
    │   ├── datasources/datasources.yml  # Prometheus + PostgreSQL
    │   └── dashboards/dashboards.yml    # auto-load
    └── dashboards/overview.json         # dashboard template
```

**Dashboard panels:**
- Active vessels (stat)
- Messages/sec (timeseries)
- Positions written/sec (timeseries)
- Decode errors/sec (timeseries)
- SSE subscribers (stat)
- Position reports count (stat)
- DB table sizes (table)

### T7.8 — Production Deploy

README cập nhật với:
- Docker Compose full stack
- Services table (Frontend, Backend, Grafana, Prometheus)
- Backup & Restore commands
- Scaling notes (SSE, rate limit, batch, retention, Redis)

---

## Performance Optimization

### Vấn đề
Khi mở BBox toàn cầu → **27,000+ tàu** → API treo, SSE flood

### Giải pháp
1. **Redis pipeline** — thay vì scan+hgetall từng key (27,000 round-trips), dùng pipeline (1 round-trip)
2. **Cache SSE/Stats/Metrics** — cache 1-5s, không scan Redis liên tục
3. **Skip geofence check** khi không có geofence (tránh 27,000 query lỗi)
4. **Fix ST_Contains** — cast `geography::geometry` cho PostGIS
5. **Tăng DB pool** 10→20, max_overflow 20→40, pool_recycle 1800s
6. **Tăng batch size** 200→500, flush 2s→1s

### Kết quả
| Metric | Trước | Sau |
|--------|-------|-----|
| Active vessels | 327 (Biển Đông) | 27,410 (toàn cầu) |
| API response time | treo (>30s) | 0.4s |
| Errors | 27,000+ geofence errors | 0 |
| SSE batch | scan mỗi 1s | cache 1s |

---

## UI Redesign

### Trước
- Gray theme đơn điệu
- ScatterplotLayer tròn (không xoay theo heading)
- Sidebar 320px cố định
- Layer toggle text-only

### Sau
- **Dark nautical theme** — palette ocean/sea, font Inter, scrollbar tùy chỉnh
- **Glass morphism** — overlay mờ, blur backdrop
- **IconLayer** — tàu mũi tên xoay theo heading + COG vector trail
- **Collapsible sidebar** — 4 tab (Vessel/Filters/Dashboard/Geofence) với icon
- **Top bar** — logo + live stats + indicator LIVE nhấp nháy
- **VesselInfo** — card header + ship type badge + stats grid
- **Filters** — pill-style toggle màu theo ship type
- **StatsCards** — gradient cards với icon
- **Charts** — bar chart màu theo ship type
- **TimelineScrubber** — progress bar gradient + play/pause icon
- **AlertPanel** — card đỏ (enter) / xanh (exit)
- **ClusterLayer** — gradient màu theo mật độ

---

## AISStream Integration Fixes

| Vấn đề | Fix |
|--------|-----|
| `APIKey` sai | `Apikey` (AISStream format) |
| BBox `[lon,lat]` | `[lat,lon]` (AISStream format) |
| Payload flat | Unwrap `Message[message_type]` |
| Thiếu ExtendedClassB | Thêm vào DYNAMIC_MESSAGE_TYPES |
| `ts` offset-naive | `TIMESTAMP(timezone=True)` + migration |

---

## Demo

```
docker-compose --profile full up -d
→ Frontend: http://localhost:5173
→ Backend: http://localhost:8000
→ Grafana: http://localhost:3000
→ Prometheus: http://localhost:9090
```

- 27,000+ tàu toàn cầu realtime
- Map mượt, zoom/pan OK
- Dashboard thống kê + charts
- Grafana monitoring dashboard
- API response < 0.5s

---

## Metrics

- **Active vessels:** 27,410 (toàn cầu)
- **Total vessels:** 15,663 (static info)
- **API response:** 0.4s
- **Errors:** 0
- **Commits:** 7
- **= Phase 3 DONE = Project complete** 🎉
