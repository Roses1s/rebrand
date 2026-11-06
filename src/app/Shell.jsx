import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CheckSquare,
  ChevronDown,
  KanbanSquare,
  Landmark,
  LayoutGrid,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
} from "lucide-react";

import { Button, IconButton } from "../ui/Button";
import { SearchInput } from "../ui/Field";
import { Avatar } from "../ui/Tag";
import { ME, TEAM } from "../mock/data";

const SALES = [
  { to: "/crm", label: "Воронка лидов", icon: KanbanSquare, count: "20" },
  { to: "/customers", label: "Клиенты", icon: Users, count: "20" },
  { to: "/shipments", label: "Заявки", icon: LayoutGrid, count: "26" },
  { to: "/tasks", label: "Задачи", icon: CheckSquare, count: "5" },
  { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  { to: "/accounting", label: "Бухгалтерия", icon: Landmark },
];

const OTHER = [{ to: "/settings", label: "Настройки", icon: Settings }];

const TITLES = {
  "/": ["Воронка лидов", "Перетаскивайте карточки между этапами — изменения сохраняются автоматически"],
  "/crm": ["Воронка лидов", "Перетаскивайте карточки между этапами — изменения сохраняются автоматически"],
  "/customers": ["Клиенты", "База компаний-грузоотправителей и контактов"],
  "/shipments": ["Заявки", "Перевозки, маршруты и статусы отгрузок"],
  "/tasks": ["Задачи", "Звонки, письма и напоминания по лидам"],
  "/analytics": ["Аналитика", "Конверсия воронки, источники и результаты команды"],
  "/accounting": ["Бухгалтерия", "Счета, банк и кассовые операции"],
  "/settings": ["Настройки", "Тема оформления и структура воронки продаж"],
  "/kit": ["Дизайн-система", "Служебная витрина компонентов"],
};

function useStored(key, initial) {
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
      /* приватный режим */
    }
  }, [key, value]);

  return [value, setValue];
}

export function Shell({ title, crumb, actions, search, onSearch, children }) {
  const { pathname } = useLocation();
  const [theme, setTheme] = useStored("crm.theme", "light");
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const [pageTitle, pageSub] = TITLES[pathname] ?? [title ?? "CRM", ""];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">
            <LayoutGrid size={20} strokeWidth={2} />
          </span>
          <div>
            <div className="brand__name">ТрансЛайн CRM</div>
            <div className="brand__sub">Грузоперевозки · Отдел продаж</div>
          </div>
        </div>

        <div className="side-label">Продажи</div>
        <nav className="side-nav" aria-label="Разделы">
          {SALES.map(({ to, label, icon: Icon, count }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}>
              <Icon />
              <span>{label}</span>
              {count && <span className="nav-count">{count}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="side-label">Настройки</div>
        <nav className="side-nav" aria-label="Настройки">
          {OTHER.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-label">Команда</div>
        <div className="team">
          {TEAM.map((user) => (
            <div key={user.id} className="team__row">
              <Avatar initials={user.initials} color={user.color} />
              <div style={{ minWidth: 0 }}>
                <span className="team__name">{user.name}</span>
                <span className="team__role">{user.role}</span>
              </div>
              <span className={`team__dot${user.online ? "" : " team__dot--off"}`} />
            </div>
          ))}
        </div>

        <div className="plan">
          <div className="plan__title">План на месяц</div>
          <div className="plan__sub">Закрыто 68% от 4,5 млн ₽</div>
          <div className="plan__track">
            <div className="plan__fill" style={{ width: "68%" }} />
          </div>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbar__head">
            <div className="topbar__title">{title ?? pageTitle}</div>
            <div className="topbar__sub">{crumb ?? pageSub}</div>
          </div>

          <div className="topbar__search">
            <SearchInput
              value={search ?? query}
              onChange={onSearch ?? setQuery}
              placeholder="Поиск: компания, груз, маршрут"
            />
          </div>

          <div className="topbar__actions">
            <button type="button" className="counter-btn">
              Все менеджеры
              <ChevronDown size={14} strokeWidth={2} />
            </button>
            <button type="button" className="counter-btn">
              Просрочено
              <b>1</b>
            </button>
            <IconButton icon={Bell} label="Уведомления" />
            <IconButton
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
            {actions}
            <Button variant="primary" icon={Plus}>
              Новый лид
            </Button>
            <Avatar initials="АГ" size="lg" title={ME.name} />
          </div>
        </header>

        <main className="main">{children}</main>
      </div>
    </div>
  );
}
