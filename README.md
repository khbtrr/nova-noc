# NOVA (Network Observation & Vigilance Assistant)

Intelligent Network Monitoring System for MikroTik RouterOS & SNMP Devices, Powered by Google Gemini AI.

---

## Fitur Utama

- **Real-time Monitoring** - Pantau metrik CPU, Memory, Bandwidth, dan status interface secara langsung melalui WebSocket.
- **Multi-Protocol Support** - Mendukung pengumpulan data melalui MikroTik RouterOS API, SNMP v2c, Syslog (UDP 5140), dan NetFlow v5 (UDP 2055).
- **AI-Powered Insights** - Analisis kesehatan jaringan, deteksi anomali, dan asisten percakapan berbasis Google Gemini AI dengan fallback diagnostik deterministik.
- **Dual-WAN SLA & Failover Monitoring** - Pemantauan latensi, packet loss, dan status rute utama maupun cadangan secara berkesinambungan.
- **Smart Alerting** - Notifikasi otomatis via Telegram Bot dan WebSocket ketika metrik melewati ambang batas (threshold).

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy (Async), APScheduler |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Recharts, Zustand, Nginx |
| **Database** | PostgreSQL 16 (Relational), InfluxDB 2.7 (Time-Series) |
| **AI Engine** | Google Gemini API (`google-generativeai`) |
| **Deployment** | Docker & Docker Compose |

## Quick Start (Production Docker Compose)

### 1. Prasyarat
- Docker Engine & Docker Compose terinstal.
- (Opsional) Google Gemini API Key untuk fitur analisis LLM.
- (Opsional) Telegram Bot Token & Chat ID untuk notifikasi eksternal.

### 2. Konfigurasi Environment
```bash
git clone https://github.com/rekr0/nova.git
cd nova
cp .env.example .env
```
Sesuaikan nilai `JWT_SECRET_KEY`, `POSTGRES_PASSWORD`, `INFLUXDB_TOKEN`, `DEFAULT_ADMIN_PASSWORD`, serta kredensial opsional di dalam file `.env`.

### 3. Jalankan Sistem
```bash
docker compose up -d --build
```

### 4. Akses Aplikasi
- **Web Interface & API Gateway (Nginx)**: http://localhost:3000
- **UDP Syslog Listener**: Port `5140/udp`
- **UDP NetFlow v5 Listener**: Port `2055/udp`

## Struktur Proyek

```text
nova/
├── backend/                # FastAPI Backend Application
│   ├── app/
│   │   ├── api/            # REST API Endpoints
│   │   ├── collectors/     # MikroTik & SNMP Data Collectors + Scheduler
│   │   ├── core/           # Security, Encryption, Exceptions, Dependencies
│   │   ├── models/         # SQLAlchemy ORM Models
│   │   ├── notifications/  # Telegram Bot Queue & WebSocket Manager
│   │   ├── schemas/        # Pydantic Request/Response Schemas
│   │   └── services/       # Business Logic (AI, Alerts, Metrics, Topology, Flow, Syslog)
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/               # React TypeScript SPA + Nginx Reverse Proxy
│   ├── src/
│   │   ├── components/     # UI Components (Dashboard, Devices, Topology, Layout)
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── pages/          # Page Views
│   │   ├── services/       # Axios API Clients
│   │   ├── stores/         # Zustand State Management
│   │   └── types/          # TypeScript Interfaces
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Lisensi

Proyek ini dikembangkan untuk keperluan infrastruktur pemantauan jaringan dan tugas akhir.
