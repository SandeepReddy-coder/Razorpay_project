import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ACTION_ICONS = {
  'Block Transaction': <XCircle size={14} color="#ef4444" />,
  'Flag for Review': <AlertCircle size={14} color="#eab308" />,
  'Cardholder Verification': <AlertCircle size={14} color="#f97316" />,
  'Allow with Monitoring': <CheckCircle size={14} color="#22c55e" />,
  'Clear Transaction': <CheckCircle size={14} color="#22c55e" />,
};

export default function AgentExplanationCard({ explanation, loading }) {
  if (loading) {
    return (
      <div className="agent-card">
        <div className="agent-header">
          <div className="agent-icon"><Bot size={14} color="white" /></div>
          <span className="agent-headline">Gemini is analyzing this transaction...</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
          <div className="spinner" />
          Generating fraud risk analysis...
        </div>
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="agent-card"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="agent-header">
          <div className="agent-icon">
            <Bot size={14} color="white" />
          </div>
          <span className="agent-headline">{explanation.headline}</span>
          <span className="agent-source-badge">
            <Zap size={9} />
            {explanation.source === 'gemini' ? 'Gemini 1.5 Flash' : 'Rule Engine'}
          </span>
        </div>

        <p className="agent-explanation">{explanation.explanation}</p>

        {explanation.key_indicators?.length > 0 && (
          <div className="agent-indicators">
            {explanation.key_indicators.map((ind, i) => (
              <motion.span
                key={i}
                className="indicator-pill"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
              >
                {ind}
              </motion.span>
            ))}
          </div>
        )}

        <div className="agent-action">
          {ACTION_ICONS[explanation.recommended_action] || <Zap size={14} />}
          <div>
            <div className="agent-action-label">Recommended Action</div>
            <div className="agent-action-value">{explanation.recommended_action}</div>
          </div>
          <div style={{ marginLeft: 'auto', maxWidth: 200, textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {explanation.action_reason}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
