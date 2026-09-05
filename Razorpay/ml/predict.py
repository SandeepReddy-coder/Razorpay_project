"""
predict.py — Transaction Scoring Module
Loads trained XGBoost + LightGBM ensemble and scores individual transactions.
"""

import json
import joblib
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"

# ── Lazy-load models ───────────────────────────────────────────────────────────
_xgb_model = None
_lgb_model = None
_scaler = None
_feature_cols = None


def _load_models():
    global _xgb_model, _lgb_model, _scaler, _feature_cols
    if _xgb_model is None:
        _xgb_model = joblib.load(ARTIFACTS_DIR / "xgb_model.pkl")
        _lgb_model = joblib.load(ARTIFACTS_DIR / "lgb_model.pkl")
        _scaler = joblib.load(ARTIFACTS_DIR / "scaler.pkl")
        with open(ARTIFACTS_DIR / "feature_cols.json") as f:
            _feature_cols = json.load(f)
    return _xgb_model, _lgb_model, _scaler, _feature_cols


def score_transaction(features: dict) -> dict:
    """
    Score a single transaction.

    Parameters
    ----------
    features : dict
        Must contain V1–V28 (PCA), Amount, and Time fields.

    Returns
    -------
    dict with keys:
        risk_score      – 0–100 float
        is_fraud        – bool (threshold 0.5)
        confidence      – probability of fraud (0–1)
        risk_level      – "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
        top_features    – list of {feature, value, direction} for LLM agent
    """
    xgb_m, lgb_m, scaler, feature_cols = _load_models()

    # Build feature vector
    import numpy as np

    # Derived features
    amount = float(features.get("Amount", 0))
    time_val = float(features.get("Time", 0))
    amount_scaled = np.log1p(amount)
    hour = (time_val % 86400) / 3600
    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)

    # Build full feature dict
    feat_dict = dict(features)
    feat_dict["Amount_scaled"] = amount_scaled
    feat_dict["Hour_sin"] = hour_sin
    feat_dict["Hour_cos"] = hour_cos

    row = np.array([[feat_dict.get(c, 0.0) for c in feature_cols]])
    row_scaled = scaler.transform(row)

    # Ensemble probability
    xgb_p = xgb_m.predict_proba(row_scaled)[0, 1]
    lgb_p = lgb_m.predict_proba(row_scaled)[0, 1]
    confidence = float((xgb_p + lgb_p) / 2)
    risk_score = round(confidence * 100, 2)
    is_fraud = confidence >= 0.5

    # Risk level
    if risk_score >= 80:
        risk_level = "CRITICAL"
    elif risk_score >= 60:
        risk_level = "HIGH"
    elif risk_score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Top contributing features (simple magnitude-based for speed)
    v_features = {k: float(v) for k, v in features.items() if k.startswith("V")}
    sorted_feats = sorted(v_features.items(), key=lambda x: abs(x[1]), reverse=True)[:8]
    top_features = [
        {"feature": k, "value": round(v, 4), "direction": "↑" if v > 0 else "↓"}
        for k, v in sorted_feats
    ]

    return {
        "risk_score": risk_score,
        "is_fraud": is_fraud,
        "confidence": round(confidence, 4),
        "risk_level": risk_level,
        "top_features": top_features,
        "amount": amount,
    }


def get_metrics() -> dict:
    """Load saved training metrics."""
    metrics_path = ARTIFACTS_DIR / "metrics.json"
    if not metrics_path.exists():
        return {"error": "Model not trained yet. Run ml/train.py first."}
    with open(metrics_path) as f:
        return json.load(f)


def models_exist() -> bool:
    return (ARTIFACTS_DIR / "xgb_model.pkl").exists()
