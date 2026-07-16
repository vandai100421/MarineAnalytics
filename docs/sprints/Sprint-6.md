# Sprint 6 — ADS-B Ingestion + Máy bay

**Thời gian:** Tuần 7  
**Phase:** Phase 2 — Analytics + ADS-B (= Phase 2 DONE)  
**Owner chính:** BE1 + FE1  
**Commit:** `463e649`

---

## Mục tiêu

Thu thập dữ liệu ADS-B (máy bay) từ ADSBExchange + hiển thị trên bản đồ. **= Phase 2 DONE**

---

## Task hoàn thành

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T6.1 | Migration tạo `aircraft_positions` (hypertable) | BE1 | ✅ |
| T6.2 | `ingestion/adsbexchange_client.py`: REST poll + parse | BE1 | ✅ |
| T6.3 | `ingestion/writer.py`: upsert Redis `air:{hex}` + insert DB | BE1 | ✅ |
| T6.4 | `api/aircraft.py`: `GET /aircraft/positions?bbox=...` | BE2 | ✅ |
| T6.5 | Aircraft layer: icon máy bay + rotation theo track | FE1 | ✅ |
| T6.6 | Toggle vessel/aircraft/both trên map | FE1 | ✅ |
| T6.7 | Info panel máy bay (flight, hex, alt, gs, type) | FE2 | ✅ |

---

## ADS-B Ingestion

### Data source
- **ADSBExchange** — REST API poll (cần API key)
- Dữ liệu máy bay: hex (ICAO), lat/lon, alt, ground speed, track, flight, registration, type

### Pipeline
```
ADSBExchange REST API (poll)
    ↓ parse JSON
aircraft_positions hypertable (INSERT)
    ↓
Redis air:{hex} (HSET + TTL 1h)
    ↓
GET /aircraft/positions → frontend
```

---

## Database Schema

```sql
CREATE TABLE aircraft_positions (
    hex         TEXT NOT NULL,
    ts          TIMESTAMPTZ NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    alt         REAL,
    gs          REAL,
    track       REAL,
    flight      TEXT,
    reg         TEXT,
    type        TEXT
);
SELECT create_hypertable('aircraft_positions', 'ts');
```

---

## API Endpoint

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/v1/aircraft/positions` | GET | Vị trí máy bay realtime (Redis) |

Query params: `bbox=min_lon,min_lat,max_lon,max_lat`

---

## Frontend

### Aircraft Layer
- Icon máy bay xoay theo track (heading)
- Toggle vessel / aircraft / both / heatmap
- Info panel: flight, hex, altitude, ground speed, type, registration

### Map modes
```
vessels | aircraft | both | heatmap
```

---

## Demo

```
Cả tàu + máy bay trên bản đồ + analytics. = Phase 2 DONE
```

- Toggle "Aircraft" → máy bay hiện trên map
- Click máy bay → info panel (flight, alt, gs, type)
- Toggle "Both" → tàu + máy bay cùng lúc
- Toggle "Heatmap" → mật độ tàu

---

## Lessons Learned

- ADSBExchange cần API key (rapidAPI) — để trống = disabled
- Aircraft icon cần rotation theo track (không phải heading như tàu)
- Toggle layer mode quan trọng — không phải lúc nào cũng muốn xem cả 2
- `aircraft_positions` cũng là hypertable (data grow nhanh)

---

## Metrics

- **API endpoints:** 1 (aircraft positions)
- **Map modes:** 4 (vessels, aircraft, both, heatmap)
- **= Phase 2 DONE** 🎉
