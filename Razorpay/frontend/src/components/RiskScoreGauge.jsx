import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

function getRiskColor(score) {
  if (score >= 80) return COLORS.CRITICAL;
  if (score >= 60) return COLORS.HIGH;
  if (score >= 30) return COLORS.MEDIUM;
  return COLORS.LOW;
}

export default function RiskScoreGauge({ score = 0, riskLevel = 'LOW', size = 180 }) {
  const color = getRiskColor(score);
  const radius = 70;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = -220;
  const endAngle = 40;
  const totalAngle = endAngle - startAngle;
  const sweepAngle = (score / 100) * totalAngle;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPath = (start, end, r) => {
    const s = toRad(start);
    const e = toRad(end);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const trackPath = arcPath(startAngle, endAngle, radius);
  const fillPath = sweepAngle > 0 ? arcPath(startAngle, startAngle + sweepAngle, radius) : '';

  // Tick marks
  const ticks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="gauge-container">
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`}>
        {/* Glow filter */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} strokeLinecap="round" />

        {/* Fill arc */}
        {fillPath && (
          <motion.path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}

        {/* Center score */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize={32} fontWeight={800} fontFamily="Inter">
          {Math.round(score)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize={10} fontFamily="Inter">
          RISK SCORE
        </text>
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <span className={`risk-badge ${riskLevel}`} style={{ fontSize: 13, padding: '4px 14px' }}>
          {riskLevel}
        </span>
      </motion.div>
    </div>
  );
}
