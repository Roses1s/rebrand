import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { LeadsProvider } from "./app/store";

import { FunnelPage } from "./pages/FunnelPage";
import { LeadPage } from "./pages/LeadPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ShipmentsPage } from "./pages/ShipmentsPage";
import { ShipmentPage } from "./pages/ShipmentPage";
import { TasksPage } from "./pages/TasksPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AccountingPage } from "./pages/AccountingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AdminPage } from "./pages/AdminPage";
import { KitPage } from "./pages/KitPage";

/** Макет CRM. Вход и авторизация намеренно не рисуются. */
export default function App() {
  return (
    <BrowserRouter>
      <LeadsProvider>
        <Routes>
        <Route path="/" element={<Navigate to="/crm" replace />} />
        <Route path="/crm" element={<FunnelPage />} />
        <Route path="/crm/leads/:id" element={<LeadPage />} />
        <Route path="/customers" element={<ClientsPage />} />
        <Route path="/shipments" element={<ShipmentsPage />} />
        <Route path="/shipments/:id" element={<ShipmentPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/accounting" element={<AccountingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/kit" element={<KitPage />} />
        <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </LeadsProvider>
    </BrowserRouter>
  );
}
