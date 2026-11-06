import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import TripsPage from './pages/TripsPage.jsx';
import RequestsPage from './pages/RequestsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const META = {
  '/dashboard': { title: 'Дашборд', tag: 'Обзор проекта', docTitle: 'Дашборд — ТрансЛайн CRM' },
  '/leads': { title: 'Лиды', tag: 'Воронка продаж', docTitle: 'Лиды — ТрансЛайн CRM' },
  '/requests': { title: 'Заявки', tag: 'Реестр перевозок', docTitle: 'Заявки — ТрансЛайн CRM' },
  '/trips': { title: 'Грузы', tag: 'Рейсы в работе', docTitle: 'Грузы — ТрансЛайн CRM' },
};

const FALLBACK = { title: 'ТрансЛайн CRM', tag: null, docTitle: 'ТрансЛайн CRM' };

export default function App() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const meta = META[location.pathname] || FALLBACK;

  useEffect(() => {
    document.title = meta.docTitle;
  }, [meta.docTitle]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {menuOpen && (
        <div className="sidebar-scrim is-on" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <div className="main">
        <Topbar title={meta.title} tag={meta.tag} onMenu={() => setMenuOpen(true)} />

        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
