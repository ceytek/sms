# Toplu SMS Yönetim Platformu

Yüksek hacimli toplu SMS gönderimi için kurumsal yönetim platformu.

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, REST API |
| AI Service | Python, FastAPI |
| Veritabanı | PostgreSQL |
| Cache / Queue | Redis, BullMQ |
| Altyapı | Docker, Docker Compose, Nginx |

## Gereksinimler

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

## Hızlı Başlangıç (Docker Compose)

Tüm servisleri tek komutla başlatın:

```bash
docker compose up -d
```

Servisler:

| Servis | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| AI Service | http://localhost:8000 |
| PostgreSQL | localhost:5434 |
| Redis | localhost:6380 |

## Manuel Kurulum

### 1. PostgreSQL ve Redis

Docker ile sadece altyapı servislerini başlatın:

```bash
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

Backend http://localhost:3001 adresinde çalışacaktır.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend http://localhost:3000 adresinde çalışacaktır.

### 4. AI Service

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

AI Service http://localhost:8000 adresinde çalışacaktır.

## Test Kullanıcıları

| Rol | Firma Kodu | Kullanıcı Adı | Parola |
|-----|-----------|----------------|--------|
| Müşteri | TEST001 | musteri | 123456 |
| Admin | ADMIN | admin | admin123 |

## Proje Yapısı

```
SMS/
├── frontend/          # Next.js + React + TypeScript + Tailwind + shadcn/ui
├── backend/           # NestJS + TypeScript + REST API
├── ai-service/        # Python + FastAPI
├── docker/            # Dockerfile dosyaları
├── .env.example       # Environment değişkenleri şablonu
├── docker-compose.yml # Tüm servisler
├── .gitignore
└── README.md
```

## Environment Değişkenleri

`.env.example` dosyasını kopyalayıp `.env` olarak düzenleyin:

```bash
cp .env.example .env
```

## Yayınlama (VDS)

Geliştirme bu makinede yapılır. `main` branch'e push edilince GitHub Actions SSH ile sunucuya bağlanır ve Docker Compose ile yayına alır.

Akış:

```text
Yerel geliştirme
   ↓
git push origin main
   ↓
GitHub Actions
   ↓
SSH → VDS
   ↓
git pull + docker compose up
```

Sunucuda ilk kurulum (bir kez):

```bash
# sunucuda root olarak
curl -fsSL https://raw.githubusercontent.com/ceytek/sms/main/scripts/server-setup.sh | bash
```

veya repoyu kopyaladıktan sonra:

```bash
bash /opt/sms/scripts/server-setup.sh
```

GitHub repository secrets:

| Secret | Açıklama |
|--------|----------|
| `SSH_HOST` | Sunucu IP (ör. 185.92.2.38) |
| `SSH_USER` | `root` |
| `SSH_PRIVATE_KEY` | Deploy için özel SSH anahtarı |

Sunucu ortam değişkenleri `.env.production.example` dosyasından `/opt/sms/.env` olarak oluşturulur.

Yayın sonrası:

| Servis | URL |
|--------|-----|
| Frontend | http://185.92.2.38 |
| Backend API | http://185.92.2.38:3001 |
| AI Service | http://185.92.2.38:8000 |

## Lisans

Tüm hakları saklıdır.
