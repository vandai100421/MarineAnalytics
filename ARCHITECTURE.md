# MarineAnalytics — Architecture

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                             │
│   AISStream.io (WS)          ADSBExchange (REST, Phase 2)        │
└──────────┬──────────────────────────────┬───────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Ingestion  │  │   REST API  │  │   Realtime  │             │
│  │  (WS client │  │  (vessels,  │  │   (SSE)     │             │
│  │  + pyais)   │  │   stats,    │  │  batch 1s,  │             │
│  │             │  │   geofences)│  │  bbox filter│             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                 │                     │
│         ▼                │                 ▼                     │
│  ┌─────────────┐         │          ┌─────────────┐             │
│  │   Alerts    │         │          │   Redis     │             │
│  │  (geofence  │         │          │  (latest    │             │
│  │   engine)   │         │          │   position  │             │
│  └──────┬──────┘         │          │   per MMSI) │             │
│         │                │          └──────┬──────┘             │
└─────────┼────────────────┼─────────────────┼────────────────────┘
          │                │                 │
          ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL + TimescaleDB                            │
│  vessels | position_reports (hypertable) | aircraft_positions   │
│  geofences | alerts | continuous aggregates                     │
└─────────────────────────────────────────────────────────────────┘
          ▲                ▲                 ▲
          │                │                 │
┌─────────┴────────────────┴─────────────────┴────────────────────┐
│                    FRONTEND (React + Vite)                       │
│                                                                  │
│  MapLibre + deck.gl (scatter/cluster/heatmap)                    │
│  Info Panel | Filters | Dashboard | Playback | Geofence editor   │
│  SSE client (EventSource) | REST client (react-query)            │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Data Flow

### 2.1 Ingestion flow (AIS)

1. Backend mở WebSocket tới `wss://stream.aisstream.io/v0/stream` với API key + bbox filter
2. Mỗi message JSON nhận được chứa `MessageType` + `MetaData` (MMSI, timestamp, ship name) + raw payload
3. Dùng `pyais` decode payload → structured fields (lat, lon, sog, cog, heading, nav_status, ship_type, destination, dimensions...)
4. **Dynamic reports** (type 1/2/3/18/19): upsert vào `position_reports` (hypertable) + cập nhật Redis key `pos:{mmsi}` (TTL 1h)
5. **Static reports** (type 5/24): upsert vào `vessels` (name, ship_type, callsign, dimensions, destination, eta)
6. Reconnect với exponential backoff khi WS đứt (1s → 2s → 4s ... max 60s)

### 2.2 Realtime flow (SSE)

1. Client mở `EventSource` tới `/sse/positions?bbox=...&filters=...`
2. Backend duy trì danh sách subscriber (mỗi subscriber có bbox + filter)
3. Mỗi 1 giây, backend đọc Redis positions trong bbox → batch push tới subscriber
4. Client cập nhật marker positions trên deck.gl (diff theo MMSI, không re-create)
5. Heartbeat 15s để giữ connection; auto-reconnect client side

### 2.3 REST flow

- `GET /vessels/positions?bbox=minx,miny,maxx,maxy&types=...&flag=...` → đọc Redis (realtime, fast)
- `GET /vessels/{mmsi}` → đọc `vessels` table
- `GET /vessels/{mmsi}/track?from=...&to=...` → query `position_reports` hypertable (time-range indexed)
- `GET /stats/overview` → đọc continuous aggregate `vessel_counts_hourly`
- `GET /stats/by-type` → aggregate theo ship_type
- `GET /geofences`, `POST /geofences` → CRUD geofences
- `GET /alerts?from=...` → query alerts table

## 3. Database Schema

### 3.1 `vessels` (thông tin tĩnh, upsert)

```sql
CREATE TABLE vessels (
    mmsi          BIGINT PRIMARY KEY,
    name          TEXT,
    ship_type     SMALLINT,          -- AIS ship type code
    ship_type_name TEXT,             -- decoded
    callsign      TEXT,
    imo           BIGINT,
    dim_a         SMALLINT,
    dim_b         SMALLINT,
    dim_c         SMALLINT,
    dim_d         SMALLINT,
    destination   TEXT,
    eta           TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 `position_reports` (hypertable TimescaleDB)

```sql
CREATE TABLE position_reports (
    mmsi        BIGINT NOT NULL,
    ts          TIMESTAMPTZ NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    sog         REAL,            -- speed over ground (knots)
    cog         REAL,            -- course over ground (degrees)
    heading     REAL,
    nav_status  SMALLINT,
    rot         REAL,
    source      TEXT DEFAULT 'aisstream'
);

SELECT create_hypertable('position_reports', 'ts');
CREATE INDEX idx_pos_mmsi_ts ON position_reports (mmsi, ts DESC);
CREATE INDEX idx_pos_ts_lat_lon ON position_reports (ts, lat, lon);

-- Compression sau 7 ngày
ALTER TABLE position_reports SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'mmsi',
    timescaledb.compress_orderby = 'ts DESC'
);
SELECT add_compression_policy('position_reports', INTERVAL '7 days');

-- Retention: xóa raw sau 90 ngày (giữ downsampling)
SELECT add_retention_policy('position_reports', INTERVAL '90 days');
```

### 3.3 Continuous aggregate (dashboard stats)

```sql
CREATE MATERIALIZED VIEW vessel_counts_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', ts) AS bucket,
    mmsi,
    count(*) AS report_count,
    avg(sog) AS avg_sog,
    max(sog) AS max_sog
