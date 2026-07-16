# MarineAnalytics — Hướng dẫn Setup & Chạy

Tất cả những gì cần để chạy project MarineAnalytics trên máy local.

---

## 1. Yêu cầu hệ thống

| Công nghệ | Phiên bản | Cách kiểm tra |
|-----------|-----------|---------------|
| Python | 3.11+ | `python --version` |
| Node.js | 20+ | `node --version` |
| PostgreSQL | 16+ | `psql --version` |
| PostGIS | 3.4+ | `psql -c "SELECT postgis_version();"` |
| Redis | 7+ | `redis-server --version` |

> Nếu dùng Docker: chỉ cần Docker + Docker Compose, bỏ qua cài PostgreSQL/Redis trực tiếp.

---

## 2. Cài đặt dependencies

### 2.1 Clone repo

```bash
git clone <repo-url> && cd MarineAnalytics
```

### 2.2 Tạo file `.env`

```bash
cp .env.example .env
```

Sửa `.env`:
- `AISSTREAM_API_KEY`: đăng ký free tại https://aisstream.io/ — để trống nếu chỉ test (ingestion sẽ disabled)
- `AISSTREAM_BBOX`: bbox filter, ví dụ Biển Đông `104,0,122,25` — để trống = toàn cầu
- `DATABASE_URL`: connection string PostgreSQL (xem bên dưới)
- `REDIS_URL`: connection string Redis

### 2.3 Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

### 2.4 Frontend

```bash
cd frontend
npm install
```

---

## 3. Khởi động database & Redis

### Tùy chọn A: Chạy trực tiếp (không Docker)

**PostgreSQL:**

```bash
# Nếu đã có PostgreSQL service chạy:
sudo service postgresql start

# Tạo database + user:
sudo -u postgres psql -c "CREATE USER marine WITH PASSWORD 'marine';"
sudo -u postgres psql -c "CREATE DATABASE marineanalytics OWNER marine;"
sudo -u postgres psql -d marineanalytics -c "CREATE EXTENSION IF NOT EXISTS postgis;"
# Nếu có TimescaleDB:
sudo -u postgres psql -d marineanalytics -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# .env: DATABASE_URL=postgresql+asyncpg://marine:marine@localhost:5432/marineanalytics
```

**Nếu không có sudo (chạy PostgreSQL instance riêng):**

```bash
export PATH=$PATH:/usr/lib/postgresql/16/bin
mkdir -p ~/pgdata
initdb -D ~/pgdata -U marine --auth=trust
echo "port = 5433" >> ~/pgdata/postgresql.conf
echo "unix_socket_directories = '$HOME/pgdata'" >> ~/pgdata/postgresql.conf
pg_ctl -D ~/pgdata -l ~/pgdata/logfile start

# Tạo database:
psql -h localhost -p 5433 -U marine -d postgres -c "CREATE DATABASE marineanalytics;"
psql -h localhost -p 5433 -U marine -d marineanalytics -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# .env: DATABASE_URL=postgresql+asyncpg://marine@localhost:5433/marineanalytics
```

**Redis:**

```bash
# Cài qua conda (không cần sudo):
conda install -c conda-forge redis-server

# Khởi động:
redis-server --daemonize yes --port 6379
redis-cli ping  # → PONG

# .env: REDIS_URL=redis://localhost:6379/0
```

### Tùy chọn B: Dùng Docker

```bash
# Yêu cầu: user có quyền docker (sudo usermod -aG docker $USER && newgrp docker)
docker compose up -d timescaledb redis

# .env: DATABASE_URL=postgresql+asyncpg://marine:marine@localhost:5432/marineanalytics
# .env: REDIS_URL=redis://localhost:6379/0
```

---

## 4. Chạy migrations

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

> Migrations tự động skip TimescaleDB (hypertable, continuous aggregate) nếu extension chưa cài.
> Sẽ tạo tables: vessels, position_reports, geofences, alerts, aircraft_positions.

---

## 5. Khởi động application

### Backend (terminal 1)

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Frontend (terminal 2)

```bash
cd frontend
npm run dev
```

- UI: http://localhost:5173

---

## 6. Test & Lint

### Backend

```bash
cd backend
source .venv/bin/activate
ruff check .          # lint
ruff format --check . # format check
mypy app              # type check
pytest -q             # unit tests (21 tests)
```

### Frontend

```bash
cd frontend
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm run build         # production build
npm run test          # vitest (nếu có)
```

### CI (GitHub Actions)

File `.github/workflows/ci.yml` tự chạy trên mỗi push/PR:
- Backend: ruff + mypy + pytest
- Frontend: eslint + tsc + build

---

## 7. Insert sample data (test không cần AISStream API key)

Nếu chưa có AISSTREAM_API_KEY, có thể insert sample data thủ công:

