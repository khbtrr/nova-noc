import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Union
from app.config import settings

logger = logging.getLogger("nova.ai_service")

SYSTEM_PROMPT = """Anda adalah NOVA AI, asisten spesialis NOC (Network Operations Center) yang profesional, analitis, dan solutif.
Tugas Anda:
1. Memantau kesehatan perangkat jaringan (Router, Switch, Access Point, Firewall, MikroTik, SNMP).
2. Menganalisis metrik performa: CPU Load, Memory Usage, Uptime, Traffic Interface (RX/TX), Status Koneksi.
3. Memberikan indikasi anomali secara jelas dan prioritas penanganan.
4. Memberikan rekomendasi troubleshooting step-by-step yang praktis dan actionable untuk tim operasional NOC.
5. Menjawab dalam Bahasa Indonesia dengan format rapi dan profesional (gunakan bullet points, markdown bold/code bila relevan).
"""

def _get_candidate_models() -> List[str]:
    models = [
        settings.GEMINI_MODEL,
        # gemini-2.x / 1.5 return 404 for this API key; 3.8-flash currently times out
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
    ]
    seen = set()
    ordered = []
    for m in models:
        if m and m not in seen:
            seen.add(m)
            ordered.append(m)
    return ordered

def get_gemini_model():
    key = settings.GEMINI_API_KEY
    if not key or key == "your-gemini-api-key-here" or len(key) < 10:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        return genai.GenerativeModel(_get_candidate_models()[0], system_instruction=SYSTEM_PROMPT)
    except Exception as e:
        logger.warning(f"Failed to configure Gemini model: {e}")
        return None

def _generate_with_gemini(prompt: str, system_instruction: str = SYSTEM_PROMPT) -> Optional[str]:
    key = settings.GEMINI_API_KEY
    if not key or key == "your-gemini-api-key-here" or len(key) < 10:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
    except Exception as e:
        logger.warning(f"Failed to configure Gemini API: {e}")
        return None

    last_error = None
    for model_name in _get_candidate_models():
        try:
            m = genai.GenerativeModel(model_name, system_instruction=system_instruction)
            response = m.generate_content(prompt, request_options={"timeout": 30})
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            logger.warning(f"Gemini call with {model_name} failed: {e}. Trying next candidate...")
            continue

    logger.warning(f"All Gemini candidate models failed. Last error: {last_error}")
    return None

def _heuristic_health_score(metrics: Dict[str, Any]) -> int:
    score = 100
    cpu = float(metrics.get("cpu_load", 0) or 0)
    mem = float(metrics.get("memory_usage", 0) or 0)

    if cpu > 90:
        score -= 40
    elif cpu > 75:
        score -= 20
    elif cpu > 50:
        score -= 10

    if mem > 90:
        score -= 35
    elif mem > 80:
        score -= 20
    elif mem > 60:
        score -= 10

    interfaces = metrics.get("interfaces", [])
    down_count = sum(1 for iface in interfaces if not iface.get("running", True) and not iface.get("disabled", False))
    score -= min(down_count * 10, 30)

    return max(0, min(100, score))

