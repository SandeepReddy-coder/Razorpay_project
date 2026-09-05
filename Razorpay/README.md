# AI Risk Manager — Track 02
## Fraud Detection System with XGBoost + LightGBM + Gemini

A full-stack agentic fraud detection system built on the ULB Credit Card Fraud Detection dataset.

## Stack
- **ML**: XGBoost + LightGBM ensemble, SMOTETomek oversampling, SHAP explainability
- **Backend**: FastAPI + Uvicorn
- **AI Agent**: Google Gemini 1.5 Flash (plain-English fraud explanations)
- **Frontend**: React + Vite, Recharts, Framer Motion

## Setup & Run

### 1. Train the Model
```bash
cd e:\H3\Razorpay
pip install -r backend/requirements.txt
python ml/train.py
```
Training takes ~5–10 minutes. Saves model artifacts to `ml/artifacts/`.

### 2. Start the Backend
```bash
cd e:\H3\Razorpay
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
API docs at: http://localhost:8000/docs

### 3. Start the Frontend
```bash
cd e:\H3\Razorpay\frontend
npm run dev
```
Dashboard at: http://localhost:5173

## Metrics (typical on ULB dataset)
| Metric | Value |
|---|---|
| Precision | ~92% |
| Recall | ~84% |
| F1 Score | ~88% |
| AUC-ROC | ~0.979 |
| PR-AUC | ~0.86 |

## Dataset
ULB Credit Card Fraud Detection — 284,807 European card transactions (2013), 492 frauds (0.172%).