FROM position_reports
GROUP BY bucket, mmsi;
```

### 3.4 `geofences` + `alerts`

```sql
CREATE TABLE geofences (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,            -- 'restricted' | 'warning' | 'custom'
    geom        GEOGRAPHY(POLYGON, 4326) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alerts (
    id          BIGSERIAL PRIMARY KEY,
    mmsi        BIGINT NOT NULL,
    geofence_id INT REFERENCES geofences(id),
    ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_type  TEXT NOT NULL,            -- 'enter' | 'exit'
    lat         DOUBLE PRECISION,
    lon         DOUBLE PRECISION
);
CREATE INDEX idx_alerts_ts ON alerts (ts DESC);
```

### 3.5 `aircraft_positions` (Phase 2, ADS-B)

```sql
CREATE TABLE aircraft_positions (
    hex         TEXT NOT NULL,            -- ICAO hex
    ts          TIMESTAMPTZ NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    alt         REAL,
    gs          REAL,                     -- ground speed (knots)
    track       REAL,
    flight      TEXT,
    reg         TEXT,
    type        TEXT
);
SELECT create_hypertable('aircraft_positions', 'ts');
```

## 4. Backend Module Structure

```
backend/app/
├── main.py                    # FastAPI app factory + lifespan
├── core/
│   ├── config.py              # Settings (pydantic-settings, env)
│   ├── db.py                  # async SQLAlchemy engine + session
│   ├── redis.py               # async redis client
│   └── logging.py             # structured logging
├── models/                    # SQLAlchemy ORM models
│   ├── vessel.py
│   ├── position.py
│   ├── geofence.py
│   └── alert.py
├── schemas/                   # pydantic request/response schemas
│   ├── vessel.py
│   ├── position.py
│   ├── stats.py
│   └── geofence.py
├── ingestion/
│   ├── aisstream_client.py    # WS client + reconnect
│   ├── decoder.py             # pyais decode + normalize
│   └── writer.py              # upsert DB + Redis
├── realtime/
│   ├── sse.py                 # SSE endpoint + subscriber manager
│   └── broadcaster.py         # batch 1s loop
├── api/
│   ├── vessels.py             # REST routes
│   ├── stats.py
│   ├── geofences.py
│   └── alerts.py
├── alerts/
│   └── geofence_engine.py     # ST_Contains check
├── tasks/
│   ├── retention.py           # retention/compression jobs
│   └── scheduler.py           # APScheduler
└── tests/
```

## 5. Frontend Module Structure

```
frontend/src/
├── main.tsx
├── App.tsx
├── api/
│   ├── client.ts              # axios/fetch base
│   ├── vessels.ts             # react-query hooks
│   └── stats.ts
├── hooks/
│   ├── useSSE.ts              # EventSource wrapper + reconnect
│   └── useViewport.ts         # map bbox state
├── store/
│   └── mapStore.ts            # zustand: viewport, filters, selected
├── components/
│   ├── map/
│   │   ├── MapView.tsx        # MapLibre container + deck.gl layers
│   │   ├── VesselLayer.tsx    # scatterplot + icon
│   │   ├── ClusterLayer.tsx
│   │   └── HeatmapLayer.tsx
│   ├── panel/
│   │   ├── VesselInfo.tsx
│   │   └── Filters.tsx
│   ├── dashboard/
│   │   ├── StatsCards.tsx
│   │   └── Charts.tsx         # recharts
│   ├── playback/
│   │   └── TimelineScrubber.tsx
│   └── geofence/
│       └── GeofenceEditor.tsx
└── types/
    └── index.ts               # shared TS types (match backend schemas)
```

## 6. Key Design Decisions

### Tại sao SSE thay vì WebSocket cho client?

- Dữ liệu chảy 1 chiều (server → client), không cần client gửi lệnh realtime
- SSE tự reconnect native (EventSource), đơn giản hơn WS
- HTTP/1.1 compatible, đi qua proxy/load-balancer dễ hơn
- Khi cần client→server (vẽ geofence), dùng REST POST riêng

### Tại sao Redis cache vị trí mới nhất?

- SSE cần đọc vị trí realtime mỗi 1s → query Postgres liên tục tốn tài nguyên
- Redis hash `pos:{mmsi}` O(1) lookup, store lat/lon/sog/cog/heading/ts
- Track lịch sử vẫn query Postgres hypertable (có index time-range)
- TTL 1h tự cleanup tàu không còn phát tín hiệu

### Tại sao TimescaleDB thay vì Postgres thường?

- `position_reports` grow nhanh (~millions rows/hour) → Postgres thường chậm khi query time-range
- Hypertable auto-partition theo thời gian → query time-range chỉ scan partition liên quan
- Continuous aggregates cho dashboard (pre-compute hourly counts)
- Native compression + retention policy → giảm storage + auto cleanup

### Tại sao deck.gl thay vì Leaflet marker?

- Leaflet `L.marker` render DOM element → chết ở ~500-1000 markers
- deck.gl render WebGL → handle 10k+ markers mượt
- Built-in clustering (via supercluster) + HexagonLayer cho heatmap
- Tích hợp tốt với MapLibre (cùng stack WebGL)
