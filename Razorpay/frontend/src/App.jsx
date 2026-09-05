import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AlertQueue from './pages/AlertQueue';
import ScoreTransaction from './pages/ScoreTransaction';
import ModelMetrics from './pages/ModelMetrics';
import { api } from './api';

function App() {
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    api.health()
      .then(h => setModelReady(h.model_ready))
      .catch(() => setModelReady(false));
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar modelReady={modelReady} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<AlertQueue />} />
            <Route path="/score" element={<ScoreTransaction />} />
            <Route path="/metrics" element={<ModelMetrics />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
