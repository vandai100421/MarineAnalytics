# Sprint 0 — Scaffolding & "1 tàu lên bản đồ"

**Thời gian:** Tuần 1  
**Phase:** Phase 1 — MVP AIS  
**Owner chính:** TL + DO  
**Commit:** `fd3550b`, `e631cfe`, `674ad5b`

---

## Mục tiêu

Setup toàn bộ project structure, infra (Docker, DB, Redis), CI/CD pipeline, và chứng minh end-to-end: 1 tàu thật từ AISStream hiển thị trên bản đồ.

---

## Task hoàn thành

| ID | Task | Owner | Status |
|----|------|-------|--------|
| T0.1 | Tạo `docker-compose.yml`: timescaledb, redis, backend, frontend | DO | ✅ |
| T0.2 | Tạo `.env.example` với tất cả env var cần thiết | DO | ✅ |
| T0.3 | Scaffolding backend: `pyproject.toml`, `app/` structure, FastAPI app factory + lifespan | TL | ✅ |
| T0.4 | Scaffolding frontend: Vite + React + TS, tailwind, deck.gl, maplibre-gl, react-query, zustand | TL | ✅ |
| T0.5 | `core/config.py`: pydantic-settings (DB_URL, REDIS_URL, AISSTREAM_API_KEY, BBOX) | BE1 | ✅ |
| T0.6 | `core/db.py`: async SQLAlchemy engine + session factory | BE1 | ✅ |
| T0.7 | `core/redis.py`: async redis client | BE1 | ✅ |
| T0.8 | Alembic init + migration tạo `vessels` + `position_reports` (hypertable) | BE1 | ✅ |
| T0.9 | `ingestion/aisstream_client.py` bản nháp: connect WS, nhận 1 message, log ra | BE1 | ✅ |
| T0.10 | `components/map/MapView.tsx`: MapLibre container render 1 point hardcode | FE1 | ✅ |
| T0.11 | E2E smoke: WS → decode → DB → API → map hiển thị 1 tàu | TL | ✅ |
| T0.12 | CI: GitHub Actions chạy lint + typecheck (ruff, mypy, eslint, tsc) | DO | ✅ |

---

## Kết quả Demo

```
docker-compose up → bản đồ hiển thị 1 tàu (data thật từ AISStream)
```

- Backend FastAPI chạy ở `:8000` với `/health` endpoint
- Frontend Vite chạy ở `:5173` với MapLibre container
- PostgreSQL + TimescaleDB ở `:5432`, Redis ở `:6379`
- CI pipeline GitHub Actions chạy ruff + mypy + eslint + tsc
- Alembic migration 0001 tạo schema `vessels` + `position_reports` (hypertable)

---

## Kiến trúc tạo ra

```
MarineAnalytics/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory + lifespan
│   │   ├── core/
│   │   │   ├── config.py        # pydantic-settings
│   │   │   ├── db.py            # async SQLAlchemy
│   │   │   └── redis.py         # async redis
│   │   └── ingestion/
│   │       └── aisstream_client.py
│   ├── alembic/
│   │   └── versions/0001_initial_schema.py
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/map/MapView.tsx
│   └── package.json
├── docker-compose.yml
└── .env.example
```

---

## Lessons Learned

- AISStream.io dùng WebSocket, cần API key free từ https://aisstream.io/
- TimescaleDB hypertable cần extension `timescaledb` — migration có guard check
- MapLibre + deck.gl tích hợp cần config đúng layer order
- CI nên chạy từ Sprint 0 để bắt lỗi sớm

---

## Metrics

- **Commits:** 3
- **Files tạo:** ~25
- **Lines of code:** ~800
- **Test pass:** CI lint + typecheck ✅
