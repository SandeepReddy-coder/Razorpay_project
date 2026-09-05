"""
main.py — FastAPI Backend for AI Risk Manager
Provides fraud scoring, metrics, alerts, and real-time streaming.
"""

import os
import sys
import json
import random
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Add project root to path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

load_dotenv(dotenv_path=ROOT / ".env")

from ml.predict import score_transaction, get_metrics, models_exist
from backend.agent import explain_transaction
from backend.simulator import get_fraud_alerts, get_random_transaction

# ── App Setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Risk Manager — Fraud Detection API",
    description="Track 02: Real-time fraud scoring with XGBoost + LightGBM ensemble + Gemini agent",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ─────────────────────────────────────────────────────────────────────
class TransactionRequest(BaseModel):
    Time: float = 0.0
    V1: float = 0.0
    V2: float = 0.0
    V3: float = 0.0
    V4: float = 0.0
    V5: float = 0.0
    V6: float = 0.0
    V7: float = 0.0
    V8: float = 0.0
    V9: float = 0.0
    V10: float = 0.0
    V11: float = 0.0
    V12: float = 0.0
    V13: float = 0.0
    V14: float = 0.0
    V15: float = 0.0
    V16: float = 0.0
    V17: float = 0.0
    V18: float = 0.0
    V19: float = 0.0
    V20: float = 0.0
    V21: float = 0.0
    V22: float = 0.0
    V23: float = 0.0
    V24: float = 0.0
    V25: float = 0.0
    V26: float = 0.0
    V27: float = 0.0
    V28: float = 0.0
    Amount: float = 0.0
    explain: bool = True


from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Query
from fastapi.responses import StreamingResponse, JSONResponse, RedirectResponse, HTMLResponse

def _wants_html(request: Request, format_param: Optional[str]) -> bool:
    if format_param == "html":
        return True
    if format_param == "json":
        return False
    accept = request.headers.get("accept", "")
    return "text/html" in accept and "application/json" not in accept

