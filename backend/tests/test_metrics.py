import pytest
from app.services.metrics_service import (
    update_device_snapshot,
    get_current_metrics,
    get_metrics_history,
    get_device_interfaces
)

def test_metrics_snapshot_and_history():
    dev_id = 999
    update_device_snapshot(dev_id, {
        "device_id": dev_id,
        "cpu_load": 33.5,
        "memory_usage": 55.0,
        "rx_kbps": 2048.0,
        "tx_kbps": 1024.0,
    })

    current = get_current_metrics(dev_id)
    assert current is not None
    assert current["cpu_load"] == 33.5
    assert current["memory_usage"] == 55.0

    history = get_metrics_history(dev_id)
    assert history["device_id"] == dev_id
    assert len(history["cpu"]) >= 1
    assert 33.5 in history["cpu"]

def test_device_interfaces():
    ifaces = get_device_interfaces(1)
    assert isinstance(ifaces, list)
    assert len(ifaces) > 0
    assert "name" in ifaces[0]
