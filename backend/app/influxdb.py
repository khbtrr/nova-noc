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

influx_db = InfluxDBManager()
