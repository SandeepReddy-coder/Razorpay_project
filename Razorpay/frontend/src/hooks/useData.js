import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';

/**
 * Hook for SSE live transaction stream
 */
export function useTransactionStream(maxItems = 30) {
  const [transactions, setTransactions] = useState([]);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ total: 0, fraud: 0, legit: 0 });
  const esRef = useRef(null);

  useEffect(() => {
    const es = new EventSource(api.streamUrl());
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const txn = JSON.parse(e.data);
        setTransactions(prev => [txn, ...prev].slice(0, maxItems));
        setStats(prev => ({
          total: prev.total + 1,
          fraud: prev.fraud + (txn.is_fraud ? 1 : 0),
          legit: prev.legit + (txn.is_fraud ? 0 : 1),
        }));
      } catch (_) {}
    };

    return () => { es.close(); setConnected(false); };
  }, [maxItems]);

  return { transactions, connected, stats };
}

/**
 * Hook for fetching metrics
 */
export function useMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.metrics()
      .then(setMetrics)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { metrics, loading, error };
}

/**
 * Hook for fetching and real-time streaming alerts
 */
export function useAlerts(limit = 60) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    api.alerts(limit)
      .then(setAlerts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  useEffect(() => {
    refresh();

    // Subscribe to SSE stream so high-risk transactions dynamically prepend to Alert Queue in real time!
    const es = new EventSource(api.streamUrl());
    es.onmessage = (e) => {
      try {
        const txn = JSON.parse(e.data);
        if (txn.risk_score >= 40 || txn.is_fraud || txn.risk_level === 'HIGH' || txn.risk_level === 'CRITICAL') {
          const newItem = {
            id: txn.id,
            amount: txn.amount,
            risk_score: txn.risk_score,
            timestamp: txn.timestamp,
            status: 'PENDING',
            label: txn.actual_label || (txn.is_fraud ? 1 : 0),
          };
          setAlerts(prev => {
            if (prev.some(a => a.id === newItem.id)) return prev;
            return [newItem, ...prev].slice(0, limit);
          });
        }
      } catch (_) {}
    };

    const timer = setInterval(() => {
      api.alerts(limit).then(data => {
        setAlerts(prev => {
          // Merge preserving client actions
          const actionMap = {};
          prev.forEach(p => { if (p.acted) actionMap[p.id] = p.acted; });
          return data.map(d => ({ ...d, acted: actionMap[d.id] || d.acted }));
        }).catch(() => {});
      });
    }, 6000);

    return () => {
      es.close();
      clearInterval(timer);
    };
  }, [limit, refresh]);

  return { alerts, setAlerts, loading, refresh };
}