```bash
# Redis — vessel positions:
redis-cli HSET pos:538006987 mmsi 538006987 lat 16.0 lon 108.2 sog 12.5 cog 45 heading 45 ts "2026-07-16T15:30:00+00:00" EX 3600
redis-cli HSET pos:123456789 mmsi 123456789 lat 16.5 lon 108.8 sog 8.3 cog 90 heading 90 ts "2026-07-16T15:30:00+00:00" EX 3600
redis-cli HSET pos:987654321 mmsi 987654321 lat 17.0 lon 109.5 sog 0.0 cog 0 heading 0 ts "2026-07-16T15:30:00+00:00" EX 3600
redis-cli HSET pos:555666777 mmsi 555666777 lat 15.5 lon 107.5 sog 15.2 cog 180 heading 180 ts "2026-07-16T15:30:00+00:00" EX 3600

# PostgreSQL — vessel info:
psql -h localhost -p 5433 -U marine -d marineanalytics -c "
INSERT INTO vessels (mmsi, name, ship_type, ship_type_name, callsign, destination) VALUES
  (538006987, 'MV OCEAN STAR', 70, 'Cargo', 'ABC123', 'SINGAPORE'),
  (123456789, 'FISHING BOAT 01', 30, 'Fishing', 'FB001', 'DA NANG'),
  (987654321, 'TANKER EXPRESS', 80, 'Tanker', 'TE001', 'HONG KONG'),
  (555666777, 'PASSENGER FERRY', 60, 'Passenger', 'PF001', 'HAI PHONG')
ON CONFLICT (mmsi) DO NOTHING;
"

# Tạo geofence:
curl -X POST http://localhost:8000/api/v1/geofences \
  -H "Content-Type: application/json" \
  -d '{"name":"Da Nang Port","type":"warning","coordinates":[[108.0,16.0],[108.5,16.0],[108.5,16.5],[108.0,16.5],[108.0,16.0]]}'
```

---

## 8. API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |
| GET | `/api/v1/vessels/positions?bbox=...&ship_type=...&min_sog=...` | Vessel positions (Redis) |
| GET | `/api/v1/vessels/{mmsi}` | Vessel info (DB) |
| GET | `/api/v1/vessels/{mmsi}/track?from=...&to=...` | Track lịch sử (hypertable) |
| GET | `/api/v1/aircraft/positions?bbox=...` | Aircraft positions (Redis) |
| GET | `/api/v1/stats/overview` | Active vessels, total, avg speed |
| GET | `/api/v1/stats/by-type` | Vessel count by ship type |
| GET | `/api/v1/stats/heatmap?bbox=...&from=...&to=...` | Heatmap points |
| POST | `/api/v1/geofences` | Create geofence |
| GET | `/api/v1/geofences` | List geofences |
| GET | `/api/v1/geofences/{id}` | Get geofence |
| DELETE | `/api/v1/geofences/{id}` | Delete geofence |
| GET | `/api/v1/alerts?from=...&geofence_id=...` | List alerts |
| GET | `/sse/positions?bbox=...&min_sog=...` | SSE realtime stream |

---

## 9. Chạy full stack bằng Docker

```bash
# Yêu cầu: Docker + Docker Compose
docker compose --profile full up -d --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## 10. Troubleshooting

| Lỗi | Fix |
|-----|-----|
| `AISSTREAM_API_KEY Field required` | Đã sửa: API key optional, để trống = ingestion disabled |
| `docker.sock permission denied` | `sudo usermod -aG docker $USER && newgrp docker` |
| `docker-compose: command not found` | `sudo apt install docker-compose-plugin` |
| `extension "timescaledb" is not available` | Migrations tự skip. Cài: `sudo apt install timescaledb-2-postgresql-16` |
| `could not create lock file /var/run/postgresql` | Thêm `unix_socket_directories` vào postgresql.conf |
| `password authentication failed` | Dùng `--auth=trust` khi initdb, hoặc set password trong .env |
| Port 8000 đã dùng | `kill $(lsof -ti:8000)` rồi restart |
| Port 5432 đã dùng | Dùng port khác (5433) + cập nhật DATABASE_URL trong .env |
| Frontend không thấy data | Kiểm tra backend chạy: `curl http://localhost:8000/health` |
| SSE không hoạt động | Kiểm tra backend log: `tail -f /tmp/backend.log` |

---

## 11. Cấu trúc thư mục

```
MarineAnalytics/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── core/                # config, db, redis, logging, errors
│   │   ├── ingestion/           # AIS + ADS-B clients, decoder, writer, metrics
│   │   ├── repositories/        # vessel, position, geofence, alert repos
│   │   ├── api/                 # vessels, aircraft, stats, geofences, alerts routes
│   │   ├── realtime/            # SSE + broadcaster
│   │   ├── alerts/              # geofence engine
│   │   ├── models/              # ORM models
│   │   └── schemas/             # pydantic schemas
│   ├── alembic/                 # migrations (0001-0003)
│   ├── tests/                   # unit + integration tests
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/                 # react-query hooks
│   │   ├── components/          # map, panel, dashboard, playback, geofence
│   │   ├── hooks/               # useSSE, useViewport
│   │   ├── store/               # zustand
│   │   └── types/               # TS types
│   └── package.json
├── docker-compose.yml
├── .env.example
├── .github/workflows/ci.yml
├── reports/                     # báo cáo sprint
└── SETUP.md                     # file này
```
