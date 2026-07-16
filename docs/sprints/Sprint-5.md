# Sprint 5 — Geofence Alerts

**Thời gian:** Tuần 6  
**Phase:** Phase 2 — Analytics + ADS-B  
**Owner chính:** BE2 + FE2  
**Commit:** `1e9bf4a`

---

## Mục tiêu

Geofence alerts: vẽ polygon trên map, khi tàu enter/exit → tạo alert, hiển thị alert panel.

---

## Task hoàn thành

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T5.1 | `api/geofences.py`: CRUD geofences (POST/GET/DELETE) | BE2 | ✅ |
| T5.2 | `alerts/geofence_engine.py`: ST_Contains check khi nhận position mới → insert alert | BE2 | ✅ |
| T5.3 | `api/alerts.py`: `GET /alerts?from=...&geofence_id=...` | BE2 | ✅ |
| T5.4 | `components/geofence/GeofenceEditor.tsx`: vẽ polygon trên map | FE2 | ✅ |
| T5.5 | Alert panel: danh sách alert gần đây + highlight tàu vi phạm | FE2 | ✅ |
| T5.6 | Unit test geofence engine (ST_Contains edge cases) | BE2 | ✅ |

---

## Kiến trúc Geofence Engine

```
AIS Position (ingestion)
    ↓
check_position_against_geofences(msg)
    ↓
SELECT FROM geofences WHERE ST_Contains(geom::geometry, point)
    ↓ (nếu tàu trong geofence)
Check dedup (30 phút gần nhất có alert không?)
    ↓ (nếu chưa)
INSERT INTO alerts (mmsi, geofence_id, event_type='enter', lat, lon)
    ↓
AlertPanel (frontend) refetch 30s
```

### Tối ưu (post-Sprint 5)
- **Skip check nếu không có geofence** — tránh query 15,000+ lần không cần thiết
- **Cache geofence count** — chỉ query 1 lần, invalidate khi tạo/xóa geofence
- **Dedup window 30 phút** — tránh spam alert cho cùng 1 tàu + geofence

---

## API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/v1/geofences` | POST | Tạo geofence (name, type, coordinates) |
| `/api/v1/geofences` | GET | List tất cả geofences |
| `/api/v1/geofences/{id}` | DELETE | Xóa geofence |
| `/api/v1/alerts` | GET | List alerts (filter by time, geofence_id) |

### Geofence format
```json
{
  "name": "Restricted Zone",
  "type": "restricted",
  "coordinates": [[lon, lat], [lon, lat], ...]
}
```

---

## Frontend

### GeofenceEditor
- Button "Draw Polygon" → click trên map để thêm points
- Input name + select type (restricted/warning/custom)
- Save → POST API
- Point counter badge

### AlertPanel
- List alert gần đây (refetch 30s)
- Card đỏ (enter) / xanh (exit) với icon
- Hiển thị MMSI, geofence ID, timestamp

---

## Demo

```
Vẽ polygon → tàu chạy vào → alert xuất hiện trong panel
```

- Tab Geofence → Draw Polygon → click 3+ points trên map
- Save → geofence lưu trong DB
- Khi tàu enter geofence → alert "Entered" xuất hiện
- AlertPanel tự refresh 30s

---

## Lessons Learned

- `ST_Contains(geography, geometry)` không hoạt động — cần cast `geom::geometry`
- Geofence check cho 15,000+ tàu → phải skip khi không có geofence
- Dedup window quan trọng — tránh spam alert
- PostGIS `GEOGRAPHY(POLYGON, 4326)` + `ST_SetSRID(ST_MakePoint, 4326)` đúng type

---

## Metrics

- **Geofence types:** restricted, warning, custom
- **Dedup window:** 30 phút
- **Alert refetch:** 30s
- **Unit tests:** 3 (create alert, dedup, no matching)
