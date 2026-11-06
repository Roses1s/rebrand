import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

const NAV = [
  {
    label: 'Продажи',
    items: [
      { to: '/dashboard', icon: 'dashboard', text: 'Дашборд' },
      { to: '/leads', icon: 'leads', text: 'Лиды' },
      { to: '/requests', icon: 'requests', text: 'Заявки' },
    ],
  },
  {
    label: 'Операции',
    items: [
      { to: '/trips', icon: 'truck', text: 'Грузы' },
      { icon: 'carriers', text: 'Перевозчики' },
      { icon: 'warehouse', text: 'Склады' },
    ],
  },
  {
    label: 'Аналитика',
    items: [
      { icon: 'reports', text: 'Отчёты' },
      { icon: 'finance', text: 'Финансы' },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`} id="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="truck" size={21} />
        </div>
        <div className="brand-text">
          <strong>ТрансЛайн</strong>
          <span>CRM для логистики</span>
        </div>
        <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Закрыть меню">
          <Icon name="close" />
        </button>
      </div>

      <div className="workspace">
        <span className="ws-avatar">ТЛ</span>
        <span className="ws-info">
          <span className="ws-name">ООО «ТрансЛайн»</span>
          <span className="ws-role">Новый проект · v0.1</span>
        </span>
        <Icon name="chevron" size={15} className="ws-chev" />
      </div>

      <nav className="nav">
        {NAV.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-label">{group.label}</p>
            {group.items.map((item) =>
              item.to ? (
                <NavLink
                  key={item.text}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
                >
                  <Icon name={item.icon} size={17.5} />
                  <span>{item.text}</span>
                </NavLink>
              ) : (
                <span className="nav-item is-soon" key={item.text} title="Раздел в разработке">
                  <Icon name={item.icon} size={17.5} />
                  <span>{item.text}</span>
                  <span className="soon-badge">скоро</span>
                </span>
              )
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="dev-card">
          <span className="dev-dot" />
          <div>
            <strong>Каркас готов</strong>
            <span>React 19 + Vite, роутинг и темы</span>
          </div>
        </div>

        <span className="nav-item is-soon" title="Раздел в разработке">
          <Icon name="settings" size={17.5} />
          <span>Настройки</span>
        </span>
        <span className="nav-item is-soon" title="Раздел в разработке">
          <Icon name="help" size={17.5} />
          <span>Помощь и поддержка</span>
        </span>

        <div className="user-row">
          <span className="avatar avatar--lg">АС</span>
          <span className="user-info">
            <strong>Анна Смирнова</strong>
            <span>Руководитель отдела</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
