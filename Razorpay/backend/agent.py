"""
agent.py — Gemini-powered Fraud Reasoning Agent
Generates plain-English explanations for why a transaction was flagged.
"""

import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Configure Gemini with multi-model fallback strategy
_gemini_model = None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    for m in [GEMINI_MODEL, "gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash"]:
        try:
            _gemini_model = genai.GenerativeModel(m)
            break
        except Exception:
            continue

RISK_TEMPLATES = {
    "CRITICAL": (
        "🚨 CRITICAL FRAUD RISK — This transaction exhibits multiple strong indicators "
        "of fraudulent activity. Immediate block recommended."
    ),
    "HIGH": (
        "⚠️ HIGH FRAUD RISK — Several anomalous patterns detected in this transaction. "
        "Manual review and cardholder verification advised."
    ),
    "MEDIUM": (
        "⚡ MEDIUM FRAUD RISK — Some unusual transaction characteristics observed. "
        "Monitor closely or apply step-up authentication."
    ),
    "LOW": (
        "✅ LOW FRAUD RISK — Transaction appears consistent with normal behavior. "
        "No immediate action required."
    ),
}

SYSTEM_PROMPT = """You are an expert AI Fraud Risk Analyst at a payment processing company.
Your job is to explain why a transaction was flagged by the fraud detection model.

You will receive:
- Transaction details (amount, time, risk score, top contributing PCA features)
- The model's risk assessment

Respond with a JSON object (no markdown) containing exactly these fields:
{
  "headline": "One sentence summary of the risk (max 15 words)",
  "explanation": "2-3 sentence plain-English explanation of why this transaction looks suspicious. Mention specific patterns like unusual amount, timing, or behavioral anomalies. Do NOT mention V1, V2 etc. directly - translate them to business terms.",
  "key_indicators": ["Indicator 1", "Indicator 2", "Indicator 3"],
  "recommended_action": "Block Transaction" | "Flag for Review" | "Cardholder Verification" | "Allow with Monitoring" | "Clear Transaction",
  "action_reason": "One sentence explaining why this action is recommended"
}

Be specific, professional, and concise. Never say 'I don't know'."""


def explain_transaction(
    transaction: dict,
    score_result: dict,
) -> dict:
    """
    Use Gemini to generate a plain-English explanation for a flagged transaction.
    Falls back to template if Gemini is unavailable.
    """
    if not _gemini_model:
        return _template_explanation(score_result)

    # Build context for Gemini
    top_feats = score_result.get("top_features", [])
    feat_summary = ", ".join(
        [f"{f['feature']}={f['value']:.3f}" for f in top_feats[:5]]
    )

    prompt = f"""Analyze this payment transaction flagged by our fraud detection model:

Transaction Details:
- Amount: ${score_result.get('amount', 0):.2f}
- Risk Score: {score_result.get('risk_score', 0):.1f}/100
- Risk Level: {score_result.get('risk_level', 'UNKNOWN')}
- Fraud Probability: {score_result.get('confidence', 0)*100:.1f}%
- Top Anomalous Features: {feat_summary}

The model is an XGBoost + LightGBM ensemble trained on 284,807 European card transactions.
PCA features (V1-V28) represent behavioral patterns extracted from transaction metadata.
High positive V values often indicate unusual spending velocity, atypical merchant categories,
or behavioral divergence from the cardholder's normal profile.

Provide your fraud risk analysis as a JSON object."""

    try:
        response = _gemini_model.generate_content(
            [SYSTEM_PROMPT, prompt],
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=512,
            ),
        )
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        result["source"] = "gemini"
        return result
    except Exception as e:
        print(f"[Agent] Gemini error: {e} — using template fallback")
        return _template_explanation(score_result)


def _template_explanation(score_result: dict) -> dict:
    """Rule-based fallback explanation."""
    risk = score_result.get("risk_level", "LOW")
    amount = score_result.get("amount", 0)
    confidence = score_result.get("confidence", 0)

    if risk == "CRITICAL":
        headline = "Transaction blocked: extreme fraud risk detected"
        explanation = (
            f"This ${amount:.2f} transaction triggered multiple high-confidence fraud "
            f"signals with {confidence*100:.1f}% fraud probability. The behavioral patterns "
            "deviate significantly from typical legitimate transactions in our dataset."
        )
        indicators = [
            "Extreme deviation from normal spending patterns",
            "High-velocity anomaly detected",
            "Behavioral fingerprint mismatch",
        ]
        action = "Block Transaction"
        action_reason = "Risk exceeds safe threshold; immediate block prevents potential fraud loss."
    elif risk == "HIGH":
        headline = "Suspicious transaction requires immediate review"
        explanation = (
            f"This ${amount:.2f} transaction shows several anomalous characteristics "
            f"with {confidence*100:.1f}% fraud likelihood. Key behavioral features "
            "diverge significantly from the cardholder's established profile."
        )
        indicators = [
            "Unusual transaction amount for this profile",
            "Atypical merchant or category pattern",
            "Timing anomaly detected",
        ]
        action = "Flag for Review"
        action_reason = "Multiple risk signals require human verification before processing."
    elif risk == "MEDIUM":
        headline = "Moderate risk: step-up authentication recommended"
        explanation = (
            f"This ${amount:.2f} transaction shows some unusual characteristics "
            f"({confidence*100:.1f}% fraud probability). While not definitively fraudulent, "
            "it warrants additional verification."
        )
        indicators = [
            "Slightly atypical spending pattern",
            "Minor temporal anomaly",
            "Low-confidence behavioral deviation",
        ]
        action = "Cardholder Verification"
        action_reason = "Moderate risk level warrants OTP or biometric step-up authentication."
    else:
        headline = "Transaction appears legitimate — cleared"
        explanation = (
            f"This ${amount:.2f} transaction is consistent with normal cardholder behavior. "
            f"Fraud probability is only {confidence*100:.1f}%, well within acceptable limits."
        )
        indicators = [
            "Normal spending amount and pattern",
            "Typical transaction timing",
            "Consistent behavioral profile",
        ]
        action = "Clear Transaction"
        action_reason = "Risk score is below alert threshold; transaction is safe to process."

    return {
        "headline": headline,
        "explanation": explanation,
        "key_indicators": indicators,
        "recommended_action": action,
        "action_reason": action_reason,
        "source": "template",
    }
