# MarineAnalytics — Development Rules

Quy trình phát triển bắt buộc. Đảm bảo team 4-6 người mid-level phối hợp trơn tru, tránh rework và debt kỹ thuật.

---

## 1. Vai trò & Phân công

| Role | Số người | Trách nhiệm chính | Ownership module |
|------|----------|-------------------|------------------|
| **Tech Lead (TL)** | 1 | Kiến trúc, review mọi PR vào `main`, quyết định kỹ thuật, xử risk, sync tiến độ | core/, review all |
| **Backend Engineer 1 (BE1)** | 1 | Ingestion pipeline (WS client, decode, writer) — **module khó nhất** | ingestion/, models/ |
| **Backend Engineer 2 (BE2)** | 1 | REST API, SSE realtime, alerts engine, tasks/scheduler | api/, realtime/, alerts/, tasks/ |
| **Frontend Engineer 1 (FE1)** | 1 | Map (MapLibre + deck.gl), vessel layer, clustering, SSE client | components/map/, hooks/, store/ |
| **Frontend Engineer 2 (FE2)** | 1 | Info panel, filters, dashboard, playback, geofence editor | components/panel/, dashboard/, playback/, geofence/ |
| **DevOps (DO)** | 1 (part-time → full Sprint 5+) | docker-compose, CI/CD, TimescaleDB ops, monitoring, deploy | docker/, .github/workflows/, infra/ |

> Nếu team 4 người: gộp TL+BE1 hoặc TL+BE2. Nếu 6 người: thêm 1 BE hoặc FE phụ.

### Nguyên tắc ownership

- Mỗi module có 1 **owner chính** (người viết majority code) + TL là reviewer.
- Người khác được sửa module không phải của mình, nhưng **PR phải tag owner để review**.
- Không ai là "single point of failure" duy nhất biết 1 module — phải có doc + pair programming khi cần.

---

## 2. Quy trình Sprint

### 2.1 Sprint cadence

- **1 Sprint = 1 tuần** (thứ 2 bắt đầu, thứ 6 demo)
- Sprint planning: sáng thứ 2 (30 phút) — gán task từ TASKS.md
- Daily standup: 10 phút (online/ offline) — 3 câu: làm gì hôm qua, làm gì hôm nay, có block gì không
- Sprint review + demo: chiều thứ 6 (45 phút)
- Retrospective: sau demo (15 phút) — cái gì tốt, cái gì cần cải thiện

### 2.2 Definition of Done (DoD) — mỗi task

- [ ] Code implement theo ARCHITECTURE.md + CODING_STANDARDS.md
- [ ] Test pass (unit test cho logic chính, tối thiểu happy path + 1 edge case)
- [ ] Lint + typecheck pass (`ruff check`, `mypy`, `eslint`, `tsc`)
- [ ] PR review bởi ít nhất 1 người (TL review mọi PR vào `main`)
- [ ] Merge vào `main` + chạy được local (`docker-compose up`)
- [ ] Cập nhật TASKS.md (đánh dấu [x])

### 2.3 Definition of Done — mỗi Sprint

- [ ] Demo end-to-end chạy được (không chỉ unit test)
- [ ] Tất cả task trong sprint DONE hoặc được move sang sprint sau (có lý do)
- [ ] Không có PR treo > 3 ngày
- [ ] CI xanh trên `main`

---

## 3. Git Workflow

### 3.1 Branching (GitHub Flow đơn giản)

```
main (luốn chạy được)
 ├── feat/ais-ingestion        ← BE1
 ├── feat/sse-realtime          ← BE2
 ├── feat/map-vessel-layer      ← FE1
 └── fix/redis-ttl              ← ai cũng được
```

- Tạo branch từ `main` mới nhất: `git checkout main && git pull && git checkout -b feat/...`
- Rebase lên `main` trước khi mở PR (giữ history sạch)
- Squash merge vào `main`

### 3.2 Commit

- Xem CODING_STANDARDS.md mục 5.2
- 1 commit = 1 thay đổi logic. Không gộp feature + format + refactor.
- Commit thường xuyên (ít nhất 1-2 lần/ngày khi làm việc) — không để dồn 1 PR khổng lồ cuối tuần.

### 3.3 PR Rules

