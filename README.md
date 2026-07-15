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
