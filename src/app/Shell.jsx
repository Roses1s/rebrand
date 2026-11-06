import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CheckSquare,
  KanbanSquare,
  Landmark,
  LayoutGrid,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
  LogOut,
} from "lucide-react";

import { Button, IconButton } from "../ui/Button";
import { SearchInput } from "../ui/Field";
import { Avatar } from "../ui/Tag";
import { ALL_LEADS, ME, SHIPMENTS, TASKS } from "../mock/data";

const myLeads = ALL_LEADS.filter((lead) => lead.ownerId === ME.id);
const myShipments = SHIPMENTS.filter((item) => item.ownerId === ME.id);
const myTasks = TASKS.filter((task) => task.ownerId === ME.id);
const openTasks = myTasks.filter((task) => task.status !== "done").length;

const SALES = [
  { to: "/crm", label: "Воронка лидов", icon: KanbanSquare, count: String(myLeads.length) },
  { to: "/customers", label: "Клиенты", icon: Users, count: String(ALL_LEADS.length) },
  { to: "/shipments", label: "Заявки", icon: LayoutGrid, count: String(myShipments.length) },
  { to: "/tasks", label: "Задачи", icon: CheckSquare, count: String(openTasks) },
];

const REPORTS = [
  { to: "/analytics", label: "Моя аналитика", icon: BarChart3 },
  { to: "/accounting", label: "Бухгалтерия", icon: Landmark },
];

const SETTINGS = [{ to: "/settings", label: "Мои настройки", icon: Settings }];

const TITLES = {
  "/": ["Воронка лидов", "Моя доска · перетаскивайте карточки между этапами"],
  "/crm": ["Воронка лидов", "Моя доска · перетаскивайте карточки между этапами"],
  "/customers": ["Клиенты", "Мои клиенты и клиенты коллег — чужие карточки без деталей"],
  "/shipments": ["Заявки", "Мои перевозки и статусы отгрузок"],
  "/tasks": ["Задачи", "Мои звонки, письма и напоминания"],
  "/analytics": ["Моя аналитика", "Конверсия, источники и результаты за период"],
  "/accounting": ["Бухгалтерия", "Счета, банк и кассовые операции"],
  "/settings": ["Мои настройки", "Тема оформления и моя воронка"],
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
  const overdue = myTasks.filter((task) => task.status === "overdue").length;

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

        <div className="side-label">Отчёты</div>
        <nav className="side-nav" aria-label="Отчёты">
          {REPORTS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-label">Настройки</div>
        <nav className="side-nav" aria-label="Настройки">
          {SETTINGS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <div className="plan">
            <div className="plan__title">Мой план на месяц</div>
            <div className="plan__sub">Закрыто 68% от 720 тыс ₽</div>
            <div className="plan__track">
              <div className="plan__fill" style={{ width: "68%" }} />
            </div>
          </div>

          <div className="team__row" style={{ marginTop: 8 }}>
            <Avatar initials={ME.initials} />
            <div style={{ minWidth: 0 }}>
              <span className="team__name">{ME.name}</span>
              <span className="team__role">{ME.role}</span>
            </div>
            <button type="button" className="col__btn" aria-label="Выйти" title="Выйти" style={{ marginLeft: "auto" }}>
              <LogOut size={15} strokeWidth={1.9} style={{ color: "var(--ink-3)" }} />
            </button>
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
              placeholder="Поиск: компания или груз"
            />
          </div>

          <div className="topbar__actions">
            <button type="button" className="counter-btn">
              Просрочено
              <b>{overdue}</b>
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
            <Avatar initials={ME.initials} size="lg" title={`${ME.name} · ${ME.role}`} />
          </div>
        </header>

        <main className="main">{children}</main>
      </div>
    </div>
  );
}
