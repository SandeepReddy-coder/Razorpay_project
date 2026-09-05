"""
Track 02 — AI Risk Manager
ML Training Pipeline: XGBoost + LightGBM Ensemble with SMOTE
Dataset: ULB Credit Card Fraud Detection (284,807 transactions)
"""

import os
import json
import time
import warnings
import joblib
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from pathlib import Path
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score,
    confusion_matrix, roc_curve, precision_recall_curve,
    classification_report
)
from sklearn.ensemble import VotingClassifier
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTETomek
import xgboost as xgb
import lightgbm as lgb

warnings.filterwarnings("ignore")

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR.parent / "data" / "creditcard.csv"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

print("=" * 60)
print("  Track 02 — AI Risk Manager: Training Pipeline")
print("=" * 60)

# ── 1. Load Data ───────────────────────────────────────────────────────────────
print("\n[1/7] Loading dataset...")
t0 = time.time()
df = pd.read_csv(DATA_PATH)
print(f"      Loaded {len(df):,} transactions in {time.time()-t0:.1f}s")
print(f"      Fraud rate: {df['Class'].mean()*100:.3f}%  ({df['Class'].sum()} frauds)")

# ── 2. Feature Engineering ─────────────────────────────────────────────────────
print("\n[2/7] Feature engineering...")
# Normalize Amount and Time
df["Amount_scaled"] = np.log1p(df["Amount"])
df["Hour"] = (df["Time"] % 86400) / 3600  # Hour of day (cyclic)
df["Hour_sin"] = np.sin(2 * np.pi * df["Hour"] / 24)
df["Hour_cos"] = np.cos(2 * np.pi * df["Hour"] / 24)

feature_cols = [c for c in df.columns if c not in ["Time", "Class", "Amount", "Hour"]]
feature_cols += ["Amount_scaled", "Hour_sin", "Hour_cos"]

X = df[feature_cols].values
y = df["Class"].values

# ── 3. Train/Test Split ────────────────────────────────────────────────────────
print("\n[3/7] Splitting data (80/20 stratified)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"      Train: {len(X_train):,} | Test: {len(X_test):,}")
print(f"      Train frauds: {y_train.sum()} | Test frauds: {y_test.sum()}")

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ── 4. SMOTE Oversampling ──────────────────────────────────────────────────────
print("\n[4/7] Applying SMOTE oversampling...")
t0 = time.time()
smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X_train_scaled, y_train)
print(f"      Resampled in {time.time()-t0:.1f}s: {len(X_resampled):,} samples")
print(f"      Fraud in resampled: {y_resampled.sum():,} ({y_resampled.mean()*100:.1f}%)")

# ── 5. Train Models ────────────────────────────────────────────────────────────
print("\n[5/7] Training XGBoost + LightGBM ensemble...")
scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

xgb_model = xgb.XGBClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=scale_pos_weight,
    eval_metric="aucpr",
    tree_method="hist",
    random_state=42,
    n_jobs=-1,
    verbosity=0,
)

lgb_model = lgb.LGBMClassifier(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=scale_pos_weight,
    random_state=42,
    n_jobs=-1,
    verbose=-1,
)

t0 = time.time()
xgb_model.fit(X_resampled, y_resampled)
print(f"      XGBoost trained in {time.time()-t0:.1f}s")

t0 = time.time()
lgb_model.fit(X_resampled, y_resampled)
print(f"      LightGBM trained in {time.time()-t0:.1f}s")

# ── 6. Evaluate ────────────────────────────────────────────────────────────────
print("\n[6/7] Evaluating ensemble on test set...")

# Soft-vote ensemble (average probabilities)
xgb_proba = xgb_model.predict_proba(X_test_scaled)[:, 1]
lgb_proba = lgb_model.predict_proba(X_test_scaled)[:, 1]
ensemble_proba = (xgb_proba * 0.5 + lgb_proba * 0.5)

# Use threshold 0.5 for labels
y_pred = (ensemble_proba >= 0.5).astype(int)

