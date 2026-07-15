# MarineAnalytics — Coding Standards

Quy ước code bắt buộc cho toàn team. Tuân thủ để codebase nhất quán, dễ review, dễ maintain.

---

## 1. Quy tắc chung

- **Không comment thừa**: code tự giải thích qua naming. Chỉ comment khi giải thích *tại sao*, không giải thích *cái gì*.
- **KHÔNG commit**: secrets, API keys, `.env` thật, file build (`dist/`, `__pycache__/`, `node_modules/`).
- **Format trước khi commit**: backend dùng `ruff format`, frontend dùng `prettier`.
- **Lint phải pass**: `ruff check` (backend), `eslint` (frontend) — CI sẽ block PR nếu fail.
- **Type check phải pass**: `mypy` (backend), `tsc --noEmit` (frontend).
- Mỗi PR ≤ 400 dòng diff (trừ scaffold/migration). PR lớn → chia nhỏ.

---

## 2. Backend (Python 3.11 + FastAPI)

### 2.1 Style

- Formatter: **ruff** (format + lint), config trong `pyproject.toml`
- Line length: **100 ký tự**
- Type hints **bắt buộc** cho mọi function signature
- Python version: 3.11+ (dùng `match/case`, `tomllib`, `TaskGroup`)

### 2.2 Naming

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Function / variable | `snake_case` | `decode_ais_message` |
| Class | `PascalCase` | `VesselRepository` |
| Constant | `UPPER_SNAKE` | `MAX_RECONNECT_BACKOFF` |
| Private | `_prefix` | `_parse_metadata` |
| File | `snake_case.py` | `aisstream_client.py` |
| Pydantic schema | `PascalCase` + suffix mô tả | `VesselPositionResponse` |

### 2.3 Cấu trúc code

- **Async everywhere**: dùng `async def` + `await`, không dùng sync DB driver. SQLAlchemy async + asyncpg.
- **Dependency injection**: dùng FastAPI `Depends()`, không khởi tạo service global trực tiếp trong route.
- **Repository pattern**: tách DB access ra `repositories/`, route chỉ gọi service → repository.
- **Pydantic cho I/O**: mọi request/response qua pydantic schema, không trả raw ORM object.

```python
# ĐÚNG
async def get_vessel(mmsi: int, repo: VesselRepository = Depends()) -> VesselResponse:
    vessel = await repo.get_by_mmsi(mmsi)
    return VesselResponse.model_validate(vessel)

# SAI - không dùng Depends, trả ORM object
def get_vessel(mmsi: int):
    return session.query(Vessel).filter_by(mmsi=mmsi).first()
```

### 2.4 Error handling

- Dùng FastAPI `HTTPException` với status code đúng (404, 422, 500...).
- Không `except Exception: pass` — log + re-raise hoặc xử lý cụ thể.
- Ingestion errors không crash process: catch per-message, log, continue.

### 2.5 Config

- Dùng `pydantic-settings` (`BaseSettings`), đọc từ env.
- Không hardcode config trong code. Tất cả qua `.env` / env var.
- `.env.example` commit vào repo, `.env` thật KHÔNG commit.

### 2.6 Testing

- Framework: **pytest** + `pytest-asyncio`
- Đặt tên: `test_<module>.py`, function `test_<behavior>`
- Mock DB/Redis trong unit test; integration test dùng testcontainers hoặc docker-compose test env
- Coverage mục tiêu: ≥ 60% cho Phase 1, ≥ 80% cho ingestion module

---

## 3. Frontend (React 18 + TypeScript + Vite)

### 3.1 Style

- Formatter: **Prettier** + ESLint, config trong `.eslintrc.cjs` / `.prettierrc`
- Line length: **100 ký tự**
- **TypeScript strict mode** bắt buộc (`"strict": true` trong tsconfig)
- Không dùng `any` — nếu thực sự cần, comment lý do + dùng `unknown` + type guard

### 3.2 Naming

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Component | `PascalCase` | `VesselInfo.tsx` |
| Hook | `camelCase` + prefix `use` | `useSSE.ts` |
| Variable / function | `camelCase` | `fetchVessels` |
| Constant | `UPPER_SNAKE` | `API_BASE_URL` |
| Type / Interface | `PascalCase` | `VesselPosition` |
| CSS class (tailwind) | `kebab-case` | `vessel-info-panel` |
| File component | `PascalCase.tsx` | `MapView.tsx` |
| File non-component | `camelCase.ts` | `useSSE.ts` |

