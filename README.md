# NOVA (Network Observation & Vigilance Assistant)

Aplikasi pemantauan jaringan untuk router MikroTik RouterOS dan perangkat SNMP, dilengkapi analisis diagnostik berbasis Google Gemini API.

## Fitur Utama

- Memantau metrik CPU, memori, bandwidth, latensi ICMP, dan status interface secara real-time melalui WebSocket.
- Mengumpulkan telemetri lewat MikroTik RouterOS API, SNMP v2c, Syslog (UDP port `5140`), dan NetFlow v5 (UDP port `2055`).
- Menyediakan analisis kesehatan jaringan, deteksi anomali trafik, dan asisten chat teknis menggunakan Google Gemini API dengan fallback diagnostik lokal berbasis aturan.
- Memantau latensi, packet loss, serta status link utama dan cadangan pada konfigurasi Dual-WAN.
- Mengirim notifikasi alert otomatis ke Telegram Bot dan antarmuka web saat metrik melewati ambang batas.

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy (Async), APScheduler |
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts, Zustand, Nginx |
| Database | PostgreSQL 16 (relasional), InfluxDB 2.7 (time-series) |
| AI Engine | Google Gemini API (`google-generativeai`) |
| Deployment | Docker & Docker Compose |

## Mulai Cepat (Docker Compose)

### 1. Prasyarat

- Docker Engine dan Docker Compose terinstal.
- (Opsional) Google Gemini API Key untuk mengaktifkan analisis generatif dan chat AI.
- (Opsional) Telegram Bot Token dan Chat ID untuk notifikasi alert.

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

- Antarmuka web dan API Gateway (Nginx): `http://localhost:3000`
- Listener UDP Syslog: port `5140/udp`
- Listener UDP NetFlow v5: port `2055/udp`

## Struktur Proyek

```text
nova/
├── backend/                # Layanan FastAPI
│   ├── app/
│   │   ├── api/            # Endpoint REST API
│   │   ├── collectors/     # Kolektor MikroTik & SNMP + scheduler polling
│   │   ├── core/           # Keamanan, enkripsi kredensial, dependensi
│   │   ├── models/         # Model ORM SQLAlchemy
│   │   ├── notifications/  # Worker Telegram Bot & manajer WebSocket
│   │   ├── schemas/        # Skema request/response Pydantic
│   │   └── services/       # Logika layanan (AI, alert, metrik, topologi, flow, syslog)
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/               # SPA React TypeScript + reverse proxy Nginx
│   ├── src/
│   │   ├── components/     # Komponen UI (dashboard, perangkat, topologi, layout)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Halaman aplikasi
│   │   ├── services/       # Klien HTTP API (Axios)
│   │   ├── stores/         # State management (Zustand)
│   │   └── types/          # Definisi tipe TypeScript
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Lisensi

Proyek ini dikembangkan untuk keperluan infrastruktur pemantauan jaringan dan tugas akhir.
