import Icon from './Icon.jsx';
import { useTheme } from '../theme/ThemeProvider.jsx';

export default function Topbar({ title, tag, onMenu }) {
  const { theme, toggle } = useTheme();
  const nextTheme = theme === 'dark' ? 'светлую' : 'тёмную';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn only-mobile" onClick={onMenu} aria-label="Открыть меню">
          <Icon name="menu" />
        </button>
        <div className="page-title">
          <h1>{title}</h1>
          {tag && <span className="tag-pill">{tag}</span>}
        </div>
      </div>

      <div className="topbar-right">
        <button className="theme-toggle" onClick={toggle} aria-label={`Включить ${nextTheme} тему`}>
          <span className="tt-ico tt-ico--sun">
            <Icon name="sun" size={15} />
          </span>
          <span className="tt-ico tt-ico--moon">
            <Icon name="moon" size={15} />
          </span>
        </button>

        <button className="icon-btn" aria-label="Уведомления" title="Уведомления — в разработке">
          <Icon name="bell" />
          <span className="dot-badge" />
        </button>

        <div className="topbar-sep" />

        <div className="user-chip" title="Профиль — в разработке">
          <span className="avatar">АС</span>
          <span className="user-chip-name">Анна С.</span>
          <Icon name="chevron" size={14} />
        </div>
      </div>
    </header>
  );
}
