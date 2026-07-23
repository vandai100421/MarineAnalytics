# IMPORT & REDIS SYNC — Kế hoạch thực hiện

> **Mục tiêu**: Import dữ liệu từ Crawler (Server A, có internet) vào MarineAnalytics (Server B, không internet) và sync lên Redis để hiển thị trên bản đồ realtime.
>
> **Ngày tạo**: 2026-07-23
> **Trạng thái**: Chờ thực hiện

---

## 1. Bối cảnh

```
Server A (có internet)              Server B (không internet)
┌──────────────────────┐            ┌──────────────────────────────┐
│  Marine Crawler      │            │  MarineAnalytics             │
│  (port 8001)         │            │  (port 8000)                 │
│                      │            │                              │
│  AIS Collector       │   export   │  Import API (PostgreSQL)     │
│  (persistent WS)     │  ────────► │  Redis Sync (pos:{mmsi})     │
│       │              │  JSON file │  Realtime Map (đọc Redis)    │
│  crawler.db (SQLite) │            │  Track History (đọc PG)      │
│  Export API          │            │                              │
└──────────────────────┘            └──────────────────────────────┘
```

**Vấn đề hiện tại**: Import API (`/import/full`) chỉ ghi PostgreSQL. Bản đồ realtime đọc từ Redis (`pos:{mmsi}`). Import xong → không thấy tàu trên bản đồ.

---

## 2. Ý tưởng Export & Import

### Nguyên lý

**Export** = đóng gói dữ liệu crawler thu được thành file JSON trên Server A (có internet), chuyển sang Server B (không internet), rồi **Import** vào PostgreSQL + Redis của MarineAnalytics.

**Không phải export toàn bộ** — có **4 loại export** khác nhau, mỗi loại phục vụ mục đích riêng:

| Loại | Export gì | Số record | Size ước tính | Mục đích |
|------|-----------|-----------|---------------|----------|
| **Snapshot** | Chỉ vị trí **mới nhất** mỗi tàu (1 record/tàu) | ~28.000 | ~13 MB | Sync Redis → bản đồ realtime |
| **Vessel master** | Chỉ thông tin tĩnh (tên, cờ, loại tàu, IMO) | ~33.000 | ~9 MB | PostgreSQL `vessels` table |
| **Vessels** | **Toàn bộ** positions theo thời gian | ~100.000 | ~51 MB | PostgreSQL → track playback |
| **Full** | **Tất cả** (snapshot + history + master + aircraft + weather + ports) | tất cả | ~90 MB | 1 file chứa mọi thứ |

### Khi nào dùng loại nào?

```
MUỐN GÌ?                        → DÙNG EXPORT NÀO?
─────────────────────────────────────────────────────
Bản đồ realtime (Redis)         → Snapshot (mỗi 30 phút)
Cập nhật thông tin tàu (PG)     → Vessel master (1 lần/ngày)
Xem track lịch sử (PG)          → Vessels hoặc Full (1-2 lần/ngày)
Transfer 1 lần tất cả           → Full (khi setup ban đầu)
```

### Ví dụ: Snapshot vs Vessels

```
Snapshot (chụp nhanh — mỗi tàu 1 record mới nhất):
  Tàu A: 1.000 positions trong DB  →  export 1 record (mới nhất)
  Tàu B: 50 positions trong DB     →  export 1 record (mới nhất)
  → Snapshot có 28.000 records = 28.000 tàu

Vessels (toàn bộ positions):
  Tàu A: 1.000 positions  →  export 1.000 records
  Tàu B: 50 positions     →  export 50 records
  → Vessels có 100.000 records = tất cả positions
```

### Thời gian & tần suất

| Export | Tần suất đề nghị | Thời gian export | Thời gian import | Lý do |
|--------|------------------|------------------|------------------|-------|
| Snapshot | **Mỗi 30 phút** | ~30 giây | ~10 giây | Redis TTL 1h, cần refresh để tàu không biến khỏi bản đồ |
| Full | **1-2 lần/ngày** | ~2 phút | ~30 giây | History lớn (50MB+), không cần import liên tục |
| Vessel master | **1 lần/ngày** | ~10 giây | ~5 giây | Thông tin tĩnh ít thay đổi |

### Dữ liệu thực tế (đo được sau 15 phút crawler chạy)

