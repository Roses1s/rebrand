import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Bell,
  Gauge,
  KanbanSquare,
  Landmark,
  Moon,
  Package,
  Plus,
  Settings2,
  Sun,
  Users,
} from "lucide-react";

import { Button, IconButton } from "../ui/Button";
import { SearchInput } from "../ui/Field";
import { Avatar } from "../ui/Tag";
import { ME } from "../mock/data";

const MODULES = [
  { to: "/", label: "Обзор", icon: Gauge },
  { to: "/crm", label: "Лиды", icon: KanbanSquare, badge: "13" },
  { to: "/shipments", label: "Заявки", icon: Package, badge: "26" },
  { to: "/customers", label: "Клиенты", icon: Users },
  { to: "/accounting", label: "Финансы", icon: Landmark },
  { to: "/admin", label: "Администрирование", icon: Settings2 },
];

const TITLES = {
  "/": "Обзор",
  "/crm": "Лиды",
  "/shipments": "Заявки",
  "/customers": "Клиенты",
  "/accounting": "Финансы",
  "/admin": "Администрирование",
  "/kit": "Дизайн-система",
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

export function Shell({ title, crumb, actions, search, onSearch, children }) {
  const { pathname } = useLocation();
  const [theme, setTheme] = useStoredFlag("crm.theme", "light");
  const [accent, setAccent] = useStoredFlag("crm.accent", "indigo");
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  const pageTitle = title ?? TITLES[pathname] ?? "CRM";
  const initials = `${ME.first_name[0]}${ME.last_name[0]}`;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">Д</span>
          <div>
            <div className="brand__name">Detroid</div>
            <div className="brand__sub">Логистическая CRM</div>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Модули">
          {MODULES.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}
            >
              <Icon />
              <span>{label}</span>
              {badge && <span className="nav-item__badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>

        <span className="sidebar__spacer" />

        <div className="sidebar__foot">
          <div className="accent-row" role="group" aria-label="Цвет акцента">
            {[
              ["indigo", "#5b5bd6", "Индиго"],
              ["violet", "#8b5cf6", "Фиолетовый"],
              ["emerald", "#0d9488", "Изумрудный"],
            ].map(([value, color, label]) => (
              <button
                key={value}
                type="button"
                className="accent-dot"
                style={{ background: color, color }}
                aria-label={label}
                aria-pressed={accent === value}
                onClick={() => setAccent(value)}
              />
            ))}
          </div>
          <div className="sidebar__actions">
            <IconButton
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
            <IconButton icon={Bell} label="Уведомления" />
          </div>
          <button type="button" className="userchip">
            <Avatar initials={initials} />
            <span>
              <span className="userchip__name">
                {ME.first_name} {ME.last_name}
              </span>
              <span className="userchip__role">Менеджер</span>
            </span>
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div>
            <div className="topbar__title">{pageTitle}</div>
            {crumb && <div className="topbar__crumb">{crumb}</div>}
          </div>

          <div className="topbar__search">
            <SearchInput
              value={search ?? query}
              onChange={onSearch ?? setQuery}
              placeholder="Найти клиента, заявку или ИНН"
            />
          </div>

          <div className="topbar__actions">
            {actions}
            <Button variant="primary" icon={Plus}>
              Создать
            </Button>
          </div>
        </header>

        <main className="main">{children}</main>
      </div>
    </div>
  );
}
