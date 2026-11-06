import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { OverviewPage } from "./pages/OverviewPage";
import { KanbanPage } from "./pages/KanbanPage";
import { KitPage } from "./pages/KitPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

/**
 * Макет новой CRM. Вход и авторизация намеренно не рисуются:
 * приложение открывается сразу внутри системы.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/kit" element={<KitPage />} />

        <Route path="/crm" element={<KanbanPage />} />
        <Route
          path="/crm/leads/:id"
          element={<PlaceholderPage title="Карточка лида" crumb="CRM / Лиды / Карточка" step="4" />}
        />
        <Route
          path="/shipments"
          element={<PlaceholderPage title="Заявки" crumb="Логистика / Перевозки" step="5" />}
        />
        <Route
          path="/shipments/:id"
          element={<PlaceholderPage title="Карточка заявки" crumb="Логистика / Заявки / Карточка" step="5" />}
        />
        <Route
          path="/customers"
          element={<PlaceholderPage title="Клиенты" crumb="Справочник" step="6" />}
        />
        <Route
          path="/accounting"
          element={<PlaceholderPage title="Финансы" crumb="Бухгалтерия" step="6" />}
        />
        <Route
          path="/admin"
          element={<PlaceholderPage title="Администрирование" crumb="Настройки" step="6" />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
