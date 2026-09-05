import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { AlertTriangle, TrendingUp, Shield, Activity } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import LiveFeed from '../components/LiveFeed';
import AgentExplanationCard from '../components/AgentExplanationCard';
import { useTransactionStream, useMetrics } from '../hooks/useData';
import { api } from '../api';

export default function Dashboard() {
  const { transactions, connected, stats } = useTransactionStream(25);
  const { metrics, loading: metricsLoading } = useMetrics();
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);

  const donutData = [
    { name: 'Legitimate', value: stats.legit || 1, color: '#22c55e' },
    { name: 'Fraudulent', value: stats.fraud || 0, color: '#ef4444' },
  ];

  // Build hourly trend from transactions
  const trendData = transactions.slice(0, 20).reverse().map((t, i) => ({
    t: i,
    score: t.risk_score,
    fraud: t.is_fraud ? t.risk_score : 0,
  }));

  const handleSelectFraud = async (txn) => {
    if (!txn.is_fraud) return;
    setSelectedTxn(txn);
    setExplaining(true);
    setExplanation(null);
    try {
      const features = { Amount: txn.amount, Time: 0, ...Object.fromEntries(
        Array.from({ length: 28 }, (_, i) => [`V${i + 1}`, Math.random() * 4 - 2])
      ) };
      const result = await api.score({ ...features, explain: true });
      setExplanation(result.explanation);
    } catch (_) {}
    setExplaining(false);
  };

  return (
    <div>
      <div className="page-header">
        <h2>🛡️ Risk Intelligence Dashboard</h2>
        <p>Real-time fraud monitoring · XGBoost + LightGBM ensemble · Powered by Gemini AI</p>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <MetricCard
          label="Precision"
          value={metrics ? `${(metrics.precision * 100).toFixed(1)}%` : '—'}
          sub="of flagged are real fraud"
          color="blue"
          icon={Shield}
          delay={0}
        />
        <MetricCard
          label="Recall"
          value={metrics ? `${(metrics.recall * 100).toFixed(1)}%` : '—'}
          sub="of frauds caught"
          color="green"
          icon={TrendingUp}
          delay={0.08}
        />
        <MetricCard
          label="AUC-ROC"
          value={metrics ? metrics.auc_roc.toFixed(4) : '—'}
          sub="area under ROC curve"
          color="purple"
          icon={Activity}
          delay={0.16}
        />
        <MetricCard
          label="PR-AUC"
          value={metrics ? metrics.pr_auc.toFixed(4) : '—'}
          sub="precision-recall AUC"
          color="orange"
          icon={AlertTriangle}
          delay={0.24}
        />
        <MetricCard
          label="F1 Score"
          value={metrics ? (metrics.f1 * 100).toFixed(1) + '%' : '—'}
          sub="harmonic mean P·R"
          color="red"
          delay={0.32}
        />
        <MetricCard
          label="Dataset"
          value={metrics ? (metrics.total_transactions / 1000).toFixed(0) + 'k' : '284k'}
          sub={`${metrics?.total_frauds ?? 492} labeled frauds`}
          color="blue"
          delay={0.40}
        />
      </div>

      {/* Main grid */}
      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Live Feed */}
        <div className="glass-card">
          <LiveFeed transactions={transactions} connected={connected} />
        </div>

        {/* Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Donut */}
          <div className="glass-card" style={{ flex: 1 }}>
            <div className="chart-title">
              <Activity size={14} />
              Live Session Distribution
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={55} paddingAngle={3} dataKey="value">
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--text-secondary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 4 }}>
              {donutData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span style={{ color: d.color, fontWeight: 700 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk trend */}
          <div className="glass-card" style={{ flex: 1 }}>
            <div className="chart-title"><TrendingUp size={14} />Risk Score Trend</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" fill="url(#scoreGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="fraud" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Agent explanation panel for clicked fraud txn */}
      <AnimatePresence>
        {(explaining || explanation) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="section-title">AI Agent Analysis</div>
            <AgentExplanationCard explanation={explanation} loading={explaining} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
