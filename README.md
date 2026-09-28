# 🛰️ NOVA: Network Operations & Telemetry Analytics

**Network Operations Center (NOC) for Real-Time Network Monitoring & Diagnostics**

NOVA is a comprehensive NOC system that integrates with MikroTik RouterOS API and SNMP devices to provide real-time network monitoring, automated diagnostic analysis, and incident alerting.

---

## ✨ Features

### 📊 Real-Time Monitoring
- **Device polling** via MikroTik RouterOS API and SNMP v2c/v3
- **Configurable intervals**: 10s to 5m per device (default: 30s)
- **Metrics collected:** CPU load, memory usage, uptime, interface traffic (RX/TX), IP addresses, routing tables, DHCP leases

### 🖥️ Dashboard
- **Overview panel**: total devices, online/offline counts, alert summary
- **Device cards**: per-device CPU/RAM gauges, status indicators
- **Traffic charts**: real-time bandwidth visualization per interface
- **Alert feed**: live notification stream with severity color coding
- **Historical charts**: trend analysis (1h/6h/24h/7d/30d)
- **Network topology**: interactive visual map of device connections

### 🤖 NOC Diagnostic Assistant (Google Gemini)
- **Health score analysis**: computed device health scores (0-100)
- **Anomaly indication**: identifies unusual patterns in metrics
- **Troubleshooting recommendations**: step-by-step fix suggestions
- **Interactive chat**: ask questions about network status in natural language

### 🔔 Smart Alerting
- **Configurable thresholds**: per-device or global rules
- **Severity levels**: INFO, WARNING, CRITICAL
- **Notifications**: in-app real-time (WebSocket) + Telegram bot
- **Anti-flapping**: cooldown and hysteresis logic

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2.0 |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| UI Components | shadcn/ui · Recharts · React Flow |
| Database | PostgreSQL 16 · InfluxDB 2.7 |
| AI | Google Gemini 2.5 Flash |
| Auth | JWT (PyJWT + bcrypt) |
| Notifications | Telegram Bot API · WebSocket |
| Deployment | Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Google Gemini API Key](https://makersuite.google.com/app/apikey) (for AI features)
- Telegram Bot Token (optional, for notifications)

### 1. Clone & Configure

```bash
git clone <repository-url>
cd nova
cp .env.example .env
```

Edit `.env` and set your values:
- `GEMINI_API_KEY`: your Google Gemini API key
- `JWT_SECRET_KEY`: a random secret string for production
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`: for Telegram alerts

### 2. Launch

```bash
docker-compose up -d
```

This starts all services:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **InfluxDB UI:** http://localhost:8086

### 3. Login

Default admin credentials:
- **Username:** `admin`
- **Password:** `admin123`

> ⚠️ Change the default password immediately in production!

### 4. Add Devices

Navigate to **Devices → Add Device** and configure your network equipment:

**MikroTik RouterOS:**
- Connection type: MikroTik API
- Host: device IP address
- Port: 8728 (default API port)
- Username/Password: RouterOS credentials

**SNMP Device:**
- Connection type: SNMP
- Host: device IP address
- SNMP Community: your community string
- SNMP Version: v2c or v3

---

## 📁 Project Structure

```
nova/
├── docker-compose.yml          # All services orchestration
├── .env.example                # Environment template
│
├── backend/                    # Python FastAPI backend
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini             # Database migrations
│   └── app/
│       ├── main.py             # FastAPI entry point
│       ├── config.py           # Settings management
│       ├── models/             # SQLAlchemy ORM models
│       ├── schemas/            # Pydantic validation schemas
│       ├── api/                # REST API endpoints
│       ├── services/           # Business logic
│       ├── collectors/         # Device polling engines
│       ├── notifications/      # Alert dispatch (Telegram, WS)
│       └── core/               # Security, dependencies
│
└── frontend/                   # React TypeScript frontend
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── components/         # UI components
        ├── pages/              # Route pages
        ├── hooks/              # Custom React hooks
        ├── stores/             # Zustand state stores
        ├── services/           # API client services
        └── types/              # TypeScript types
```

---

## 🔧 Development

### Backend (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
```

---

## 📄 API Documentation

Interactive API docs available at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 📋 License

This project is proprietary software. All rights reserved.
