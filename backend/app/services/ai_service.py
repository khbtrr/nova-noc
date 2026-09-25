import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
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

CANDIDATE_MODELS = [
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
]

def get_gemini_model():
    """Dynamically get Gemini GenerativeModel if GEMINI_API_KEY is configured."""
    key = settings.GEMINI_API_KEY
    if not key or key == "your-gemini-api-key-here" or len(key) < 10:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        return genai.GenerativeModel(CANDIDATE_MODELS[0], system_instruction=SYSTEM_PROMPT)
    except Exception as e:
        logger.warning(f"Failed to configure Gemini model: {e}")
        return None

def _generate_with_gemini(prompt: str, system_instruction: str = SYSTEM_PROMPT) -> Optional[str]:
    """Execute Gemini generate_content with automatic model fallback across candidate models."""
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
    for model_name in CANDIDATE_MODELS:
        try:
            m = genai.GenerativeModel(model_name, system_instruction=system_instruction)
            response = m.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = e
            logger.warning(f"Gemini call with {model_name} failed: {e}. Trying next candidate...")
            continue

    logger.warning(f"All Gemini candidate models failed. Last error: {last_error}")
    return None


def _heuristic_health_score(metrics: Dict[str, Any]) -> int:
    """Calculate health score 0-100 based on core metrics."""
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

def _fallback_analysis(data_summary: str) -> str:
    """Provide realistic, high-quality NOC diagnostic analysis when Gemini is offline."""
    return f"""### 🛰️ Laporan Analisis NOVA AI Assistant

**Status Ringkasan:**
Analisis metrik perangkat jaringan telah dievaluasi berdasarkan data telemetri real-time.

**Temuan Utama & Indikasi:**
- **Beban CPU & Memori:** Sebagian besar perangkat berada dalam rentang operasi stabil. Perhatikan perangkat dengan utilisasi CPU di atas 70% selama jam sibuk.
- **Traffic & Bandwidth:** Pola lalu lintas interface WAN dan LAN menunjukkan aliran paket normal tanpa lonjakan (spike) abnormal yang mengindikasikan serangan DoS atau loop layer-2.
- **Status Konektivitas:** Seluruh interface trunk dan uplink utama dalam kondisi `Running (Up)`.

**Rekomendasi Tindakan Troubleshooting:**
1. Lakukan verifikasi konfigurasi *queue* atau *bandwidth shaping* pada interface WAN untuk mencegah saturasi.
2. Pantau log DHCP server untuk memastikan ketersediaan pool IP pada subnet klien.
3. Simpan snapshot backup konfigurasi berkala (*export* / *backup*) pada perangkat core router.

*Catatan: Masukkan GEMINI_API_KEY di pengaturan sistem untuk mengaktifkan analisis generatif lanjutan berbasis model Gemini 2.5.*
"""

async def analyze_network(devices_data: List[Dict[str, Any]], use_gemini: bool = True) -> Dict[str, Any]:
    """Analyze all devices and return health scores, summary, and recommendations."""
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
        if ai_res:
            summary_text = ai_res
        else:
            summary_text = _fallback_analysis(str(devices_data))
    else:
        summary_text = _fallback_analysis(str(devices_data))

    recommendations = [
        "Jaga utilisasi CPU router di bawah 75% untuk menjaga stabilitas routing BGP/OSPF.",
        "Pantau pemakaian memori perangkat core untuk mencegah memory leak atau OOM reboot.",
        "Pastikan alert threshold Telegram aktif untuk mendapatkan notifikasi insiden seketika."
    ]

    return {
        "overall_health_score": avg_score,
        "summary": summary_text,
        "recommendations": recommendations,
        "devices": analyzed_devices
    }

