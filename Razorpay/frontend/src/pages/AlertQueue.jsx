import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, RefreshCw, ChevronRight, DollarSign } from 'lucide-react';
import AgentExplanationCard from '../components/AgentExplanationCard';
import { useAlerts } from '../hooks/useData';
import { api } from '../api';

function getRiskColor(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export default function AlertQueue() {
  const { alerts, loading, refresh } = useAlerts(60);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [actionMap, setActionMap] = useState({});
  const [sortBy, setSortBy] = useState('risk_score');

  const sorted = [...alerts].sort((a, b) =>
    sortBy === 'risk_score' ? b.risk_score - a.risk_score
    : sortBy === 'amount' ? b.amount - a.amount
    : new Date(b.timestamp) - new Date(a.timestamp)
  );

  const handleSelect = async (alert) => {
    setSelectedAlert(alert);
    setExplanation(null);
    setExplaining(true);
    try {
      const result = await api.transactionDetail(alert.id);
      setExplanation(result.explanation);
    } catch (_) {
      setExplanation({
        headline: `High-risk transaction: ${alert.id}`,
        explanation: `This transaction of $${alert.amount?.toFixed(2)} has a risk score of ${alert.risk_score}/100, indicating a high probability of fraudulent activity based on behavioral pattern analysis.`,
        key_indicators: ['Anomalous amount pattern', 'Behavioral deviation detected', 'High-risk time window'],
        recommended_action: alert.risk_score >= 80 ? 'Block Transaction' : 'Flag for Review',
        action_reason: 'Risk score exceeds safe threshold for this transaction profile.',
        source: 'template',
      });
    }
    setExplaining(false);
  };

  const handleAction = (id, action) => {
    setActionMap(prev => ({ ...prev, [id]: action }));
    if (selectedAlert?.id === id) setSelectedAlert(null);
  };

  const totalValue = alerts.reduce((s, a) => s + (a.amount || 0), 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>⚠️ Fraud Alert Queue</h2>
          <p>Flagged transactions requiring review · updated in real time</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '6px 14px', borderRadius: 20 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '0.5px' }}>LIVE DYNAMIC QUEUE</span>
        </div>
      </div>

      {/* Summary row */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Alerts', value: alerts.length, color: 'red' },
          { label: 'Critical', value: alerts.filter(a => a.risk_score >= 80).length, color: 'red' },
          { label: 'High', value: alerts.filter(a => a.risk_score >= 60 && a.risk_score < 80).length, color: 'orange' },
          { label: 'At-Risk Value', value: `$${totalValue.toFixed(0)}`, color: 'purple' },
        ].map((m, i) => (
          <motion.div key={m.label} className={`metric-card ${m.color}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, position: 'relative' }}>
        {/* Table */}
        <div className="glass-card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={15} style={{ color: 'var(--risk-high)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Flagged Transactions</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sort:</span>
              {['risk_score', 'amount', 'timestamp'].map(s => (
                <button
                  key={s}
                  className={`btn-ghost`}
                  onClick={() => setSortBy(s)}
                  style={{
                    padding: '4px 10px', fontSize: 11,
                    background: sortBy === s ? 'rgba(59,130,246,0.12)' : 'transparent',
                    borderColor: sortBy === s ? 'rgba(59,130,246,0.3)' : undefined,
                    color: sortBy === s ? 'var(--accent-primary)' : undefined,
                  }}
                >
                  {s === 'risk_score' ? 'Risk' : s === 'amount' ? 'Amount' : 'Time'}
                </button>
              ))}
              <button className="btn-ghost" onClick={refresh} style={{ padding: '4px 10px' }}>
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-overlay"><div className="spinner" /><span>Loading alerts...</span></div>
          ) : (
            <div className="alert-table-wrap">
              <table className="alert-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Amount</th>
                    <th>Risk Score</th>
                    <th>Level</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((alert, i) => {
                    const acted = actionMap[alert.id];
                    const level = getRiskColor(alert.risk_score);
                    return (
                      <motion.tr
                        key={alert.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.5) }}
                        style={{ cursor: 'pointer', opacity: acted ? 0.45 : 1 }}
                        onClick={() => !acted && handleSelect(alert)}
                      >
                        <td>
                          <span className="txn-id">{alert.id}</span>
                          {selectedAlert?.id === alert.id && (
                            <ChevronRight size={12} style={{ marginLeft: 6, color: 'var(--accent-primary)' }} />
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${alert.amount?.toFixed(2)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                              <div style={{
                                width: `${alert.risk_score}%`,
                                height: '100%',
                                background: level === 'CRITICAL' ? '#ef4444' : level === 'HIGH' ? '#f97316' : level === 'MEDIUM' ? '#eab308' : '#22c55e',
                                borderRadius: 2,
                              }} />
                            </div>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{alert.risk_score}</span>
                          </div>
                        </td>
                        <td><span className={`risk-badge ${level}`}>{level}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : '—'}
                        </td>
                        <td>
                          {acted
                            ? <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{acted}</span>
                            : <span style={{ fontSize: 11, color: 'var(--risk-medium)' }}>PENDING</span>
                          }
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {!acted && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="action-btn block" onClick={() => handleAction(alert.id, 'Blocked')}>Block</button>
                              <button className="action-btn review" onClick={() => handleAction(alert.id, 'In Review')}>Review</button>
                              <button className="action-btn clear" onClick={() => handleAction(alert.id, 'Cleared')}>Clear</button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {selectedAlert && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 380 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div className="glass-card" style={{ width: 380, position: 'sticky', top: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Transaction Detail</span>
                  <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelectedAlert(null)}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="txn-id" style={{ fontSize: 13 }}>{selectedAlert.id}</span>
                    <span className={`risk-badge ${getRiskColor(selectedAlert.risk_score)}`}>
                      {getRiskColor(selectedAlert.risk_score)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <div className="metric-label">Amount</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                        ${selectedAlert.amount?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="metric-label">Risk Score</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: selectedAlert.risk_score >= 80 ? 'var(--risk-critical)' : selectedAlert.risk_score >= 60 ? 'var(--risk-high)' : 'var(--risk-medium)' }}>
                        {selectedAlert.risk_score}/100
                      </div>
                    </div>
                  </div>
                </div>

                <AgentExplanationCard explanation={explanation} loading={explaining} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