def _fallback_analysis(data_input: Union[str, List[Dict[str, Any]], Dict[str, Any]]) -> str:
    """Generate a deterministic diagnostic summary derived strictly from actual device telemetry."""
    devices: List[Dict[str, Any]] = []
    if isinstance(data_input, list):
        devices = [d for d in data_input if isinstance(d, dict)]
    elif isinstance(data_input, dict):
        devices = [data_input]

    if not devices:
        return (
            "### Laporan Diagnostik Deterministik NOVA AI\n\n"
            "**Status Mesin Analitik:** Mode evaluasi lokal aktif (kunci API Gemini belum dikonfigurasi atau tidak terjangkau).\n\n"
            "**Temuan Aktual:**\n"
            "- Data metrik perangkat spesifik belum tersedia pada permintaan ini.\n\n"
            "**Rekomendasi Tindakan:**\n"
            "1. Pastikan kolektor perangkat aktif dan perangkat terhubung ke jaringan.\n"
            "2. Konfigurasikan `GEMINI_API_KEY` pada file `.env` untuk mengaktifkan evaluasi bahasa alami."
        )

    total = len(devices)
    high_cpu_devs = []
    high_mem_devs = []
    down_iface_devs = []
    offline_devs = []

    for dev in devices:
        name = dev.get("name") or f"Device #{dev.get('id', '?')}"
        status_str = str(dev.get("status", "")).upper()
        metrics = dev.get("metrics") or {}
        cpu = float(metrics.get("cpu_load", 0) or 0)
        mem = float(metrics.get("memory_usage", 0) or 0)
        ifaces = metrics.get("interfaces") or []
        down_ifaces = [i.get("name", "eth") for i in ifaces if not i.get("running", True) and not i.get("disabled", False)]

        if status_str == "OFFLINE":
            offline_devs.append(name)
        if cpu >= 75:
            high_cpu_devs.append(f"{name} ({cpu:.0f}%)")
        if mem >= 80:
            high_mem_devs.append(f"{name} ({mem:.0f}%)")
        if down_ifaces:
            down_iface_devs.append(f"{name} ({len(down_ifaces)} port tidak aktif: {', '.join(down_ifaces[:3])})")

    findings = []
    if offline_devs:
        findings.append(f"- **Perangkat Offline ({len(offline_devs)}/{total}):** {', '.join(offline_devs)}.")
    else:
        findings.append(f"- **Keterjangkauan Perangkat:** {total} perangkat dievaluasi memiliki telemetri aktif.")

    if high_cpu_devs:
        findings.append(f"- **Beban CPU Tinggi (>=75%):** {', '.join(high_cpu_devs)}.")
    else:
        findings.append("- **Beban CPU:** Seluruh perangkat yang terpantau berada di bawah ambang 75%.")

    if high_mem_devs:
        findings.append(f"- **Utilisasi Memori Tinggi (>=80%):** {', '.join(high_mem_devs)}.")
    else:
        findings.append("- **Utilisasi Memori:** Pemakaian RAM seluruh perangkat berada di bawah ambang 80%.")

    if down_iface_devs:
        findings.append(f"- **Status Port/Interface:** Terdeteksi link tidak berjalan pada {'; '.join(down_iface_devs)}.")

    findings_block = "\n".join(findings)
    return (
        f"### Laporan Diagnostik Deterministik NOVA AI\n\n"
        f"**Status Mesin Analitik:** Evaluasi berbasis aturan telemetri aktual ({total} perangkat dievaluasi; koneksi LLM Gemini tidak aktif).\n\n"
        f"**Temuan Aktual:**\n"
        f"{findings_block}\n\n"
        f"**Rekomendasi Tindakan:**\n"
        f"1. Periksa konektivitas fisik dan jalur ICMP pada perangkat atau port yang berstatus offline/down.\n"
        f"2. Tinjau antrean trafik dan tabel koneksi pada router apabila beban CPU atau memori melewati 75%.\n"
        f"3. Tambahkan `GEMINI_API_KEY` yang valid pada `.env` jika memerlukan korelasi generatif lanjutan."
    )

async def analyze_network(devices_data: List[Dict[str, Any]], use_gemini: bool = True) -> Dict[str, Any]:
    overall_scores = []
    analyzed_devices = []

    for dev in devices_data:
        m = dev.get("metrics", {})
        score = _heuristic_health_score(m)
        overall_scores.append(score)

        status = "Healthy" if score >= 80 else ("Warning" if score >= 50 else "Critical")
        analyzed_devices.append({
            "device_id": dev.get("id"),
            "device_name": dev.get("name"),
            "host": dev.get("host"),
            "health_score": score,
            "status": status,
            "cpu_load": m.get("cpu_load", 0),
            "memory_usage": m.get("memory_usage", 0),
        })

    if not overall_scores:
        return {
            "overall_health_score": None,
            "summary": "Belum ada perangkat yang terdaftar untuk dianalisis. Silakan daftarkan router MikroTik atau switch SNMP pada inventaris perangkat.",
            "recommendations": [
                "Tambahkan perangkat jaringan untuk memulai pengumpulan metrik telemetri real-time."
            ],
            "devices": []
        }

    avg_score = round(sum(overall_scores) / len(overall_scores))

    summary_text = ""
    if use_gemini:
        prompt = f"Analisis data metrik seluruh perangkat NOC berikut dan berikan evaluasi kondisi serta rekomendasi:\n\n{json.dumps(devices_data, indent=2)}"
        ai_res = await asyncio.to_thread(_generate_with_gemini, prompt)
        summary_text = ai_res if ai_res else _fallback_analysis(devices_data)
    else:
        summary_text = _fallback_analysis(devices_data)

    recommendations = [
        "Jaga utilisasi CPU router di bawah 75% untuk menjaga stabilitas routing.",
        "Pantau pemakaian memori perangkat core untuk mencegah kehabisan memori.",
        "Pastikan ambang batas alert aktif untuk mendapatkan notifikasi insiden seketika."
    ]

    return {
        "overall_health_score": avg_score,
        "summary": summary_text,
        "recommendations": recommendations,
        "devices": analyzed_devices
    }

async def analyze_device(device_data: Dict[str, Any]) -> Dict[str, Any]:
    score = _heuristic_health_score(device_data.get("metrics", {}))
    prompt = f"Analisis perangkat jaringan spesifik berikut secara teknis:\n\n{json.dumps(device_data, indent=2)}"
    ai_text = await asyncio.to_thread(_generate_with_gemini, prompt)
    if not ai_text:
        ai_text = _fallback_analysis(device_data)

    return {
        "device_id": device_data.get("id"),
        "health_score": score,
        "analysis": ai_text
    }

