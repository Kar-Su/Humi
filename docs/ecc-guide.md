# ECC Integration Guide

ECC (Agent Harness Optimization System) terintegrasi ke Humi via global clone di `~/helmi/ecc-global`.

## Sumber

- Repository: https://github.com/affaan-m/ECC
- Local clone: `/home/kar/helmi/ecc-global/`
- Config Humi: `opencode.json` (path absolut ke `~/helmi/ecc-global/`)

## Update ECC

```bash
cd ~/helmi/ecc-global
git pull origin main
npm install && npm run build:opencode
```

Tidak perlu update `opencode.json` Humi — skills/agents/commands menggunakan path absolut yang stabil.

## Commands (ketik di chat opencode)

| Command | Fungsi | Kapan pakai |
|---|---|---|
| `/plan` | Implementation plan detail | Sebelum mulai fitur baru |
| `/tdd` | TDD workflow (RED→GREEN→REFACTOR) | Saat nulis kode baru |
| `/code-review` | Review quality, security, maintainability | Setelah selesai nulis kode |
| `/security` | Security review menyeluruh | Sebelum push, handle auth/secrets |
| `/build-fix` | Fix build/type errors minimal | Saat build gagal |
| `/go-review` | Review kode Go gateway | Setelah ubah gateway |
| `/go-test` | TDD untuk Go | Saat nulis test Go |
| `/go-build` | Fix Go build errors | Saat `go build` gagal |
| `/e2e` | Generate + jalankan E2E tests | Untuk test flow kritis |
| `/verify` | Verification loop (build+lint+test+security) | Sebelum PR |
| `/refactor-clean` | Hapus dead code | Saat codebase berantakan |
| `/orchestrate` | Orchestrate multiple agents | Tugas kompleks multi-step |
| `/update-docs` | Update dokumentasi | Setelah perubahan besar |
| `/test-coverage` | Analisis test coverage | Cek apakah 80%+ tercapai |
| `/learn` | Extract patterns dari session | Setelah selesai sesi |
| `/checkpoint` | Simpan state verifikasi | Tandai milestone |

## Subagents (delegasi ke specialist)

| Agent | Fungsi |
|---|---|
| `planner` | Perencanaan fitur kompleks |
| `architect` | Keputusan arsitektur |
| `code-reviewer` | Review kode |
| `security-reviewer` | Scan vulnerabilities |
| `tdd-guide` | Bimbingan TDD step-by-step |
| `go-reviewer` | Expert Go review |
| `python-reviewer` | Expert Python review |
| `rust-reviewer` | Expert Rust review |
| `build-error-resolver` | Fix build errors |
| `e2e-runner` | Playwright E2E tests |
| `refactor-cleaner` | Cleanup dead code |
| `doc-updater` | Update dokumentasi |
| `loop-operator` | Operate autonomous agent loops |

## Skills (always-loaded)

```
coding-standards    → KISS, DRY, YAGNI, immutability patterns
tdd-workflow        → RED→GREEN→REFACTOR dengan 80%+ coverage
security-review     → Checklist security, secrets management
backend-patterns    → Repository pattern, service layer, caching
frontend-patterns   → React hooks, composition, performance
golang-patterns     → Idiomatic Go, error handling, concurrency
python-patterns     → PEP 8, type hints, EAFP
fastapi-patterns    → Pydantic, dependency injection, async
docker-patterns     → Compose, networking, security
api-design          → REST conventions, status codes, pagination
e2e-testing         → Playwright, Page Object Model
verification-loop   → Build→Lint→Test→Security checklist
```

## Skills lain (286 total, akses manual saat dibutuhkan)

```bash
# Lihat semua skills
ls ~/helmi/ecc-global/skills/

# Load skill tertentu di chat opencode
/skill <nama-skill>
```

Kategori yang relevan untuk Humi:
- `react-patterns`, `react-performance`, `vite-patterns` — untuk frontend
- `rust-patterns`, `rust-testing` — untuk masa depan (Tauri desktop)
- `error-handling` — patterns error handling lintas bahasa
- `latency-critical-systems` — untuk optimasi pipeline latency

## Humi Skills (domain-specific, tidak digantikan ECC)

```
.opencode/skill/
├── persona-prompting    → Kepribadian Humi (Hu Tao × Neuro-sama)
├── protocol-contract    → WebSocket protocol v1 (4-file sync)
├── model-ops            → Model inventory (TTS/LLM statuses)
├── avatar-frontend      → VRM conventions + lip-sync
├── dev-workflow         → Docker Compose stack operations
├── benchmark-id         → Quality gate TTS Indonesia
└── git-github           → Branching workflow (main PR-only)
```

## Workflow tipikal dengan ECC

```
1. /plan "deskripsi fitur"
   → planner agent buat implementation plan

2. /tdd "apa yang mau ditest"
   → tdd-guide bimbing RED→GREEN→REFACTOR

3. Nulis kode...

4. /code-review
   → code-reviewer cek quality + security

5. /go-review  (untuk gateway)
   → go-reviewer cek idiomatic Go

6. /verify
   → verification loop: build + lint + test + security

7. Push ke developer branch
```

## Troubleshooting

### Skills tidak muncul
- Pastikan `~/helmi/ecc-global/` ada dan sudah di-build
- Restart opencode session

### Agent tidak bisa delegate
- Cek path di `opencode.json` — harus absolut ke `~/helmi/ecc-global/`
- Pastikan file prompt ada: `ls ~/helmi/ecc-global/.opencode/prompts/agents/`

### Build error
```bash
cd ~/helmi/ecc-global && npm install && npm run build:opencode
```