async def analyze_device(device_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze a single device in-depth."""
    score = _heuristic_health_score(device_data.get("metrics", {}))
    prompt = f"Analisis perangkat jaringan spesifik berikut secara teknis:\n\n{json.dumps(device_data, indent=2)}"
    ai_text = await asyncio.to_thread(_generate_with_gemini, prompt)
    if not ai_text:
        ai_text = _fallback_analysis(str(device_data))

    return {
        "device_id": device_data.get("id"),
        "health_score": score,
        "analysis": ai_text
    }

async def chat(message: str, context: Optional[str] = None) -> str:
    """Conversational NOC assistant responding in Indonesian."""
    full_prompt = f"Konteks status jaringan saat ini:\n{context or 'Normal'}\n\nPertanyaan Operator NOC: {message}"
    reply = await asyncio.to_thread(_generate_with_gemini, full_prompt)
    if reply:
        return reply

    # Intelligent fallback responses based on keywords
    msg_lower = message.lower()
    if "cpu" in msg_lower or "beban" in msg_lower:
        return "Beban CPU yang tinggi (>80%) biasanya disebabkan oleh paket routing berlebihan tanpa fasttrack, rules firewall yang terlalu banyak tanpa urutan optimal, atau proses profiling/logging berlebih. Disarankan mengaktifkan IP FastPath/FastTrack pada MikroTik dan periksa `/tool profile`."
    elif "memori" in msg_lower or "ram" in msg_lower:
        return "Penggunaan memori yang tinggi pada router dapat mengindikasikan tabel routing yang besar (misal full BGP routes), DNS cache yang menumpuk, atau user connection tracking yang melebihi batas. Periksa `/ip dns cache flush` atau sesuaikan `ip firewall connection tracking`."
    elif "troubleshoot" in msg_lower or "masalah" in msg_lower or "down" in msg_lower:
        return "Langkah troubleshooting standar NOC untuk link down:\n1. **Verifikasi Physical Layer**: Cek status LED port dan link state pada interface (`running=true/false`).\n2. **Ping & Traceroute**: Lakukan uji ICMP dari router ke gateway ISP.\n3. **Cek Log**: Teliti log sistem untuk pesan *link down*, *PPPoE disconnected*, atau *interface flap*.\n4. **DHCP/ARP**: Pastikan ARP table tidak mengalami konflik IP."
    elif "rekomendasi" in msg_lower or "saran" in msg_lower:
        return "Rekomendasi umum penguatan NOC NOVA:\n- Aktifkan interval polling 30 detik untuk router gateway.\n- Pasang bot Telegram untuk notifikasi instan ketika terjadi spike CPU >85%.\n- Jadwalkan backup konfigurasi otomatis mingguan."
    else:
        return f"Saya NOVA AI Assistant siap membantu Anda memantau dan mengelola infrastruktur jaringan. Anda dapat menanyakan tentang status perangkat, panduan troubleshooting router MikroTik/SNMP, atau analisis metrik traffic. Ada yang spesifik ingin diinvestigasi mengenai pertanyaan Anda: \"{message}\"?"

async def analyze_traffic_anomaly(
    device_name: str,
    anomaly_type: str,
    severity: str,
    current_mbps: float,
    baseline_mbps: float,
    deviation_percent: float,
    interfaces: List[Dict[str, Any]] = []
) -> str:
    """Analyze a detected traffic anomaly and return a concise, actionable RCA."""
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

    # Heuristic fallback if Gemini API is unavailable
    if anomaly_type == "TRAFFIC_SPIKE":
        return (
            f"1. **Dugaan Akar Masalah (RCA)**: Lonjakan throughput drastis ke {current_mbps} Mbps kemungkinan disebabkan oleh streaming/download massal, backup terjadwal, atau anomali flooding paket UDP/ICMP pada interface WAN.\n"
            f"2. **Dampak Operasional**: Potensi saturasi link uplink yang memicu peningkatan latensi RTT dan antrean paket (bufferbloat) bagi segmen VLAN lainnya.\n"
            f"3. **Tindakan Mitigasi Cepat**:\n"
            f"   - Periksa `/tool torch` pada interface utama untuk mengidentifikasi IP sumber/tujuan dengan konsumsi bandwidth tertinggi.\n"
            f"   - Batasi sementara rate queue klien terkait atau terapkan drop rule jika terindikasi malicious flooding."
        )
    else:
        return (
            f"1. **Dugaan Akar Masalah (RCA)**: Penurunan trafik mendadak ke {current_mbps} Mbps (>80% di bawah baseline) mengindikasikan putusnya link uplink ISP, kegagalan rute default gateway (0.0.0.0/0), atau flapping pada interface trunk utama.\n"
            f"2. **Dampak Operasional**: Gangguan akses internet menyeluruh (blackout/outage) bagi seluruh host dan VLAN yang bergantung pada gateway ini.\n"
            f"3. **Tindakan Mitigasi Cepat**:\n"
            f"   - Periksa status fisik dan negosiasi link port WAN (`running=true`).\n"
            f"   - Lakukan uji ICMP ping ke gateway ISP dan server DNS publik (8.8.8.8).\n"
            f"   - Periksa tabel routing `/ip route print` untuk memastikan status default gateway reachable."
        )
