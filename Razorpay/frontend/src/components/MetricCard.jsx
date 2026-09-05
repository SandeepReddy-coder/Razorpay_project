import { motion } from 'framer-motion';

export default function MetricCard({ label, value, sub, color = 'blue', icon: Icon, delay = 0 }) {
  return (
    <motion.div
      className={`metric-card ${color}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="metric-label">{label}</div>
        {Icon && (
          <Icon size={16} style={{ opacity: 0.4 }} />
        )}
      </div>
      <div className="metric-value count-anim">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </motion.div>
  );
}
