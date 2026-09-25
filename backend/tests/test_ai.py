import pytest
from app.services.ai_service import _heuristic_health_score, _fallback_analysis

def test_heuristic_health_score_normal():
    metrics = {
        "cpu_load": 15.0,
        "memory_usage": 40.0,
        "interfaces": [{"name": "ether1", "running": True, "disabled": False}]
    }
    score = _heuristic_health_score(metrics)
    assert score >= 90

def test_heuristic_health_score_critical():
    metrics = {
        "cpu_load": 95.0,
        "memory_usage": 92.0,
        "interfaces": [
            {"name": "ether1", "running": False, "disabled": False},
            {"name": "ether2", "running": False, "disabled": False}
        ]
    }
    score = _heuristic_health_score(metrics)
    assert score < 50

def test_fallback_analysis_content():
    text = _fallback_analysis("test data")
    assert "NOVA AI" in text
    assert "Rekomendasi" in text