precision = precision_score(y_test, y_pred, zero_division=0)
recall    = recall_score(y_test, y_pred, zero_division=0)
f1        = f1_score(y_test, y_pred, zero_division=0)
auc_roc   = roc_auc_score(y_test, ensemble_proba)
pr_auc    = average_precision_score(y_test, ensemble_proba)
cm        = confusion_matrix(y_test, y_pred).tolist()

print(f"\n      +-------------------------------------+")
print(f"      |  Precision : {precision:.4f}                |")
print(f"      |  Recall    : {recall:.4f}                |")
print(f"      |  F1 Score  : {f1:.4f}                |")
print(f"      |  AUC-ROC   : {auc_roc:.4f}                |")
print(f"      |  PR-AUC    : {pr_auc:.4f}                |")
print(f"      +-------------------------------------+")
print(f"\n{classification_report(y_test, y_pred, target_names=['Legit','Fraud'])}")

# ROC Curve data
fpr, tpr, roc_thresholds = roc_curve(y_test, ensemble_proba)
prec_curve, rec_curve, pr_thresholds = precision_recall_curve(y_test, ensemble_proba)

# ── 7. SHAP Values ─────────────────────────────────────────────────────────────
print("[7/7] Computing SHAP values (sample of 500)...")
t0 = time.time()
explainer = shap.TreeExplainer(xgb_model)
# Use a small representative sample
sample_idx = np.random.choice(len(X_test_scaled), min(500, len(X_test_scaled)), replace=False)
shap_values = explainer.shap_values(X_test_scaled[sample_idx])
mean_shap = np.abs(shap_values).mean(axis=0).tolist()
print(f"      SHAP computed in {time.time()-t0:.1f}s")

# Feature importance from SHAP
shap_importance = dict(zip(feature_cols, mean_shap))
top_features = sorted(shap_importance.items(), key=lambda x: x[1], reverse=True)[:15]

# ── Save Artifacts ─────────────────────────────────────────────────────────────
print("\nSaving model artifacts...")
joblib.dump(xgb_model, ARTIFACTS_DIR / "xgb_model.pkl")
joblib.dump(lgb_model, ARTIFACTS_DIR / "lgb_model.pkl")
joblib.dump(scaler, ARTIFACTS_DIR / "scaler.pkl")

# Save feature column names
with open(ARTIFACTS_DIR / "feature_cols.json", "w") as f:
    json.dump(feature_cols, f)

# Save metrics for dashboard
metrics = {
    "precision": round(float(precision), 4),
    "recall": round(float(recall), 4),
    "f1": round(float(f1), 4),
    "auc_roc": round(float(auc_roc), 4),
    "pr_auc": round(float(pr_auc), 4),
    "confusion_matrix": cm,
    "total_transactions": int(len(df)),
    "total_frauds": int(df["Class"].sum()),
    "fraud_rate_pct": round(float(df["Class"].mean() * 100), 4),
    "roc_curve": {
        "fpr": [round(float(x), 6) for x in fpr[::10]],
        "tpr": [round(float(x), 6) for x in tpr[::10]],
    },
    "pr_curve": {
        "precision": [round(float(x), 6) for x in prec_curve[::10]],
        "recall": [round(float(x), 6) for x in rec_curve[::10]],
    },
    "shap_importance": [
        {"feature": k, "importance": round(float(v), 6)}
        for k, v in top_features
    ],
    "test_samples": {
        "scores": [round(float(x), 6) for x in ensemble_proba[:1000].tolist()],
        "labels": [int(x) for x in y_test[:1000].tolist()],
    },
}

with open(ARTIFACTS_DIR / "metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

# Save a sample of test transactions for the alert queue
test_df_sample = df.iloc[len(X_train):].copy().reset_index(drop=True)
test_df_sample["risk_score"] = (ensemble_proba * 100).round(1)
test_df_sample["predicted_fraud"] = y_pred
fraud_alerts = test_df_sample[test_df_sample["predicted_fraud"] == 1].head(100)
fraud_alerts.to_csv(ARTIFACTS_DIR / "fraud_alerts.csv", index=False)

print(f"\n[+] All artifacts saved to: {ARTIFACTS_DIR}")
print(f"[+] {len(fraud_alerts)} fraud alerts saved for dashboard")
print("\n[+] Training complete! Run the backend: uvicorn backend.main:app --reload")
