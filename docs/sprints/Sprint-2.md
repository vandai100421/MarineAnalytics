# Sprint 2 — REST API + Bản đồ cơ bản

**Thời gian:** Tuần 3  
**Phase:** Phase 1 — MVP AIS  
**Owner chính:** BE2 (API) + FE1 (map)  
**Commit:** `8c08f7a`

---

## Mục tiêu

Xây dựng REST API đầy đủ + bản đồ tương tác: tàu hiển thị, cluster, click xem info, lọc theo ship_type/sog. "MarineTraffic cơ bản".

---

## Task hoàn thành

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T2.1 | `api/vessels.py`: `GET /vessels/positions?bbox=...&types=...` (đọc Redis) | BE2 | ✅ |
| T2.2 | `api/vessels.py`: `GET /vessels/{mmsi}` (đọc `vessels` table) | BE2 | ✅ |
| T2.3 | `api/vessels.py`: `GET /vessels/{mmsi}/track?from=...&to=...` (query hypertable) | BE2 | ✅ |
| T2.4 | Integration test cho 3 endpoint trên (testcontainers) | BE2 | ✅ |
| T2.5 | Error handler RFC 7807 + pagination wrapper | BE2 | ✅ |
| T2.6 | `api/client.ts` + `api/vessels.ts`: react-query hooks | FE1 | ✅ |
| T2.7 | `types/index.ts`: TS types match backend schemas | FE1 | ✅ |
| T2.8 | `components/map/VesselLayer.tsx`: deck.gl ScatterplotLayer + icon theo heading | FE1 | ✅ |
| T2.9 | `components/map/ClusterLayer.tsx`: clustering khi zoom out (supercluster) | FE1 | ✅ |
| T2.10 | `hooks/useViewport.ts`: map bbox state + trigger refetch khi move/zoom | FE1 | ✅ |
| T2.11 | `store/mapStore.ts`: zustand (viewport, filters, selected MMSI) | FE1 | ✅ |
| T2.12 | `components/panel/VesselInfo.tsx`: click tàu → hiện thông tin | FE2 | ✅ |
| T2.13 | `components/panel/Filters.tsx`: lọc theo ship_type, sog range | FE2 | ✅ |
| T2.14 | Layout `App.tsx`: map full screen + sidebar panel + filter bar | FE2 | ✅ |

---

## API Endpoints

| Endpoint | Method | Mô tả | Data source |
|----------|--------|-------|-------------|
| `/api/v1/vessels/positions` | GET | Vị trí realtime tất cả tàu | Redis |
| `/api/v1/vessels/{mmsi}` | GET | Thông tin tĩnh tàu | PostgreSQL |
| `/api/v1/vessels/{mmsi}/track` | GET | Lịch sử vị trí (time range) | PostgreSQL hypertable |

### Query params
- `bbox=min_lon,min_lat,max_lon,max_lat` — filter theo viewport
- `ship_type=30` — filter theo AIS ship type code
- `min_sog=5.0` — filter theo tốc độ tối thiểu
- `from=2026-07-16T00:00:00Z&to=...` — time range cho track
- `limit=5000` — pagination

### Error format (RFC 7807)
```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Vessel 123 not found"
}
```

---

## Frontend

### Map (FE1)
- **MapLibre + deck.gl**: DeckGL as parent (controller), MapGL as child (basemap)
- **VesselLayer**: ScatterplotLayer với icon tàu xoay theo heading
- **ClusterLayer**: Supercluster khi zoom < 8, hiển thị số lượng tàu trong cluster
- **useViewport hook**: track bbox, trigger refetch khi move/zoom

### Panel (FE2)
- **VesselInfo**: click tàu → hiện name, MMSI, type, callsign, destination, dimensions
- **Filters**: toggle ship_type (pill buttons), slider min speed
- **Layout**: map full screen + sidebar 320px + filter bar

---

## Demo

```
"MarineTraffic cơ bản" — tàu hiển thị, cluster, click xem info, lọc.
```

- Mở `http://localhost:5173` → bản đồ với tàu thật
- Zoom ra → cluster gom tàu, hiện số lượng
- Click tàu → sidebar hiện thông tin
- Filter theo ship_type → chỉ hiện tàu loại đó

---

## Lessons Learned

- DeckGL phải là parent, MapGL là child để zoom/pan hoạt động
- `react-map-gl/maplibre` subpath import (không phải `react-map-gl`)
- `maplibre-gl.css` phải import trong `main.tsx`
- React-query tốt hơn useEffect+fetch cho data fetching (cache, refetch, loading state)
- Zustand đơn giản hơn Redux cho global state (viewport, filters, selected)

---

## Metrics

- **API endpoints:** 3 (+ health)
- **Integration tests:** 8 pass
- **Frontend components:** 7 (MapView, VesselLayer, ClusterLayer, VesselInfo, Filters, App)
- **React-query hooks:** 3 (useVesselPositions, useVessel, useVesselTrack)
