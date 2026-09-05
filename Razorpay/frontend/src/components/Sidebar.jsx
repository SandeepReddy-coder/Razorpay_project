import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, Crosshair, BarChart2, Shield } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/alerts', icon: AlertTriangle, label: 'Alert Queue' },
  { to: '/score', icon: Crosshair, label: 'Score Transaction' },
  { to: '/metrics', icon: BarChart2, label: 'Model Metrics' },
];

export default function Sidebar({ modelReady }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield size={18} color="white" strokeWidth={2.5} />
        </div>
        <div className="sidebar-logo-text">
          <h1>RiskGuard AI</h1>
          <span>Fraud Detection System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} className="nav-link-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className={`status-dot ${modelReady ? '' : 'offline'}`} style={{ color: 'var(--text-secondary)' }}>
          {modelReady ? 'Model Online' : 'Model Offline'}
        </div>
        <p style={{ marginTop: 8 }}>
          XGBoost + LightGBM<br />
          Ensemble · SMOTE · SHAP
        </p>
        <p style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
          Powered by Gemini 1.5 Flash
        </p>
      </div>
    </aside>
  );
}
