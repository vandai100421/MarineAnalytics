# MarineAnalytics

Hệ thống thu thập, hiển thị và phân tích dữ liệu vị trí tàu thuyền (AIS) và máy bay (ADS-B) theo thời gian thực, tương tự SeaVision / MarineTraffic.

## Tính năng

- Thu thập AIS realtime từ AISStream.io (WebSocket, toàn cầu)
- Hiển thị tàu trên bản đồ MapLibre + deck.gl với clustering
- Realtime cập nhật vị trí qua SSE
- Track playback, heatmap, geofence alerts, dashboard thống kê
- Lưu trữ lịch sử trên PostgreSQL + TimescaleDB

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Backend | FastAPI, Python 3.11, pyais, SQLAlchemy 2 (async), asyncpg, redis-py, sse-starlette |
| Frontend | React 18, Vite, TypeScript, maplibre-gl, deck.gl, react-query, zustand, tailwindcss |
| Database | PostgreSQL 16 + TimescaleDB |
| Cache | Redis 7 |

## Quick Start

### Yêu cầu

- Docker + Docker Compose
- AISStream.io API key (đăng ký free tại https://aisstream.io/)

### Cài đặt

```bash
# 1. Clone repo
git clone <repo-url> && cd MarineAnalytics

# 2. Copy env và điền API key
cp .env.example .env
# Sửa AISSTREAM_API_KEY trong .env

# 3. Chạy infra (DB + Redis)
docker-compose up -d timescaledb redis

# 4. Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 5. Frontend (terminal khác)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### Chạy full stack bằng Docker

```bash
docker-compose --profile full up -d
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs

## Tài liệu

- [PROJECT.md](PROJECT.md) — Tổng quan dự án
- [ARCHITECTURE.md](ARCHITECTURE.md) — Kiến trúc kỹ thuật
- [CODING_STANDARDS.md](CODING_STANDARDS.md) — Quy ước code
- [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) — Quy trình phát triển
- [TASKS.md](TASKS.md) — Checklist task theo sprint

## Cấu trúc thư mục

```
MarineAnalytics/
├── backend/          # FastAPI backend
├── frontend/         # React + Vite frontend
├── docker-compose.yml
├── .env.example
└── docs/             # PROJECT, ARCHITECTURE, CODING_STANDARDS, ...
```

## Phát triển

Xem [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) cho quy trình sprint, git workflow, và testing.

## Production Deploy

### Yêu cầu

- Docker + Docker Compose
- AISStream.io API key
- (Optional) ADSBExchange API key cho máy bay
- Server: 4GB RAM minimum, 50GB disk

### Deploy bằng Docker Compose

```bash
# 1. Clone repo
git clone <repo-url> && cd MarineAnalytics

# 2. Cấu hình môi trường
cp .env.example .env
# Sửa các giá trị trong .env:
#   AISSTREAM_API_KEY=<key>
#   POSTGRES_PASSWORD=<strong-password>
#   GRAFANA_PASSWORD=<strong-password>
#   AISSTREAM_BBOX=104,0,122,25   # Biển Đông (min_lon,min_lat,max_lon,max_lat)

# 3. Chạy full stack
docker-compose --profile full up -d

# 4. Chạy migrations
docker-compose exec backend alembic upgrade head
```

### Services

| Service | URL | Mô tả |
|---------|-----|-------|
| Frontend | http://localhost:5173 | Bản đồ + dashboard |
| Backend API | http://localhost:8000 | REST + SSE |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Grafana | http://localhost:3000 | Monitoring dashboard (admin / password từ .env) |
| Prometheus | http://localhost:9090 | Metrics scraper |

### Backup & Restore

```bash
# Backup database
docker-compose exec timescaledb pg_dump -U marine marineanalytics | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_YYYYMMDD.sql.gz | docker-compose exec -T timescaledb psql -U marine marineanalytics
```

### Scaling Notes

- **SSE max clients**: chỉnh `SSE_MAX_CLIENTS` trong `.env` (default 200)
- **Rate limit**: chỉnh `RATE_LIMIT_PER_MINUTE` (default 120)
- **Batch ingestion**: chỉnh `INGESTION_BATCH_SIZE` + `INGESTION_FLUSH_INTERVAL_SECONDS`
- **Retention**: data > 90 ngày tự xóa (TimescaleDB policy), compression sau 7 ngày
- **Redis**: TTL 1h cho position cache, auto cleanup tàu không phát tín hiệu
