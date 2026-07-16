# Sprint 4 — Track Playback + Heatmap

**Thời gian:** Tuần 5  
**Phase:** Phase 2 — Analytics + ADS-B  
**Owner chính:** FE2 + BE2  
**Commit:** `d2d7158`

---

## Mục tiêu

Track playback (animate lịch sử vị trí tàu) + heatmap mật độ tàu.

---

## Task hoàn thành

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T4.1 | `components/playback/TimelineScrubber.tsx`: slider thời gian, play/pause/speed | FE2 | ✅ |
| T4.2 | Playback vessel: query track API → animate path trên deck.gl (PathLayer) | FE2 | ✅ |
| T4.3 | Optimize track query: chỉ SELECT cột cần, limit points (downsample nếu > 5000) | BE2 | ✅ |
| T4.4 | `components/map/HeatmapLayer.tsx`: deck.gl HexagonLayer mật độ tàu | FE1 | ✅ |
| T4.5 | `api/stats.py`: `GET /stats/heatmap?bbox=...&from=...&to=...` (aggregate grid) | BE2 | ✅ |
| T4.6 | Toggle heatmap/scatter mode trên map | FE2 | ✅ |

---

## Track Playback

### Cách hoạt động
1. User click tàu → query `GET /vessels/{mmsi}/track?from=...&to=...`
2. Backend query `position_reports` hypertable (time-range indexed)
3. Frontend nhận danh sách points → PathLayer vẽ đường đi
4. TimelineScrubber: play/pause/speed (1x/2x/4x/8x), slider tua thời gian

### Tối ưu query (T4.3)
- Chỉ SELECT cột cần: `lat, lon, sog, cog, heading, ts`
- Limit 5000 points (downsample nếu nhiều hơn)
- Index `idx_pos_mmsi_ts (mmsi, ts DESC)` cho query nhanh

---

## Heatmap

### Cách hoạt hoạt động
- **HexagonLayer** (deck.gl): aggregate positions thành hexagon grid
- Color gradient: xanh nhạt (ít tàu) → đỏ đậm (nhiều tàu)
- Toggle giữa scatter/heatmap mode

### API
```
GET /api/v1/stats/heatmap?bbox=104,0,122,25&from=2026-07-16T00:00:00Z
→ { points: [[lon, lat], ...], total: 1234 }
```

---

## Demo

```
Track playback: click tàu → play → xem đường đi
Heatmap: toggle → thấy mật độ tàu tập trung ở đâu
```

- Click tàu → TimelineScrubber hiện ở bottom
- Play → PathLayer animate đường đi theo thời gian
- Toggle heatmap → HexagonLayer hiển thị mật độ
- Zoom vào khu vực cảng → thấy dày đặc

---

## Lessons Learned

- PathLayer cần ít nhất 2 points để vẽ
- Downsample track khi > 5000 points (browser lag)
- HexagonLayer tốt hơn HeatmapLayer cho dữ liệu điểm (auto-aggregate)
- Playback speed 1x/2x/4x/8x — user muốn tua nhanh

---

## Metrics

- **Track limit:** 5000 points (downsample nếu vượt)
- **Playback speeds:** 1x, 2x, 4x, 8x
- **Heatmap grid:** HexagonLayer auto-aggregate
