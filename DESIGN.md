# NOVA Design Direction (DESIGN.md)

> Arahan desain sistem Network Operations Center (NOC) NOVA berbasis prinsip antislop: fungsional, jujur terhadap data telemetri, berorientasi operator jaringan, dan bebas dari ornamen generik AI.

## 1. Identity & Purpose
- **Produk:** NOVA: Network Operations & Telemetry Analytics (Sistem NOC & Telemetri Jaringan).
- **Fungsi Utama:** Pemantauan real-time router MikroTik & SNMP, visualisasi topologi, manajemen insiden/alert, dan analisis operasional.
- **Audiens:** Network Engineer, Sysadmin, dan Operator NOC yang membutuhkan visibilitas cepat, akurat, dan dapat diandalkan 24/7.

## 2. Personality & Principles
- **Utilitarian & Precise:** Setiap elemen di layar memiliki fungsi operasional yang jelas. Tidak ada dekorasi hampa.
- **Honest Data Telemetry:** Tidak ada data buatan, angka mock siluman, atau metrik palsu. Jika data kosong atau perangkat baru, tampilkan status kosong (empty state) yang jujur.
- **Low Cognitive Load:** Minimalkan distraksi visual (hindari animasi berulang, ping beacon berlebihan, glow neon, dan background grid blueprint).
- **High Contrast & WCAG AA:** Keterbacaan teks dan indikator status menjadi prioritas utama.

## 3. Dials
- **ENERGY:** 1 (Calm: tenang, tidak berteriak, fokus ke keterbacaan data metrik).
- **RHYTHM:** 2 (Structured with Intentional Breaks: tata letak grid kartu dan tabel metrik terstruktur, tidak monoton).
- **MOTION:** 1 (Subtle & Functional: transisi hover minimal, tidak ada animasi floating/bouncing template yang mengalihkan perhatian operator).

## 4. Color Palette
- **Latar Belakang:** Slate 950 (`#020617` / `#0b0f19`) & Card Slate 900 (`#0f172a`).
- **Garis Batas (Border):** Slate 800 (`#1e293b`).
- **Teks Utama:** Slate 100 (`#f1f5f9`), kontras 14:1 terhadap latar.
- **Teks Muted:** Slate 400 (`#94a3b8`), kontras 5.3:1 (memenuhi standar WCAG AA).
- **Aksen Utama:** Cyan 500 (`#06b6d4` / `#0891b2`), dipakai secara hemat hanya untuk fokus aktif dan link penting.
- **Status Semantik (NOC Standard):**
  - **Online / Normal:** Emerald 500 (`#10b981`)
  - **Warning / Degraded:** Amber 500 (`#f59e0b`)
  - **Critical / Down:** Rose 500 (`#f43f5e`)
  - **Info / Neutral:** Sky 500 (`#0284c7`)

## 5. Typography
- **UI & Teks:** Inter / Sans-serif sistem dengan keterbacaan tinggi.
- **Metrik, IP, Port, MAC Address, Uptime:** Font Monospace (`font-mono`) untuk memastikan penyelarasan angka tabular.
- **Aturan Tipografi:** Hindari huruf kapital berjarak ekstrem (wide tracking) dan hindari karakter em dash (`—`).

## 6. Iconography & Visual Assets
- **Ikon:** Gunakan ikon teknikal yang spesifik pada fungsinya (Server, Activity, Network, Shield, AlertTriangle). Hindari ikon generik AI seperti `Sparkles`, `Star`, `Wand`, atau `Orb`.
- **Tombol & Tautan:** Hapus panah dekoratif (`→`, `&rarr;`) di setiap tombol. Gunakan teks deskriptif ("Buka Topologi", "Lihat Detail").