```
=== CRAWLER DATA (15 phút chạy) ===
Total positions:    103,807
Unique vessels:     34,817
Time range:         2026-07-23 12:35 → 16:16

=== EXPORT FILE SIZES ===
snapshot.json:      28,116 records  →  13 MB  (cho Redis)
vessel-master.json: 32,809 records  →  9 MB   (cho PostgreSQL)

=== PHÂN BỔ THEO KHU VỰC ===
  Europe          78,128  ████████████████████████████████████████
  Americas        19,122  ████████████
  East Asia        3,220  ██
  Other/Global     2,740  ██
  SE Asia            597  █
```

**Lưu ý**: Dữ liệu tăng theo thời gian. Sau 1 ngày chạy, có thể có **hàng triệu positions** và **50.000+ unique vessels**. Snapshot vẫn giữ ~28-50k records (1 record/tàu), nhưng Vessels/Full sẽ lớn hơn nhiều.

---

## 3. Crawler đã chuẩn bị sẵn (Server A)

Crawler đã có các export endpoints tại `http://crawler:8001/api/v1/exports/`:

| Endpoint | Dữ liệu | Mục đích |
|----------|---------|----------|
| `GET /snapshot.json` | Latest position/vessel (trong 1h) | **Redis sync** — mỗi record = 1 `pos:{mmsi}` hash |
| `GET /vessel-master.json` | Vessel master data (name, type, flag...) | PostgreSQL `vessels` table |
| `GET /vessels.json` | Historical positions + master data | PostgreSQL `position_reports` table |
| `GET /full.json` | Tất cả (snapshot + history + master + aircraft + weather + ports) | **Đề nghị dùng file này** |
| `GET /aircraft.json` | Aircraft positions | PostgreSQL `aircraft_positions` |
| `GET /weather.json` | Weather data | PostgreSQL `weather_data` |
| `GET /ports.json` | Port data | PostgreSQL `ports` |

### Format `snapshot.json` (KEY — cho Redis sync):
```json
{
  "version": "2.0",
  "exported_at": "2026-07-23T...",
  "data_type": "snapshot",
  "hours_window": 1,
  "count": 7842,
  "redis_key_format": "pos:{mmsi}",
  "redis_ttl_seconds": 3600,
  "records": [
    {
      "mmsi": 235054097,
      "ts": "2026-07-23T13:06:22",
      "lat": 51.95, "lon": 1.43,
      "sog": 12.5, "cog": 180.0, "heading": 180.0,
      "name": "THAMES VOYAGER", "ship_type": 70,
      "flag": "GB", "callsign": "MJWI2", ...
    }
  ]
}
```

### Format `full.json` (v3.0 — dùng cho transfer):
```json
{
  "version": "3.0",
  "snapshot": { "records": [...] },         // ← cho Redis
  "vessel_positions": { "records": [...] }, // ← cho PostgreSQL position_reports
  "vessel_master": { "records": [...] },    // ← cho PostgreSQL vessels
  "aircraft_positions": { "records": [...] },
  "weather_data": { "records": [...] },
  "ports": { "records": [...] }
}
```

### Script export (chạy trên Server A):
```bash
# Export toàn bộ ra files
cd crawler/backend && source .venv/bin/activate
python -m app.scripts.sync_export

# Hoặc chỉ snapshot (nhanh, cho Redis sync)
python -m app.scripts.sync_export --snapshot-only

# Hoặc dùng transfer script
bash scripts/transfer.sh --offline          # Export ra files
bash scripts/transfer.sh                     # Auto: export + import + Redis sync
bash scripts/transfer.sh --import-only /path # Import từ files có sẵn
```

---

## 4. CÔNG VIỆC CẦN LÀM TRÊN MARINEANALYTICS (Server B)

### Task 1: Thêm Redis sync vào Import API

**File**: `backend/app/api/import_api.py`

**Vấn đề**: Hàm `import_full()` chỉ ghi PostgreSQL, không ghi Redis.

**Giải pháp**: Sau khi import vào PostgreSQL, đọc section `snapshot` từ file và ghi vào Redis.

**Tham chiếu Redis format** (từ `backend/app/ingestion/writer.py:89-104`):
```python
# Redis key: pos:{mmsi}
# Hash fields (tất cả là string):
#   mmsi, lat, lon, sog, cog, heading, ts
# TTL: 3600 giây (1 giờ)
```