### 3.3 Cấu trúc code

- **Function components + hooks** (không class component).
- **Mỗi component 1 file**, export default. Component lớn → tách sub-components trong cùng folder.
- **Props**: dùng `interface` cho props, `type` cho union/alias.
- **State**: local state `useState`; global state `zustand` (không bê nguyên Redux).
- **Data fetching**: `@tanstack/react-query`, không `useEffect` + `fetch` thủ công.

```tsx
// ĐÚNG
export function VesselInfo({ mmsi }: VesselInfoProps): JSX.Element {
  const { data, isLoading } = useVessel(mmsi);
  ...
}

// SAI - useEffect fetch thủ công
export function VesselInfo({ mmsi }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/vessels/${mmsi}`).then(r => r.json()).then(setData);
  }, [mmsi]);
}
```

### 3.4 Styling

- **Tailwind CSS** — không inline style object, không CSS module (trừ trường hợp đặc biệt).
- Utility-first; component phức tạp lặp lại → extract sub-component, không @apply class dài.
- Dark mode: hỗ trợ qua `dark:` variant.

### 3.5 Testing

- Framework: **Vitest** + **React Testing Library**
- Đặt tên: `<Component>.test.tsx` cùng folder
- Test behavior (render, user interaction), không test implementation detail

---

## 4. Database

### 4.1 Migration

- Dùng **Alembic** (backend) — không modify schema trực tiếp bằng SQL tay.
- Mỗi migration: 1 file, có `upgrade()` + `downgrade()`.
- Migration phải **reversible** và **idempotent** nếu có thể.
- TimescaleDB hypertable + policy: tạo qua migration riêng, có guard check extension tồn tại.

### 4.2 Query

- Dùng SQLAlchemy 2.0 style (`select()` statement, không legacy `Query` API).
- Async session: `async with session.begin():` cho write transaction.
- Index: thêm index cho mọi cột dùng trong WHERE/ORDER BY phổ biến (xem ARCHITECTURE.md).
- Không `SELECT *` — chọn cột cụ thể ở query hot path.

### 4.3 Naming

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Table | `snake_case`, số nhiều | `position_reports` |
| Column | `snake_case` | `ship_type`, `nav_status` |
| Index | `idx_<table>_<cols>` | `idx_pos_mmsi_ts` |
| FK | `fk_<table>_<ref>` | `fk_alerts_geofences` |

---

## 5. Git

### 5.1 Branch

- `main`: production-ready, luôn chạy được
- `develop`: tích hợp (nếu cần)
- Feature: `feat/<tên-ngắn>` (VD: `feat/ais-ingestion`)
- Fix: `fix/<tên-ngắn>`
- Chore: `chore/<tên-ngắn>`

### 5.2 Commit

- Format: `<type>: <mô tả ngắn>`
- Type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`
- Viết thường, không dấu chấm cuối, imperative mood (tiếng Anh hoặc Việt không dấu)
- Ví dụ: `feat: thêm AISStream WebSocket client với backoff reconnect`
- 1 commit = 1 thay đổi logic, không gộp feature + refactor + format chung.

### 5.3 PR

- Template PR: mô tả thay đổi + screenshot (nếu UI) + cách test
- Reviewer: ít nhất 1 người (Tech Lead review mọi PR vào `main`)
- CI phải xanh (lint + typecheck + test) trước khi merge
- Squash merge vào `main`

---

## 6. API Design

- REST, version prefix `/api/v1/`
- Resource naming: số nhiều (`/vessels`, `/positions`)
- Query param: `snake_case` (match backend)
- Response: JSON, field `snake_case`
- Pagination: `?limit=50&offset=0`, response có `total`
- Error format RFC 7807:
  ```json
  { "type": "about:blank", "title": "Not Found", "status": 404, "detail": "Vessel 123 not found" }
  ```
- Timestamp: ISO 8601 UTC (`2026-07-16T08:30:00Z`)
- Coordinates: WGS84, lat/lon decimal degrees

---

## 7. Pre-commit Hooks

Cài `pre-commit`, config `.pre-commit-config.yaml`:

- **Backend**: ruff format + ruff check + mypy
- **Frontend**: prettier + eslint + tsc
- **General**: trailing whitespace, end-of-file, check-yaml, no-commit-to-branch (chặn commit thẳng `main`)