- Mở PR sớm (draft PR) khi bắt đầu — team biết bạn đang làm gì
- PR title: `<type>: <mô tả>` (match commit convention)
- PR description: mô tả thay đổi + cách test + screenshot (nếu UI)
- Reviewer: tag owner module + TL
- SLA review: trong vòng 24h
- Không tự merge PR của mình (trừ TL khi cần hotfix)
- CI phải xanh: lint + typecheck + test
- Sau merge: xóa branch

---

## 4. API Contract First

**Backend và Frontend song song từ Sprint 2** — để không block nhau:

1. **BE định nghĩa API contract trước** (OpenAPI schema + pydantic response model)
2. **FE dựa vào contract để build type + mock data**, không cần đợi BE implement xong
3. BE implement route → trả data đúng schema
4. FE đổi mock → API thật (chỉ đổi 1 dòng base URL / endpoint)

Quy tắc:
- **Không đổi API schema mà không báo FE**. Nếu phải đổi: tạo PR BE + FE cùng lúc, hoặc version mới.
- API doc (Swagger) tự sinh từ FastAPI tại `/docs` — luôn cập nhật.

---

## 5. Testing Strategy

| Loại | Phạm vi | Ai làm | Khi nào |
|------|---------|--------|---------|
| **Unit test** | Logic thuần (decode, parse, calc) | Người viết module | Cùng lúc viết code |
| **Integration test** | API endpoint + DB (testcontainers) | BE | Khi route hoàn thiện |
| **Component test** | React component render + interaction | FE | Khi component hoàn thiện |
| **E2E smoke test** | Pipeline ingestion → DB → API → map | TL/DO | Cuối mỗi sprint |

Mục tiêu coverage:
- `ingestion/`: ≥ 80% (module critical)
- `api/`, `realtime/`: ≥ 60%
- Frontend: test component chính, không cần 100%

> **Không viết test cho code throwaway.** Test cho logic có khả năng break: decode AIS, bbox filter, geofence ST_Contains, reconnect backoff.

---

## 6. Risk Management

### 6.1 Risk register (cập nhật mỗi sprint)

| Risk | Owner | Mitigation | Trigger |
|------|-------|------------|---------|
| AISStream disconnect/rate limit | BE1 | Backoff + healthcheck + alert | WS down > 1 phút |
| Map lag > 1000 marker | FE1 | Clustering từ đầu, profile browser | FPS < 30 |
| DB phình nhanh | DO | Compression + retention policy | Disk > 70% |
| Decode AIS sai message type | BE1 | Unit test pyais + log anomaly | Decode error rate > 1% |
| SSE flood client chậm | BE2 | Batch 1s + drop stale + max client | Client buffer full |
| BE/FE bị block chờ nhau | TL | API contract first + mock | Sprint lệch > 2 ngày |

### 6.2 Escalation

- Block > 4 giờ → hỏi đồng nghiệp / pair debug
- Block > 1 ngày → escalate lên TL, đánh giá lại approach
- Risk ảnh hưởng timeline sprint → báo trong standup, KHÔNG giấu

---

## 7. Communication

- **Chat chính**: kênh team (Slack/Discord/Zalo) — mọi thảo luận kỹ thuật có record
- **PR comment**: review qua PR, không chat口头 "sửa chỗ này rồi merge nha"
- **Doc**: quyết định kỹ thuật quan trọng → ghi vào `docs/decisions/` (ADR - Architecture Decision Record)
- **Code review**: constructive, focus vào code không phải người, giải thích *tại sao* khi suggest thay đổi

---

## 8. Local Development Setup

Mỗi dev phải chạy được full stack local:

```bash
# 1. Clone repo
git clone <repo-url> && cd MarineAnalytics

# 2. Copy env
cp .env.example .env
# Điền AISSTREAM_API_KEY vào .env

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

> Chi tiết setup sẽ có trong `README.md` sau khi scaffolding.

---

## 9. Quy tắc "Không"

- **KHÔNG** commit `.env` thật, API key, secret
- **KHÔNG** commit `node_modules/`, `__pycache__/`, `dist/`, `.venv/`
- **KHÔNG** push trực tiếp lên `main` (chỉ qua PR)
- **KHÔNG** merge PR khi CI đỏ
- **KHÔNG** skip test vì "lười" / "gấp" — viết tối thiểu happy path
- **KHÔNG** giữ debt kỹ thuật im lặng — ghi vào TASKS.md mục "Tech Debt"
- **KHÔNG** đổi kiến trúc/stack giữa chừng không qua thảo luận với TL
