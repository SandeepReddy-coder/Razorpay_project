import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

function getRiskColor(level) {
  const map = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };
  return map[level] || '#94a3b8';
}

export default function LiveFeed({ transactions, connected }) {
  const bottomRef = useRef(null);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="section-title" style={{ marginBottom: 0, flex: 1 }}>Live Transaction Feed</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          {connected
            ? <><Wifi size={12} color="#22c55e" /><span style={{ color: '#22c55e' }}>LIVE</span></>
            : <><WifiOff size={12} color="#ef4444" /><span style={{ color: '#ef4444' }}>DISCONNECTED</span></>
          }
        </div>
      </div>

      <div className="live-feed">
        <AnimatePresence mode="popLayout">
          {transactions.map((txn) => (
            <motion.div
              key={txn.id}
              layout
              initial={{ opacity: 0, x: -16, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="feed-item"
            >
              <div
                className={`feed-dot ${txn.is_fraud ? 'fraud' : 'legit'}`}
                style={txn.is_fraud ? {} : { animation: 'none' }}
              />
              <span className="feed-id">{txn.id}</span>
              <span className="feed-amount">${txn.amount?.toFixed(2)}</span>
              <span className="feed-score" style={{ color: getRiskColor(txn.risk_level) }}>
                {txn.risk_score?.toFixed(1)}
              </span>
              <span className={`risk-badge ${txn.risk_level}`}>{txn.risk_level}</span>
              <span className="feed-time">
                {txn.timestamp ? new Date(txn.timestamp).toLocaleTimeString() : '--'}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {transactions.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {connected ? 'Waiting for transactions...' : 'Connect the backend to see live data'}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
