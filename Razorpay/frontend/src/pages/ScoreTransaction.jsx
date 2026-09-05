import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Shuffle, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import RiskScoreGauge from '../components/RiskScoreGauge';
import AgentExplanationCard from '../components/AgentExplanationCard';
import { api } from '../api';

const FEATURE_GROUPS = {
  'PCA Features (V1–V14)': Array.from({ length: 14 }, (_, i) => `V${i + 1}`),
  'PCA Features (V15–V28)': Array.from({ length: 14 }, (_, i) => `V${i + 15}`),
  'Transaction Info': ['Amount', 'Time'],
};

const DEFAULT_VALUES = Object.fromEntries([
  ...Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, 0]),
  ['Amount', 0], ['Time', 0],
]);

// Sample fraud transaction (approximate values from ULB dataset)
const SAMPLE_FRAUD = {
  V1: -3.04, V2: -3.16, V3: 1.09, V4: 2.29, V5: -1.36,
  V6: -1.70, V7: -2.10, V8: -0.99, V9: -0.34, V10: -0.27,
  V11: 1.78, V12: -1.63, V13: 0.46, V14: -0.34, V15: -0.25,
  V16: -0.46, V17: -0.47, V18: -0.41, V19: 0.18, V20: -0.38,
  V21: -0.30, V22: -0.14, V23: -0.06, V24: -0.15, V25: -0.11,
  V26: 0.01, V27: -0.21, V28: -0.07,
  Amount: 249.62, Time: 406.0,
};

const SAMPLE_LEGIT = {
  V1: 1.19, V2: 0.26, V3: 0.17, V4: 0.45, V5: -0.32,
  V6: -0.41, V7: 0.82, V8: 0.06, V9: -0.38, V10: 0.44,
  V11: 0.02, V12: 0.08, V13: -0.15, V14: -0.27, V15: -0.02,
  V16: 0.23, V17: 0.02, V18: 0.17, V19: -0.04, V20: 0.10,
  V21: 0.10, V22: 0.13, V23: -0.03, V24: 0.09, V25: 0.01,
  V26: 0.05, V27: 0.01, V28: 0.01,
  Amount: 4.95, Time: 1234.0,
};

export default function ScoreTransaction() {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({ 'PCA Features (V1–V14)': true, 'PCA Features (V15–V28)': false, 'Transaction Info': true });

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const handleScore = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.score({ ...values, explain: true });
      setResult(res);
    } catch (e) {
      setError('Backend not reachable. Make sure uvicorn is running on port 8000.');
    }
    setLoading(false);
  };

  const loadSample = (type) => {
    setValues(type === 'fraud' ? SAMPLE_FRAUD : SAMPLE_LEGIT);
    setResult(null);
  };

  const toggleGroup = (group) => {
    setExpanded(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div>
      <div className="page-header">
        <h2>🎯 Score a Transaction</h2>
        <p>Enter transaction features to get real-time fraud risk assessment + AI explanation</p>
      </div>

      <div className="two-col" style={{ alignItems: 'flex-start' }}>
        {/* Input Form */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="btn-ghost" onClick={() => loadSample('fraud')}>
              <Shuffle size={13} />Load Fraud Sample
            </button>
            <button className="btn-ghost" onClick={() => loadSample('legit')}>
              <Shuffle size={13} />Load Legit Sample
            </button>
            <button className="btn-ghost" onClick={() => setValues(DEFAULT_VALUES)}>Reset</button>
          </div>

          {Object.entries(FEATURE_GROUPS).map(([group, fields]) => (
            <div key={group} className="glass-card" style={{ marginBottom: 12, padding: '16px 20px' }}>
              <button
                onClick={() => toggleGroup(group)}
                style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', marginBottom: expanded[group] ? 12 : 0 }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{group}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                  {expanded[group] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>

              <AnimatePresence>
                {expanded[group] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="score-form-grid"
                    style={{ overflow: 'hidden' }}
                  >
                    {fields.map(field => (
                      <div key={field} className="form-group">
                        <label className="form-label">{field}</label>
                        <input
                          id={`field-${field}`}
                          type="number"
                          step="0.0001"
                          className="form-input"
                          value={values[field] ?? 0}
                          onChange={e => handleChange(field, e.target.value)}
                        />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          <button
            id="score-submit-btn"
            className="btn-primary"
            onClick={handleScore}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px 24px' }}
          >
            {loading ? <><div className="spinner" style={{ borderTopColor: 'white' }} />Analyzing...</> : <><Crosshair size={16} />Score Transaction</>}
          </button>

          {error && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--risk-critical-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--risk-critical)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Result Panel */}
        <div style={{ position: 'sticky', top: 24 }}>
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="glass-card"
                style={{ textAlign: 'center', padding: '48px 24px' }}
              >
                <Crosshair size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Fill in transaction features and click <strong style={{ color: 'var(--text-secondary)' }}>Score Transaction</strong> to get fraud risk analysis.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                  Try loading a sample transaction above.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}
              >
                <div className="loading-overlay">
                  <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                  <p>Running ensemble model...</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>XGBoost + LightGBM + Gemini analysis</p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="glass-card" style={{ marginBottom: 16, textAlign: 'center' }}>
                  <RiskScoreGauge score={result.risk_score} riskLevel={result.risk_level} size={200} />
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
                    <div>
                      <div className="metric-label">Confidence</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{(result.confidence * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="metric-label">Amount</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>${result.amount?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="metric-label">Verdict</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: result.is_fraud ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                        {result.is_fraud ? '🚨 FRAUD' : '✅ LEGIT'}
                      </div>
                    </div>
                  </div>
                </div>

                {result.explanation && (
                  <AgentExplanationCard explanation={result.explanation} loading={false} />
                )}

                {result.top_features?.length > 0 && (
                  <div className="glass-card" style={{ marginTop: 16 }}>
                    <div className="section-title">Top Contributing Features</div>
                    {result.top_features.map((f, i) => (
                      <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-accent)', width: 40 }}>{f.feature}</span>
                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{
                            width: `${Math.min(Math.abs(f.value) / 5 * 100, 100)}%`,
                            height: '100%',
                            background: f.value < 0 ? '#ef4444' : '#3b82f6',
                            borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: f.value < 0 ? 'var(--risk-critical)' : 'var(--text-accent)', width: 56, textAlign: 'right' }}>
                          {f.direction}{Math.abs(f.value).toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