async def chat(message: str, context: Optional[str] = None) -> str:
    full_prompt = f"Konteks status jaringan saat ini:\n{context or 'Normal'}\n\nPertanyaan Operator NOC: {message}"
    reply = await asyncio.to_thread(_generate_with_gemini, full_prompt)
    if reply:
        return reply

    msg_lower = message.lower()
    if "cpu" in msg_lower or "beban" in msg_lower:
        return "[Mode Diagnostik Lokal] Beban CPU tinggi (>80%) umumnya dipicu oleh trafik routing tanpa FastTrack, aturan firewall yang tidak terindeks, atau proses antrean paket. Periksa `/tool profile` dan pastikan FastTrack aktif pada router MikroTik."
    if "memori" in msg_lower or "ram" in msg_lower:
        return "[Mode Diagnostik Lokal] Penggunaan memori tinggi pada router dapat disebabkan oleh tabel routing besar, cache DNS penuh, atau batas connection tracking. Periksa `/ip dns cache flush` dan evaluasi entri `/ip firewall connection`."
    if "troubleshoot" in msg_lower or "masalah" in msg_lower or "down" in msg_lower:
        return "[Mode Diagnostik Lokal] Langkah verifikasi link down:\n1. **Lapisan Fisik**: Cek status negosiasi port (`running=true/false`).\n2. **Uji Jalur**: Jalankan ping ICMP dari router ke gateway uplink.\n3. **Log Sistem**: Periksa halaman Syslog untuk pesan *link down* atau *interface flap*."
    return f"[Mode Diagnostik Lokal - Gemini API Belum Aktif] Pertanyaan diterima: \"{message}\". Saat ini layanan LLM eksternal belum dikonfigurasi di `.env`, namun Anda tetap dapat menanyakan panduan dasar terkait `cpu`, `memori`, atau `troubleshoot`."

async def analyze_traffic_anomaly(
    device_name: str,
    anomaly_type: str,
    severity: str,
    current_mbps: float,
    baseline_mbps: float,
    deviation_percent: float,
    interfaces: List[Dict[str, Any]] = []
) -> str:
    top_ifaces = [f"{i.get('name')} (rx: {i.get('rx_bytes', 0)}, tx: {i.get('tx_bytes', 0)})" for i in interfaces[:5]]
    iface_str = ", ".join(top_ifaces) if top_ifaces else "Tidak ada data interface spesifik"

    prompt = f"""Sebagai AI spesialis NOC, berikan analisis akar masalah (Root Cause Analysis - RCA) singkat dan terstruktur untuk insiden anomali trafik berikut:
- Perangkat: {device_name}
- Tipe Anomali: {anomaly_type} ({severity})
- Throughput Terdeteksi: {current_mbps} Mbps
- Rata-rata Baseline: {baseline_mbps} Mbps (Deviasi: {deviation_percent}%)
- Interface Terkait: {iface_str}

Format respons dengan 3 poin singkat:
1. **Dugaan Akar Masalah (RCA)**: Kemungkinan penyebab utama lonjakan/drop.
2. **Dampak Operasional**: Pengaruhnya terhadap jaringan klien/layanan.
3. **Tindakan Mitigasi Cepat**: 2-3 langkah praktis yang harus segera dilakukan operator NOC."""

    ai_res = await asyncio.to_thread(_generate_with_gemini, prompt)
    if ai_res:
        return ai_res.strip()

    if anomaly_type == "TRAFFIC_SPIKE":
        return (
            f"1. **Dugaan Akar Masalah (RCA)**: Lonjakan throughput ke {current_mbps} Mbps melebihi baseline ({baseline_mbps} Mbps) yang dapat dipicu oleh transfer data berkapasitas besar atau lonjakan trafik UDP/TCP pada uplink.\n"
            f"2. **Dampak Operasional**: Berpotensi meningkatkan latensi RTT dan antrean paket pada segmen jaringan lainnya.\n"
            f"3. **Tindakan Mitigasi Cepat**:\n"
            f"   - Periksa halaman Traffic Flow (Top Talkers) atau `/tool torch` untuk melihat IP dengan konsumsi tertinggi.\n"
            f"   - Terapkan pembatasan queue sementara bila trafik melampaui kapasitas link."
        )
    return (
        f"1. **Dugaan Akar Masalah (RCA)**: Penurunan trafik mendadak ke {current_mbps} Mbps (>80% di bawah baseline {baseline_mbps} Mbps) mengindikasikan gangguan pada link uplink atau perubahan rute default.\n"
        f"2. **Dampak Operasional**: Gangguan konektivitas bagi host yang melewati gateway {device_name}.\n"
        f"3. **Tindakan Mitigasi Cepat**:\n"
        f"   - Periksa status fisik port WAN (`running=true`).\n"
        f"   - Lakukan uji jalur ICMP ke gateway ISP dan periksa `/ip route print`."
    )
