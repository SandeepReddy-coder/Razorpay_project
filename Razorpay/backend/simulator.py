"""
simulator.py — Real-time Transaction Stream Simulator
Generates a live feed of transactions (mix of legitimate and fraudulent)
sampled from the ULB dataset for dashboard demonstration.
"""

import os
import sys
import csv
import json
import random
import time
import asyncio
import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_PATH = BASE_DIR / "data" / "creditcard.csv"
ARTIFACTS_DIR = BASE_DIR / "ml" / "artifacts"

# Cache loaded data
_transactions = None
_fraud_df = None


def _load_data():
    global _transactions, _fraud_df
    if _transactions is None:
        df = pd.read_csv(DATA_PATH)
        # Add derived features
        df["Amount_scaled"] = np.log1p(df["Amount"])
        df["Hour"] = (df["Time"] % 86400) / 3600
        df["Hour_sin"] = np.sin(2 * np.pi * df["Hour"] / 24)
        df["Hour_cos"] = np.cos(2 * np.pi * df["Hour"] / 24)

        fraud_df = df[df["Class"] == 1].reset_index(drop=True)
        legit_df = df[df["Class"] == 0].reset_index(drop=True)

        # Build a mixed pool: 5% fraud rate for interesting demo
        n_fraud = min(len(fraud_df), 500)
        n_legit = n_fraud * 19  # 19:1 ratio → 5% fraud rate
        n_legit = min(n_legit, len(legit_df))

        mixed = pd.concat([
            fraud_df.sample(n=n_fraud, random_state=42),
            legit_df.sample(n=n_legit, random_state=42),
        ]).sample(frac=1, random_state=42).reset_index(drop=True)

        _transactions = mixed.to_dict("records")
        _fraud_df = fraud_df.to_dict("records")
    return _transactions, _fraud_df


def get_random_transaction() -> dict:
    """Return a random transaction from the mixed pool."""
    transactions, _ = _load_data()
    return dict(random.choice(transactions))


# Dynamic in-memory alerts buffer populated by live stream & scoring
DYNAMIC_ALERTS = []

def get_fraud_alerts(n: int = 50) -> list[dict]:
    """Return top N high-risk alerts combining dynamic live stream alerts + saved artifacts."""
    combined = []
    
    # 1. Add dynamic live alerts
    for item in DYNAMIC_ALERTS:
        combined.append({
            "id": item.get("id", "TXN-LIVE"),
            "amount": round(float(item.get("amount", 0)), 2),
            "risk_score": round(float(item.get("risk_score", 75)), 1),
            "timestamp": item.get("timestamp", _now_iso()),
            "status": "PENDING",
            "label": int(item.get("actual_label", 1)),
        })

    # 2. Add saved artifact alerts
    alerts_path = ARTIFACTS_DIR / "fraud_alerts.csv"
    if alerts_path.exists():
        df = pd.read_csv(alerts_path)
        df = df.sort_values("risk_score", ascending=False).head(n)
        for i, row in df.iterrows():
            txn_id = f"TXN-{i:06d}"
            if not any(c["id"] == txn_id for c in combined):
                combined.append({
                    "id": txn_id,
                    "amount": round(float(row.get("Amount", 0)), 2),
                    "risk_score": round(float(row.get("risk_score", 75)), 1),
                    "timestamp": _fake_timestamp(i),
                    "status": "PENDING",
                    "label": int(row.get("Class", 1)),
                })

    # 3. Fallback if empty
    if not combined:
        _, fraud_records = _load_data()
        for i, txn in enumerate(fraud_records[:n]):
            combined.append({
                "id": f"TXN-{i:06d}",
                "amount": round(float(txn.get("Amount", 0)), 2),
                "risk_score": round(random.uniform(70, 99), 1),
                "timestamp": _fake_timestamp(i),
                "status": "PENDING",
                "label": 1,
            })

    return combined[:n]


def _fake_timestamp(offset: int) -> str:
    import datetime
    base = datetime.datetime(2024, 1, 15, 8, 0, 0)
    delta = datetime.timedelta(minutes=offset * 3)
    return (base + delta).strftime("%Y-%m-%dT%H:%M:%SZ")


async def transaction_stream(interval_seconds: float = 1.0):
    """
    Async generator yielding scored transactions for SSE.
    Each event is a dict with transaction data + risk score.
    """
    from ml.predict import score_transaction  # imported here to avoid circular

    transactions, _ = _load_data()
    idx = 0
    counter = 0

    while True:
        txn = dict(transactions[idx % len(transactions)])
        idx += 1
        counter += 1

        # Score the transaction
        try:
            result = score_transaction(txn)
        except Exception:
            result = {
                "risk_score": random.uniform(0, 100),
                "is_fraud": txn.get("Class", 0) == 1,
                "confidence": random.uniform(0, 1),
                "risk_level": random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
                "top_features": [],
                "amount": float(txn.get("Amount", 0)),
            }

        event = {
            "id": f"TXN-{counter:08d}",
            "amount": round(float(txn.get("Amount", 0)), 2),
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "is_fraud": result["is_fraud"],
            "confidence": result["confidence"],
            "actual_label": int(txn.get("Class", 0)),
            "timestamp": _now_iso(),
        }

        # If high-risk or fraud, push to dynamic alert buffer
        if event["risk_score"] >= 40 or event["is_fraud"] or event["risk_level"] in ["HIGH", "CRITICAL"]:
            DYNAMIC_ALERTS.insert(0, event)
            if len(DYNAMIC_ALERTS) > 100:
                DYNAMIC_ALERTS.pop()

        yield json.dumps(event)
        await asyncio.sleep(interval_seconds)


def _now_iso() -> str:
    import datetime
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
