import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, ReferenceLine,
} from 'recharts';
import { BarChart2, Activity, Target, TrendingUp } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { useMetrics } from '../hooks/useData';

const COLORS = { fp: '#ef4444', tp: '#22c55e', fn: '#f97316', tn: '#3b82f6' };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ModelMetrics() {
  const { metrics, loading, error } = useMetrics();

  if (loading) {
    return (
      <div>
        <div className="page-header"><h2>📊 Model Metrics</h2></div>
        <div className="loading-overlay"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /><p>Loading metrics...</p></div>
      </div>
    );
  }

  if (error || !metrics || metrics.error) {
    return (
      <div>
        <div className="page-header"><h2>📊 Model Metrics</h2></div>
        <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
          <BarChart2 size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ color: 'var(--risk-medium)', fontSize: 14, fontWeight: 600 }}>Model not trained yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
            Run <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>python ml/train.py</code> to train the model and generate metrics.
          </p>
        </div>
      </div>
    );
  }

  // Confusion matrix
  const [[tn, fp], [fn, tp]] = metrics.confusion_matrix || [[0, 0], [0, 0]];
  const cmData = [
    { label: 'True Neg', value: tn, color: COLORS.tn, desc: 'Correct: Legit' },
    { label: 'False Pos', value: fp, color: COLORS.fp, desc: 'Wrong: Flagged legit' },
    { label: 'False Neg', value: fn, color: COLORS.fn, desc: 'Missed: Fraud not caught' },
    { label: 'True Pos', value: tp, color: COLORS.tp, desc: 'Correct: Fraud caught' },
  ];

  // ROC curve data
  const rocData = (metrics.roc_curve?.fpr || []).map((fpr, i) => ({
    fpr: parseFloat(fpr.toFixed(4)),
    tpr: parseFloat((metrics.roc_curve.tpr[i] || 0).toFixed(4)),
  }));

  // PR curve data
  const prData = (metrics.pr_curve?.recall || []).map((rec, i) => ({
    recall: parseFloat(rec.toFixed(4)),
    precision: parseFloat((metrics.pr_curve.precision[i] || 0).toFixed(4)),
  }));

  // SHAP importance
  const shapData = (metrics.shap_importance || []).slice(0, 12).map(d => ({
    feature: d.feature,
    importance: parseFloat(d.importance.toFixed(4)),
  }));

  return (
    <div>
      <div className="page-header">
        <h2>📊 Model Performance Metrics</h2>
        <p>XGBoost + LightGBM ensemble · ULB Credit Card Fraud · 284,807 transactions</p>
      </div>

      {/* Key metrics */}
      <div className="metrics-grid">
        {[
          { label: 'Precision', value: `${(metrics.precision * 100).toFixed(2)}%`, color: 'blue', sub: 'TP / (TP + FP)' },
          { label: 'Recall', value: `${(metrics.recall * 100).toFixed(2)}%`, color: 'green', sub: 'TP / (TP + FN)' },
          { label: 'F1 Score', value: `${(metrics.f1 * 100).toFixed(2)}%`, color: 'orange', sub: '2 · P · R / (P + R)' },
          { label: 'AUC-ROC', value: metrics.auc_roc.toFixed(4), color: 'purple', sub: 'Area under ROC curve' },
          { label: 'PR-AUC', value: metrics.pr_auc.toFixed(4), color: 'red', sub: 'Avg precision score' },
          { label: 'Fraud Rate', value: `${metrics.fraud_rate_pct?.toFixed(3)}%`, color: 'orange', sub: `${metrics.total_frauds} / ${(metrics.total_transactions/1000).toFixed(0)}k txns` },
        ].map((m, i) => (
          <MetricCard key={m.label} {...m} delay={i * 0.07} />
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* ROC Curve */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="chart-title"><Activity size={14} />ROC Curve (AUC = {metrics.auc_roc.toFixed(4)})</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={rocData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickCount={6} tick={{ fill: '#475569', fontSize: 10 }} label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -12, fill: '#475569', fontSize: 11 }} />
              <YAxis domain={[0, 1]} tickCount={6} tick={{ fill: '#475569', fontSize: 10 }} label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              {/* Diagonal reference */}
              <ReferenceLine segment={[{x:0,y:0},{x:1,y:1}]} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="tpr" stroke="#3b82f6" strokeWidth={2} dot={false} name="TPR" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* PR Curve */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="chart-title"><TrendingUp size={14} />Precision-Recall Curve (PR-AUC = {metrics.pr_auc.toFixed(4)})</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={prData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="recall" type="number" domain={[0, 1]} tickCount={6} tick={{ fill: '#475569', fontSize: 10 }} label={{ value: 'Recall', position: 'insideBottom', offset: -12, fill: '#475569', fontSize: 11 }} />
              <YAxis domain={[0, 1]} tickCount={6} tick={{ fill: '#475569', fontSize: 10 }} label={{ value: 'Precision', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="precision" stroke="#22c55e" strokeWidth={2} dot={false} name="Precision" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Confusion Matrix */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="chart-title"><Target size={14} />Confusion Matrix</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cmData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {cmData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            {cmData.map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ width: 8, height: 8, background: d.color, borderRadius: 2 }} />
                <span>{d.desc}: <strong style={{ color: d.color }}>{d.value.toLocaleString()}</strong></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* SHAP Feature Importance */}
        <motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="chart-title"><BarChart2 size={14} />SHAP Feature Importance (Top 12)</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={shapData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis dataKey="feature" type="category" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }} width={36} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="importance" name="SHAP Value" radius={[0, 4, 4, 0]}>
                {shapData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${220 - i * 12}, 70%, ${65 - i * 2}%)`} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
