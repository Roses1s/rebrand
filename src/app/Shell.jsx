import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CheckSquare,
  KanbanSquare,
  Landmark,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";

import { Button, IconButton } from "../ui/Button";
import { Field, Input, SearchInput, Select } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Tag";
import { useLeads } from "./store";
import { ALL_LEADS, ME, SHIPMENTS, TASKS, TEAM } from "../mock/data";

const myShipments = SHIPMENTS.filter((item) => item.ownerId === ME.id);
const myTasks = TASKS.filter((task) => task.ownerId === ME.id);

const SALES = [
  { to: "/crm", label: "Воронка лидов", icon: KanbanSquare },
  { to: "/customers", label: "Клиенты", icon: Users, count: String(ALL_LEADS.length) },
  { to: "/shipments", label: "Заявки", icon: LayoutGrid, count: String(myShipments.length) },
  { to: "/tasks", label: "Задачи", icon: CheckSquare },
];

const REPORTS = [
  { to: "/analytics", label: "Моя аналитика", icon: BarChart3 },
  { to: "/accounting", label: "Бухгалтерия", icon: Landmark },
];

const SETTINGS = [{ to: "/settings", label: "Мои настройки", icon: Settings }];

const ADMIN = [{ to: "/admin", label: "Администрирование", icon: ShieldCheck, count: String(TEAM.length) }];

const TITLES = {
  "/": ["Воронка лидов", "Моя доска · перетаскивайте карточки между этапами и внутри них"],
  "/crm": ["Воронка лидов", "Моя доска · перетаскивайте карточки между этапами и внутри них"],
  "/customers": ["Клиенты", "Мои клиенты и клиенты коллег — чужие карточки без деталей"],
  "/shipments": ["Заявки", "Мои перевозки и статусы отгрузок"],
  "/tasks": ["Задачи", "Мои звонки, письма и напоминания"],
  "/analytics": ["Моя аналитика", "Конверсия, источники и результаты за период"],
  "/accounting": ["Бухгалтерия", "Счета, банк и кассовые операции"],
  "/settings": ["Мои настройки", "Тема оформления и моя воронка"],
  "/admin": ["Администрирование", "Пользователи, доступы и безопасность"],
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

function NavGroup({ items }) {
  return (
    <nav className="side-nav">
      {items.map(({ to, label, icon: Icon, count }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}>
          <Icon />
          <span>{label}</span>
          {count && <span className="nav-count">{count}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export function Shell({ title, crumb, actions, search, onSearch, children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { leads, addLead } = useLeads();
  const [theme, setTheme] = useStored("crm.theme", "light");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", contact: "", phone: "", city: "Москва", price: "", priority: "mid" });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const myLeads = leads.filter((lead) => lead.ownerId === ME.id);
  const openTasks = myTasks.filter((task) => task.status !== "done").length;
  const overdue = myTasks.filter((task) => task.status === "overdue").length;

  const sales = SALES.map((item) =>
    item.to === "/crm"
      ? { ...item, count: String(myLeads.length) }
      : item.to === "/tasks"
        ? { ...item, count: String(openTasks) }
        : item,
  );

  const [pageTitle, pageSub] = TITLES[pathname] ?? [title ?? "CRM", ""];

  function submitLead() {
    if (!draft.name.trim()) return;
    addLead({
      name: draft.name.trim(),
      contact: draft.contact.trim() || "—",
      phone: draft.phone.trim() || "—",
      city: draft.city.trim() || "—",
      price: Number(draft.price) || 0,
      priority: draft.priority,
      hot: draft.priority === "high",
      due: "сегодня",
    });
    setDraft({ name: "", contact: "", phone: "", city: "Москва", price: "", priority: "mid" });
    setLeadOpen(false);
    navigate("/crm");
  }

  return (
    <div className={menuOpen ? "app app--menu" : "app"}>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">
            <LayoutGrid size={20} strokeWidth={2} />
          </span>
          <div>
            <div className="brand__name">ТрансЛайн CRM</div>
            <div className="brand__sub">Грузоперевозки · Отдел продаж</div>
          </div>
          <button
            type="button"
            className="sidebar__close"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="side-label">Продажи</div>
        <NavGroup items={sales} />

        <div className="side-label">Отчёты</div>
        <NavGroup items={REPORTS} />

        <div className="side-label">Настройки</div>
        <NavGroup items={SETTINGS} />

        {ME.isAdmin && (
          <>
            <div className="side-label">Администратор</div>
            <NavGroup items={ADMIN} />
          </>
        )}

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
          <button type="button" className="menu-btn" aria-label="Открыть меню" onClick={() => setMenuOpen(true)}>
            <Menu size={18} strokeWidth={2} />
          </button>

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
            <IconButton icon={Bell} label="Уведомления" className="hide-sm" />
            <IconButton
              className="hide-sm"
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
            {actions}
            <Button variant="primary" icon={Plus} className="new-lead-btn" onClick={() => setLeadOpen(true)}>
              <span className="btn__label">Новый лид</span>
            </Button>
            <Avatar initials={ME.initials} size="lg" title={`${ME.name} · ${ME.role}`} />
          </div>
        </header>

        <main className="main">{children}</main>
      </div>

      <Modal
        open={leadOpen}
        title="Новый лид"
        onClose={() => setLeadOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeadOpen(false)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={submitLead}>
              Создать лид
            </Button>
          </>
        }
      >
        <Field label="Компания">
          <Input
            autoFocus
            placeholder="ООО «Ромашка»"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>
        <Field label="Контактное лицо">
          <Input
            placeholder="Иван Петров"
            value={draft.contact}
            onChange={(event) => setDraft({ ...draft, contact: event.target.value })}
          />
        </Field>
        <Field label="Телефон">
          <Input
            placeholder="+7 900 000-00-00"
            value={draft.phone}
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
          />
        </Field>
        <Field label="Город">
          <Input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
        </Field>
        <Field label="Ожидаемая сумма, ₽">
          <Input
            inputMode="numeric"
            placeholder="120000"
            value={draft.price}
            onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/\D/g, "") })}
          />
        </Field>
        <Field label="Приоритет" hint="Лид появится на первом этапе «Новый»">
          <Select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
            <option value="high">Высокий</option>
            <option value="mid">Средний</option>
            <option value="low">Низкий</option>
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