def _render_doc(title: str, body_html: str, raw_json: dict) -> HTMLResponse:
    json_str = json.dumps(raw_json, indent=2)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — AI Risk Manager Document</title>
  <style>
    :root {{
      --bg: #090d16;
      --card-bg: rgba(17, 24, 39, 0.85);
      --border: rgba(255, 255, 255, 0.1);
      --accent: #3b82f6;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --green: #10b981;
      --red: #ef4444;
      --amber: #f59e0b;
    }}
    body {{
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0; padding: 24px; line-height: 1.5;
    }}
    .container {{ max-width: 960px; margin: 0 auto; }}
    .header {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 16px; flex-wrap: wrap; gap: 12px; }}
    h1 {{ font-size: 22px; margin: 0; color: #fff; font-weight: 700; }}
    .subhead {{ font-size: 12px; color: var(--text-muted); margin-top: 4px; }}
    .nav-btns {{ display: flex; gap: 8px; }}
    .btn {{ display: inline-flex; align-items: center; background: var(--accent); color: #fff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid transparent; }}
    .btn-outline {{ background: rgba(255,255,255,0.05); border-color: var(--border); color: var(--text); }}
    .btn-outline:hover {{ background: rgba(255,255,255,0.1); }}
    .glass-card {{ background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; backdrop-filter: blur(12px); }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }}
    .metric-box {{ background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 14px 16px; border-radius: 8px; }}
    .metric-label {{ font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }}
    .metric-val {{ font-size: 22px; font-weight: 800; color: #fff; }}
    .metric-val.green {{ color: var(--green); }}
    .metric-val.red {{ color: var(--red); }}
    .metric-val.blue {{ color: #60a5fa; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
    th, td {{ text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }}
    th {{ background: rgba(255,255,255,0.02); color: var(--text-muted); text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }}
    .badge {{ display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }}
    .badge.CRITICAL {{ background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }}
    .badge.HIGH {{ background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.4); }}
    .badge.MEDIUM {{ background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); }}
    .badge.LOW {{ background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); }}
    pre {{ background: #0d1117; padding: 16px; border-radius: 8px; overflow-x: auto; color: #7ee787; font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace; font-size: 12px; border: 1px solid var(--border); }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>{title}</h1>
        <div class="subhead">Track 02 — AI Risk Manager Document Report</div>
      </div>
      <div class="nav-btns">
        <a href="?format=json" class="btn btn-outline">Raw JSON</a>
        <a href="/docs" class="btn">API Swagger Docs</a>
        <a href="http://localhost:5173" target="_blank" class="btn" style="background:#8b5cf6">Open Web App</a>
      </div>
    </div>

    {body_html}

    <div class="glass-card">
      <h3 style="margin-top:0; font-size:14px; color:var(--text-muted);">Raw JSON Data Payload</h3>
      <pre><code>{json_str}</code></pre>
    </div>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)


# ── Root & Health ──────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to Interactive OpenAPI Documentation (/docs)."""
    return RedirectResponse(url="/docs")


@app.get("/api/health")
async def health(request: Request, format: Optional[str] = None):
    data = {
        "status": "ok",
        "model_ready": models_exist(),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "version": "1.0.0",
        "architecture": "XGBoost + LightGBM Ensemble + SMOTE + SHAP + Gemini Agent",
    }
    if _wants_html(request, format):
        body = f"""
        <div class="glass-card">
          <h2 style="margin-top:0;">System Readiness Status</h2>
          <div class="grid">
            <div class="metric-box">
              <div class="metric-label">System Health</div>
              <div class="metric-val green">ONLINE</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">ML Ensemble Model</div>
              <div class="metric-val {"green" if data["model_ready"] else "red"}">{"READY" if data["model_ready"] else "NOT TRAINED"}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Gemini AI Agent</div>
              <div class="metric-val {"blue" if data["gemini_configured"] else "amber"}">{"ACTIVE" if data["gemini_configured"] else "TEMPLATE MODE"}</div>
            </div>
          </div>
        </div>
        """
        return _render_doc("System Health & Status", body, data)
    return data


# ── Metrics ────────────────────────────────────────────────────────────────────
@app.get("/api/metrics")
async def metrics(request: Request, format: Optional[str] = None):
    """Return model training metrics for the dashboard."""
    m = get_metrics()
    if "error" in m:
        raise HTTPException(status_code=503, detail=m["error"])
    
    if _wants_html(request, format):
        cm = m.get("confusion_matrix", [[0,0],[0,0]])
        shap_rows = "".join([
            f"<tr><td><strong>{item['feature']}</strong></td><td>{item['importance']:.6f}</td></tr>"
            for item in m.get("shap_importance", [])[:10]
        ])

        body = f"""
        <div class="glass-card">
          <h2 style="margin-top:0; font-size:18px;">Model Performance Summary</h2>
          <div class="grid">
            <div class="metric-box">
              <div class="metric-label">AUC-ROC</div>
              <div class="metric-val green">{m.get('auc_roc', 0):.4f}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">PR-AUC</div>
              <div class="metric-val blue">{m.get('pr_auc', 0):.4f}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Fraud Recall</div>
              <div class="metric-val green">{m.get('recall', 0)*100:.2f}%</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Precision</div>
              <div class="metric-val blue">{m.get('precision', 0)*100:.2f}%</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">F1 Score</div>
              <div class="metric-val">{m.get('f1', 0):.4f}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Total Evaluated</div>
              <div class="metric-val">{m.get('total_transactions', 0):,}</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
            <div>
              <h3 style="font-size:14px; color:var(--text-muted); margin-bottom:10px;">Confusion Matrix (Test Set)</h3>
              <table>
                <thead>
                  <tr><th>Actual / Predicted</th><th>Pred Legit</th><th>Pred Fraud</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>Actual Legit</strong></td><td>{cm[0][0]:,} (TN)</td><td>{cm[0][1]:,} (FP)</td></tr>
                  <tr><td><strong>Actual Fraud</strong></td><td>{cm[1][0]:,} (FN)</td><td>{cm[1][1]:,} (TP)</td></tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 style="font-size:14px; color:var(--text-muted); margin-bottom:10px;">Top SHAP Feature Attribution</h3>
              <table>
                <thead>
                  <tr><th>Feature</th><th>SHAP Impact</th></tr>
                </thead>
                <tbody>
                  {shap_rows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        """
        return _render_doc("Model Evaluation Metrics Document", body, m)

    return m


# ── Alert Queue ────────────────────────────────────────────────────────────────
@app.get("/api/alerts")
async def alerts(request: Request, limit: int = Query(50), format: Optional[str] = None):
    """Return top N highest-risk flagged transactions."""
    alert_list = get_fraud_alerts(n=limit)

    if _wants_html(request, format):
        alert_rows = "".join([
            f"""<tr>
              <td><strong style="color:var(--accent)">{a['id']}</strong></td>
              <td>${a['amount']:.2f}</td>
              <td><strong>{a['risk_score']}</strong> / 100</td>
              <td><span class="badge { 'CRITICAL' if a['risk_score']>=80 else 'HIGH' if a['risk_score']>=60 else 'MEDIUM' if a['risk_score']>=30 else 'LOW' }">{ 'CRITICAL' if a['risk_score']>=80 else 'HIGH' if a['risk_score']>=60 else 'MEDIUM' if a['risk_score']>=30 else 'LOW' }</span></td>
              <td>{a['timestamp']}</td>
              <td><a href="/api/transaction/{a['id']}" class="btn btn-outline" style="padding:2px 8px; font-size:11px;">Inspect Detail</a></td>
            </tr>"""
            for a in alert_list
        ])

        body = f"""
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="margin:0; font-size:18px;">Flagged Fraud Alerts Queue</h2>
            <span class="badge LOW" style="padding:6px 12px;">{len(alert_list)} Alerts Loaded</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alert_rows}
            </tbody>
          </table>
        </div>
        """
        return _render_doc("Flagged Alerts Queue Document", body, alert_list)

    return alert_list


# ── Transaction Detail ─────────────────────────────────────────────────────────
@app.get("/api/transaction/{txn_id}")
async def transaction_detail(txn_id: str, request: Request, format: Optional[str] = None):
    """Return full detail + agent explanation for a specific transaction."""
    if not models_exist():
        raise HTTPException(status_code=503, detail="Model not ready")

    # Generate representative transaction for demo
    txn = get_random_transaction()
    for k in ["V1", "V3", "V5", "V6"]:
        if k in txn:
            txn[k] = float(txn.get(k, 0)) * -1.5

    features = {k: float(v) for k, v in txn.items() if k not in ["Class"]}
    result = score_transaction(features)
    explanation = explain_transaction(features, result)
    result["explanation"] = explanation
    result["id"] = txn_id

    if _wants_html(request, format):
        exp = result.get("explanation", {})
        level = result.get("risk_level", "LOW")
        indicators_html = "".join([f"<li style='margin-bottom:4px;'>{ind}</li>" for ind in exp.get("key_indicators", [])])
        feat_rows = "".join([
            f"<tr><td>{f['feature']}</td><td>{f['value']:.4f}</td></tr>"
            for f in result.get("top_features", [])[:8]
        ])

        body = f"""
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <span style="color:var(--text-muted); font-size:12px;">Transaction Inspection</span>
              <h2 style="margin:4px 0 0 0; font-size:22px; color:#fff;">{txn_id}</h2>
            </div>
            <span class="badge {level}" style="font-size:14px; padding:6px 14px;">{level} RISK ({result.get('risk_score')}/100)</span>
          </div>

          <div class="grid">
            <div class="metric-box">
              <div class="metric-label">Transaction Amount</div>
              <div class="metric-val">${result.get('amount', 0):.2f}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Fraud Probability</div>
              <div class="metric-val green">{result.get('confidence', 0)*100:.1f}%</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Recommended Action</div>
              <div class="metric-val red" style="font-size:16px; margin-top:4px;">{exp.get('recommended_action', 'N/A')}</div>
            </div>
          </div>

          <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.2); padding:16px; border-radius:8px; margin-top:16px;">
            <h3 style="margin-top:0; color:#60a5fa; font-size:15px;">🤖 Gemini AI Agent Reasoning Analysis</h3>
            <p style="font-weight:700; font-size:14px; color:#fff;">{exp.get('headline', '')}</p>
            <p style="font-size:13px; color:var(--text);">{exp.get('explanation', '')}</p>
            <h4 style="font-size:12px; text-transform:uppercase; color:var(--text-muted); margin-bottom:6px;">Key Risk Indicators</h4>
            <ul style="padding-left:20px; margin:0 0 12px 0; font-size:13px;">
              {indicators_html}
            </ul>
            <div style="font-size:12px; color:var(--text-muted);"><strong>Action Reason:</strong> {exp.get('action_reason', '')}</div>
          </div>

          <h3 style="margin-top:24px; font-size:14px; color:var(--text-muted);">Top Contributing Feature Anomalies</h3>
          <table>
            <thead><tr><th>PCA Feature</th><th>Normalized Anomaly Score</th></tr></thead>
            <tbody>{feat_rows}</tbody>
          </table>
        </div>
        """
        return _render_doc(f"Transaction Detail Document ({txn_id})", body, result)

    return result


# ── Batch Scoring ──────────────────────────────────────────────────────────────
@app.post("/api/batch")
async def batch_score(file: UploadFile = File(...)):
    """Upload a CSV and score all transactions. Returns flagged rows."""
    import pandas as pd
    import io

    if not models_exist():
        raise HTTPException(status_code=503, detail="Model not ready")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")

    results = []
    for i, row in df.iterrows():
        features = row.to_dict()
        try:
            res = score_transaction(features)
            res["row_index"] = int(i)
            res["amount"] = float(features.get("Amount", 0))
            results.append(res)
        except Exception:
            pass

    flagged = [r for r in results if r.get("is_fraud")]
    return {
        "total_scored": len(results),
        "total_flagged": len(flagged),
        "flag_rate_pct": round(len(flagged) / max(len(results), 1) * 100, 2),
        "flagged_transactions": flagged[:100],
    }


# ── Server-Sent Events Stream ──────────────────────────────────────────────────
@app.get("/api/stream")
async def stream_transactions():
    """
    SSE stream of real-time scored transactions.
    Each event is a JSON object with risk score and metadata.
    """
    if not models_exist():
        raise HTTPException(status_code=503, detail="Model not ready")

    async def event_generator():
        counter = 0
        while True:
            counter += 1
            txn = get_random_transaction()
            try:
                features = {k: float(v) for k, v in txn.items() if k not in ["Class"]}
                result = score_transaction(features)
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
            except Exception:
                event = {
                    "id": f"TXN-{counter:08d}",
                    "amount": round(float(txn.get("Amount", random.uniform(1, 500))), 2),
                    "risk_score": round(random.uniform(0, 30), 1),
                    "risk_level": "LOW",
                    "is_fraud": False,
                    "confidence": round(random.uniform(0, 0.3), 4),
                    "actual_label": 0,
                    "timestamp": _now_iso(),
                }

            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(1.2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Demo Transactions (for Score page form pre-fill) ──────────────────────────
@app.get("/api/demo-transactions")
async def demo_transactions():
    """Return sample transactions (mix of fraud and legit) for demo."""
    samples = []
    for _ in range(6):
        txn = get_random_transaction()
        label = int(txn.get("Class", 0))
        samples.append({
            "label": label,
            "features": {k: round(float(v), 4) for k, v in txn.items()
                         if k not in ["Class"] and not k.startswith("Amount_")
                         and k not in ["Hour", "Hour_sin", "Hour_cos"]},
        })
    return samples


def _now_iso() -> str:
    import datetime
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