**Code cần thêm** vào `import_full()` — sau khi commit PostgreSQL:

```python
from app.core.redis import get_redis

# ... sau khi commit PostgreSQL ...

# Sync snapshot to Redis
redis = await get_redis()
snapshot_data = data.get("snapshot", {})
snapshot_records = snapshot_data.get("records", [])

redis_synced = 0
for rec in snapshot_records:
    mmsi = rec.get("mmsi")
    if not mmsi:
        continue
    await redis.hset(f"pos:{mmsi}", mapping={
        "mmsi": str(mmsi),
        "lat": str(rec.get("lat", "")),
        "lon": str(rec.get("lon", "")),
        "sog": str(rec.get("sog", 0)),
        "cog": str(rec.get("cog", 0)),
        "heading": str(rec.get("heading", 0)),
        "ts": str(rec.get("ts", "")),
    })
    await redis.expire(f"pos:{mmsi}", 3600)
    redis_synced += 1

summary.redis_synced = redis_synced
```

**Cũng cần thêm** field `redis_synced: int = 0` vào class `ImportSummary`.

---

### Task 2: Thêm endpoint Redis sync riêng

**File mới**: `backend/app/api/redis_sync.py`

Tạo endpoint `POST /api/v1/sync/redis` — nhận file `snapshot.json` và chỉ sync Redis (không ghi PostgreSQL):

```python
from fastapi import APIRouter, Depends, File, UploadFile
from app.core.redis import get_redis
import json

router = APIRouter(prefix="/sync", tags=["sync"])

@router.post("/redis")
async def sync_redis(file: UploadFile = File(...)):
    """Push snapshot data to Redis for realtime map display."""
    content = await file.read()
    data = json.loads(content)
    records = data.get("records", [])

    redis = await get_redis()
    count = 0
    for rec in records:
        mmsi = rec.get("mmsi")
        if not mmsi:
            continue
        await redis.hset(f"pos:{mmsi}", mapping={
            "mmsi": str(mmsi),
            "lat": str(rec.get("lat", "")),
            "lon": str(rec.get("lon", "")),
            "sog": str(rec.get("sog", 0)),
            "cog": str(rec.get("cog", 0)),
            "heading": str(rec.get("heading", 0)),
            "ts": str(rec.get("ts", "")),
        })
        await redis.expire(f"pos:{mmsi}", 3600)
        count += 1

    return {"synced": count, "redis_key_format": "pos:{mmsi}"}
```

**Đăng ký router** trong `backend/app/api/__init__.py` và `backend/app/main.py`.

---

### Task 3: Thêm aircraft Redis sync

**Vấn đề**: MarineAnalytics cũng hiển thị máy bay trên bản đồ (Redis `air:{hex}`).

**Kiểm tra** `backend/app/api/aircraft.py` — xem format Redis key `air:{hex}` có哪些 field.

**Thêm vào** endpoint sync Redis hoặc import_full: aircraft positions → `air:{hex}` hash.

**Tham chiếu** (từ `backend/app/ingestion/adsb_writer.py`):
```python
# Redis key: air:{hex}
# Hash fields: hex, lat, lon, alt, gs, track, flight, ts, origin_country
# TTL: 3600
```

---

### Task 4: Thêm auto-refresh Redis (cron/scheduler)

**Vấn đề**: Redis TTL = 3600s (1h). Nếu không refresh, tàu biến mất khỏi bản đồ sau 1h.

**Giải pháp 1** (đơn giản): Chạy transfer script định kỳ trên Server A:
```bash
# Crontab trên Server A:
*/30 * * * * bash /path/to/crawler/scripts/transfer.sh marine-host 8000
```

**Giải pháp 2** (trong MarineAnalytics): Thêm scheduled task đọc latest positions từ PostgreSQL → Redis:
```python
# backend/app/scheduler/redis_refresher.py
async def refresh_redis_from_postgres():
    """Read latest position per vessel from PostgreSQL, push to Redis."""
    # SELECT DISTINCT ON (mmsi) * FROM position_reports ORDER BY mmsi, ts DESC
    # → push to Redis pos:{mmsi}
```

**Khuyến nghị**: Giải pháp 1 (chạy transfer trên Server A) — đơn giản, không cần code mới.

---

### Task 5: Cập nhật transfer.sh cho production

