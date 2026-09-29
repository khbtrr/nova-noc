from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from app.config import settings

class InfluxDBManager:
    def __init__(self):
        self.client = InfluxDBClient(url=settings.INFLUXDB_URL, token=settings.INFLUXDB_TOKEN, org=settings.INFLUXDB_ORG)
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.client.query_api()

    def write_metrics(self, device_id: str, device_name: str, host: str, metrics: dict):
        point = Point("device_metrics").tag("device_id", device_id).tag("device_name", device_name).tag("host", host)
        for k, v in metrics.items():
            if v is not None:
                point.field(k, float(v) if isinstance(v, (int, float)) else v)
        self.write_api.write(bucket=settings.INFLUXDB_BUCKET, record=point)

    def query_metrics(self, device_id: str, time_range: str = "-1h"):
        query = f'''
        from(bucket: "{settings.INFLUXDB_BUCKET}")
          |> range(start: {time_range})
          |> filter(fn: (r) => r._measurement == "device_metrics" and r.device_id == "{device_id}")
        '''
        return self.query_api.query(query)

    def query_metrics_history(self, device_id: str, range_str: str = "1h") -> dict:
        downsample_map = {
            "1h": ("-1h", "1m"),
            "6h": ("-6h", "5m"),
            "24h": ("-24h", "15m"),
            "7d": ("-7d", "1h"),
            "30d": ("-30d", "4h"),
        }
        start_time, window = downsample_map.get(range_str, ("-1h", "1m"))
        query = f'''
        from(bucket: "{settings.INFLUXDB_BUCKET}")
          |> range(start: {start_time})
          |> filter(fn: (r) => r._measurement == "device_metrics" and r.device_id == "{device_id}")
          |> aggregateWindow(every: {window}, fn: mean, createEmpty: false)
          |> yield(name: "mean")
        '''
        tables = self.query_api.query(query)
        data_by_time = {}
        for table in tables:
            for record in table.records:
                record_time = record.get_time()
                if not record_time:
                    continue
                ts_str = record_time.isoformat()
                if ts_str not in data_by_time:
                    data_by_time[ts_str] = {}
                field = record.get_field()
                val = record.get_value()
                if val is not None:
                    data_by_time[ts_str][field] = float(val)

        sorted_timestamps = sorted(data_by_time.keys())
        timestamps = []
        cpu = []
        memory = []
        rx = []
        tx = []
        latency = []
        packet_loss = []
        wan_latency = []
        wan_packet_loss = []
        jlm_latency = []
        jlm_packet_loss = []
        ion_latency = []
        ion_packet_loss = []

        for t in sorted_timestamps:
            row = data_by_time[t]
            timestamps.append(t)
            cpu.append(round(row.get("cpu_load", 0.0), 2))
            memory.append(round(row.get("memory_usage", 0.0), 2))
            rx.append(round(row.get("rx_kbps", 0.0), 2))
            tx.append(round(row.get("tx_kbps", 0.0), 2))
            latency.append(round(row.get("latency_ms", 0.0), 2))
            packet_loss.append(round(row.get("packet_loss", 0.0), 2))
            wan_latency.append(round(row.get("wan_latency_ms", 0.0), 2))
            wan_packet_loss.append(round(row.get("wan_packet_loss", 0.0), 2))
            jlm_latency.append(round(row.get("jlm_latency_ms", 0.0), 2))
            jlm_packet_loss.append(round(row.get("jlm_packet_loss", 0.0), 2))
            ion_latency.append(round(row.get("ion_latency_ms", 0.0), 2))
            ion_packet_loss.append(round(row.get("ion_packet_loss", 0.0), 2))

        return {
            "device_id": int(device_id) if device_id.isdigit() else device_id,
            "timestamps": timestamps,
            "cpu": cpu,
            "memory": memory,
            "rx": rx,
            "tx": tx,
            "latency": latency,
            "packet_loss": packet_loss,
            "wan_latency": wan_latency,
            "wan_packet_loss": wan_packet_loss,
            "jlm_latency": jlm_latency,
            "jlm_packet_loss": jlm_packet_loss,
            "ion_latency": ion_latency,
            "ion_packet_loss": ion_packet_loss,
        }

influx_db = InfluxDBManager()
