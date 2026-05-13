# IT Operations Hub

IT Operations Hub adalah aplikasi internal untuk manajemen aset IT dan service desk (ticketing), dengan pendekatan microservices.

Project ini adalah kelanjutan migrasi dari sistem monolith lama ke stack modern yang lebih mudah di-scale dan di-deploy.

## Stack

- Frontend: React + Vite + Tailwind
- Backend API: Node.js + Express
- Database: MySQL 8
- Queue/Cache: Redis
- Worker: Node.js (notification worker untuk proses async)

## Service Map

- `auth-api` (`:3001`)  
  Login, register/signup, user info, RBAC.

- `asset-api` (`:3002`)  
  CRUD aset dan summary aset.

- `ticket-api` (`:3003`)  
  Ticketing, comments, summary, notifications.

- `notification-worker`  
  Konsumsi queue Redis untuk notifikasi.

- `frontend` (`:5173` saat dev)  
  Web UI untuk operasional harian.

## Status Saat Ini

Yang sudah berjalan:

- Backend utama (`auth-api`, `asset-api`, `ticket-api`) sudah terhubung ke DB.
- Frontend sudah pakai live API untuk Dashboard, Assets, Tickets.
- UI sudah diarahkan ke style enterprise ticketing (lebih familiar untuk user).
- Mode tampilan `comfortable/compact` sudah tersedia di topbar.

Yang belum selesai:

- `Dockerfile` per service belum dibuat (jadi `docker compose` full stack belum bisa build semuanya).
- `notification-worker` belum rutin dipakai pada alur local dev harian.
- Deployment K3s/Terraform/CI-CD masih tahap berikutnya.

## Menjalankan Secara Lokal (Recommended)

### 1) Start MySQL + Redis

Dari root project:

```powershell
docker compose up -d db redis
```

### 2) Install dependencies backend

```powershell
cd services/auth-api
npm install

cd ../asset-api
npm install

cd ../ticket-api
npm install
```

### 3) Jalankan backend API

Jalankan di terminal terpisah:

```powershell
# Terminal 1
cd services/auth-api
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="password"
$env:DB_NAME="it_ops_hub"
$env:JWT_SECRET="dev-secret-local-only"
$env:PORT="3001"
npm start
```

```powershell
# Terminal 2
cd services/asset-api
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="password"
$env:DB_NAME="it_ops_hub"
$env:JWT_SECRET="dev-secret-local-only"
$env:PORT="3002"
npm start
```

```powershell
# Terminal 3
cd services/ticket-api
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="password"
$env:DB_NAME="it_ops_hub"
$env:REDIS_HOST="localhost"
$env:JWT_SECRET="dev-secret-local-only"
$env:PORT="3003"
npm start
```

### 4) Jalankan frontend

```powershell
cd services/frontend
npm install
npm run dev
```

Akses: `http://localhost:5173`

## Akun Default (Local)

- Email: `admin@it-ops-hub.local`
- Password: `Admin@123!`

Jika login gagal, cek apakah hash admin di tabel `users` sudah sinkron dengan password di atas.

## Struktur Folder

```text
.
├─ database/
│  └─ init.sql
├─ services/
│  ├─ auth-api/
│  ├─ asset-api/
│  ├─ ticket-api/
│  ├─ notification-worker/
│  └─ frontend/
├─ docker-compose.yml
└─ AI_CONTEXT.md
```

## Catatan Operasional

- Frontend memakai endpoint default:
  - Auth: `http://localhost:3001/api`
  - Asset: `http://localhost:3002/api`
  - Ticket: `http://localhost:3003/api`

- Jika mau override endpoint, set:
  - `VITE_AUTH_API_URL`
  - `VITE_ASSET_API_URL`
  - `VITE_TICKET_API_URL`

- Untuk handover antar AI agent, lihat `AI_CONTEXT.md`.

## Baseline CI (Sudah Aktif)

Repo ini sudah punya baseline GitHub Actions di:

- `.github/workflows/ci-baseline.yml`

Workflow ini jalan saat `push` dan `pull_request` ke `main`, dengan scope:

1. Frontend build check (`npm ci` + `npm run build`)
2. Backend syntax check (`node --check`) untuk:
   - `auth-api`
   - `asset-api`
   - `ticket-api`

Tujuan baseline ini: menjaga kualitas dasar selama fase fitur masih bergerak cepat, tanpa mengunci tim ke pipeline deploy yang belum stabil.

## Kapan Naik ke CI/CD Lengkap

Saat fitur sudah mendekati final, lanjutkan dari baseline ini ke pipeline penuh.

Sinyal waktu yang tepat untuk naik level:

1. Perubahan skema data mulai jarang dan endpoint utama relatif stabil.
2. `Dockerfile` semua service sudah jadi dan bisa build konsisten.
3. Environment staging sudah siap (secret, ingress, dan endpoint health).
4. Tim sudah sepakat gating branch berbasis status checks.

Tahap upgrade yang direkomendasikan:

1. Tambah job test terstruktur (unit/integration).
2. Tambah build artifact/container image.
3. Push image ke registry (ECR/GHCR).
4. Deploy otomatis ke staging.
5. Tambah approval gate/manual promote ke production.

## Roadmap Pendek

1. Finalisasi UX operasional (edit/delete assets, assignee workflow, dsb).
2. Selesaikan `Dockerfile` semua service.
3. Lanjut phase infra: Terraform + K3s manifests.
4. CI/CD pipeline ke GitHub Actions + target deploy.

---

Kalau Anda butuh, saya bisa lanjut bikin versi README terpisah untuk:

- `services/frontend/README.md` (fokus UI dev workflow), dan
- `services/*-api/README.md` (fokus endpoint + contract per service).