**File**: `crawler/scripts/transfer.sh` (đã cập nhật trên Server A)

Workflow offline (USB):
```bash
# Server A: Export
bash scripts/transfer.sh --offline
# → exports/snapshot.json, full.json, ...

# Copy to USB
cp -r exports/ /mnt/usb/

# Server B: Import
bash scripts/transfer.sh --import-only /mnt/usb/exports
# → Import PostgreSQL + Redis sync
```

Workflow online (cùng network):
```bash
bash scripts/transfer.sh marine-host 8000
# → Export + Import + Redis sync (tự động)
```

---

## 5. Thứ tự thực hiện (đề nghị)

| Bước | Task | File | Ưu tiên |
|------|------|------|---------|
| 1 | Thêm `redis_synced` vào `ImportSummary` | `import_api.py` | High |
| 2 | Thêm Redis sync vào `import_full()` | `import_api.py` | High |
| 3 | Tạo `redis_sync.py` endpoint | Mới | Medium |
| 4 | Đăng ký router | `api/__init__.py`, `main.py` | Medium |
| 5 | Thêm aircraft Redis sync | `import_api.py` | Low |
| 6 | Test transfer | `bash transfer.sh` | High |

---

## 6. Test plan

### Test 1: Online transfer (cùng máy)
```bash
# Trên Server A (có internet):
bash /home/ai6/Desktop/Project/crawler/scripts/transfer.sh localhost 8000

# Verify:
curl http://localhost:8000/api/v1/vessels/positions | python -m json.tool | head -20
# → Phải thấy vessels trên bản đồ
```

### Test 2: Offline transfer
```bash
# Server A:
bash scripts/transfer.sh --offline
ls -la exports/  # → snapshot.json, full.json, ...

# Server B (sau khi copy):
bash scripts/transfer.sh --import-only /path/to/exports
```

### Test 3: Redis sync riêng
```bash
# Export snapshot từ crawler
curl http://localhost:8001/api/v1/exports/snapshot.json -o /tmp/snapshot.json

# Sync Redis
curl -X POST http://localhost:8000/api/v1/sync/redis -F "file=@/tmp/snapshot.json"

# Verify
redis-cli DBSIZE  # → số keys tăng
redis-cli HGETALL pos:538006987  # → thấy dữ liệu
```

### Test 4: Kiểm tra bản đồ
```
Mở http://localhost:5173 → bản đồ phải hiển thị tàu
Mở http://localhost:5173 → click tàu → xem track history (từ PostgreSQL)
```

---

## 7. Lưu ý quan trọng

1. **AIS ingestion đã tắt** trong MarineAnalytics (`.env`: `AISSTREAM_API_KEY=`) để tránh xung đột API key với crawler. MarineAnalytics giờ **phụ thuộc hoàn toàn** vào import từ crawler.

2. **Redis TTL = 3600s** — nếu không refresh trong 1h, tàu biến khỏi bản đồ. Cần chạy transfer định kỳ (mỗi 30 phút).

3. **Snapshot only contains vessels seen in last N hours** (default 1h). Tàu không phát tín hiệu trong 1h sẽ không có trong snapshot → không hiển thị trên bản đồ (đúng behavior).

4. **Duplicate detection**: Import API đã có check duplicate (mmsi + ts) → chạy transfer nhiều lần không trùng data.

5. **File size**: `full.json` có thể lớn (vài MB đến vài chục MB tùy data). Snapshot.json nhỏ hơn nhiều (chỉ latest position per vessel).

---

## 8. Cấu trúc file đã thay đổi trên Crawler (Server A)

```
crawler/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── exports.py          ← Đã cập nhật (thêm snapshot, vessel-master, cải thiện full.json)
│   │   ├── crawlers/ais/
│   │   │   └── stream_collector.py ← Mới (persistent AIS collector)
│   │   ├── scripts/
│   │   │   ├── __init__.py         ← Mới
│   │   │   └── sync_export.py      ← Mới (auto-export script)
│   │   └── core/config.py          ← Đã cập nhật (thêm settings)
│   └── .env                        ← Đã cập nhật
├── scripts/
│   └── transfer.sh                 ← Đã cập nhật (offline mode, snapshot Redis)
└── exports/                        ← Output directory
    └── manifest.json               ← Tự tạo khi chạy sync_export.py
```
