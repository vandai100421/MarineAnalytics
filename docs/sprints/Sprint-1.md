# Sprint 1 — Ingestion đầy đủ

**Thời gian:** Tuần 2  
**Phase:** Phase 1 — MVP AIS  
**Owner chính:** BE1 (module khó nhất)  
**Commit:** `674ad5b`

---

## Mục tiêu

Xây dựng pipeline ingestion AIS hoàn chỉnh: decode tất cả message types, upsert DB + Redis, reconnect backoff, structured logging + metrics.

---

## Task hoàn thành

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T1.1 | `ingestion/decoder.py`: decode tất cả AIS message types qua `pyais` + normalize fields | BE1 | ✅ |
| T1.2 | Unit test `decoder.py`: type 1/2/3/5/18/19/24, edge case malformed payload | BE1 | ✅ |
| T1.3 | `ingestion/writer.py`: upsert `vessels` (static type 5/24) + insert `position_reports` (dynamic) | BE1 | ✅ |
| T1.4 | `ingestion/writer.py`: upsert Redis `pos:{mmsi}` hash (lat/lon/sog/cog/heading/ts), TTL 1h | BE1 | ✅ |
| T1.5 | Reconnect exponential backoff trong `aisstream_client.py` (1s→2s→4s...max 60s) | BE1 | ✅ |
| T1.6 | BBox filter khi subscribe AISStream | BE1 | ✅ |
| T1.7 | Structured logging + error metrics (decode error count, msg/sec) | BE1 | ✅ |
| T1.8 | `models/` ORM: Vessel, PositionReport, Geofence, Alert (match schema ARCHITECTURE.md) | BE2 | ✅ |
| T1.9 | `schemas/` pydantic: VesselResponse, PositionResponse, PaginatedResponse | BE2 | ✅ |
| T1.10 | Grafana + Prometheus: dashboard msg/sec, DB size, Redis ops | DO | ⏭️ Defer Phase 3 |

---

## Chi tiết kỹ thuật

### Decoder (T1.1)

Decode AIS messages từ AISStream format:
- **Dynamic types** (PositionReport, StandardClassBPositionReport, ExtendedClassBPositionReport, LongRangeAisBroadcast) → extract lat/lon/sog/cog/heading/nav_status
- **Static types** (ShipStaticData, StaticDataReport) → extract name/ship_type/callsign/dimensions/destination/eta
- Unwrap nested payload `Message[message_type]` (AISStream wrap format)

```python
DYNAMIC_MESSAGE_TYPES = {
    "PositionReport", "PositionReportInt",
    "StandardClassBPositionReport",
    "ExtendedClassBPositionReport",
    "LongRangeAisBroadcast",
}
STATIC_MESSAGE_TYPES = {"ShipStaticData", "StaticDataReport"}
```

### Writer (T1.3 + T1.4)

- **Position reports**: INSERT vào `position_reports` hypertable
- **Vessels**: UPSERT vào `vessels` table (ON CONFLICT DO UPDATE)
- **Redis**: HSET `pos:{mmsi}` với TTL 1h, O(1) lookup cho realtime

### Reconnect Backoff (T1.5)

```
1s → 2s → 4s → 8s → 16s → 32s → 60s (max)
```

Reset về 1s khi kết nối thành công.

### Metrics (T1.7)

- `messages_received`, `decode_errors`, `positions_written`, `vessels_upserted`
- `messages_by_type` (dict theo message type)
- Periodic log mỗi 60s

---

## Demo

```
Ingestion chạy ổn định, DB có data thật, Redis có latest position.
```

- Backend log: `aisstream_subscribed` → `position_written` → `vessel_upserted`
- Redis: `redis-cli DBSIZE` → hàng trăm keys `pos:*`
- PostgreSQL: `SELECT count(*) FROM position_reports` → hàng nghìn rows

---

## Lessons Learned

- AISStream payload wrap theo `Message[MessageType]` — cần unwrap
- `ExtendedClassBPositionReport` phải thêm vào dynamic types (mặc định thiếu)
- `pyais` decode ổn định nhưng cần handle malformed payload (return None)
- Redis TTL 1h quan trọng để cleanup tàu không còn phát tín hiệu

---

## Metrics

- **Commits:** 1
- **Unit tests:** 21 pass (decoder + writer)
- **AIS message types hỗ trợ:** 7 (type 1/2/3/5/18/19/24)
- **Reconnect backoff:** 1s→60s max
