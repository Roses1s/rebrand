import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Gauge,
  KanbanSquare,
  Package,
  Users,
  Landmark,
  Settings2,
  Sun,
  Moon,
  Plus,
  Rows3,
  Rows4,
} from "lucide-react";

import { Button, IconButton } from "../ui/Button";
import { SearchInput } from "../ui/Field";
import { Avatar } from "../ui/Tag";

const MODULES = [
  { to: "/", label: "Обзор", icon: Gauge },
  { to: "/crm", label: "Лиды", icon: KanbanSquare },
  { to: "/shipments", label: "Заявки", icon: Package },
  { to: "/customers", label: "Клиенты", icon: Users },
  { to: "/accounting", label: "Финансы", icon: Landmark },
  { to: "/admin", label: "Админ", icon: Settings2 },
];

const TITLES = {
  "/": ["Обзор", "Пульт"],
  "/crm": ["Лиды", "CRM / Воронка"],
  "/shipments": ["Заявки", "Логистика / Перевозки"],
  "/customers": ["Клиенты", "Справочник"],
  "/accounting": ["Финансы", "Бухгалтерия"],
  "/admin": ["Администрирование", "Настройки"],
  "/kit": ["Дизайн-система", "Служебная витрина"],
};

function useStoredFlag(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      return window.localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* приватный режим — просто не запоминаем */
    }
  }, [key, value]);

  return [value, setValue];
}

/** Оболочка: рельс модулей, командная строка, рабочая область. */
export function Shell({ title, crumb, actions, search, onSearch, children }) {
  const { pathname } = useLocation();
  const [theme, setTheme] = useStoredFlag("crm.theme", "light");
  const [density, setDensity] = useStoredFlag("crm.density", "comfort");
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const fallback = TITLES[pathname] ?? ["CRM", ""];
  const pageTitle = title ?? fallback[0];

  return (
    <div className="app">
      <aside className="rail">
        <NavLink to="/" className="rail__brand" aria-label="На главную">
          Д
        </NavLink>

        <nav className="rail__nav" aria-label="Модули">
          {MODULES.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `rail__link${isActive ? " is-active" : ""}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <span className="rail__spacer" />

        <div className="rail__foot">
          <IconButton
            icon={density === "compact" ? Rows4 : Rows3}
            label={density === "compact" ? "Просторный вид" : "Компактный вид"}
            onClick={() => setDensity(density === "compact" ? "comfort" : "compact")}
          />
          <IconButton
            icon={theme === "dark" ? Sun : Moon}
            label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
          <Avatar initials="АК" title="Алексей Ковалёв · менеджер" />
        </div>
      </aside>

      <div className="app__main">
        <header className="cmdbar">
          <div className="cmdbar__head">
            <span className="cmdbar__title">{pageTitle}</span>
            {crumb && <span className="cmdbar__crumb">{crumb}</span>}
          </div>

          <div className="cmdbar__search">
            <SearchInput
              value={search ?? query}
              onChange={onSearch ?? setQuery}
              placeholder="Клиент, ИНН, номер заявки"
            />
          </div>

          <div className="cmdbar__actions">
            {actions}
            <Button variant="ink" icon={Plus}>
              Создать
            </Button>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>
    </div>
  );
}
