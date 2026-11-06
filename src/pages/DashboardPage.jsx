import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

const PAGES = [
  {
    to: '/leads',
    icon: 'leads',
    title: 'Лиды',
    text: 'Канбан-воронка: этапы от «Нового» до «Ждём заявку», карточки и перетаскивание.',
    state: 'Следующий шаг',
  },
  {
    to: '/requests',
    icon: 'requests',
    title: 'Заявки',
    text: 'Реестр перевозок со ставками, маржой, статусами и карточкой заявки.',
    state: 'В планах',
  },
  {
    to: '/trips',
    icon: 'truck',
    title: 'Грузы',
    text: 'Рейсы в работе: прогресс по маршруту, водитель, ETA и проблемы.',
    state: 'В планах',
  },
];

const DONE = [
  'React 19 + Vite, дев-сервер с горячей перезагрузкой',
  'Роутинг на react-router, страницы-заглушки',
  'Светлая и тёмная темы с сохранением выбора',
  'Каркас: сайдбар, шапка, адаптив под мобильные',
];

const NEXT = [
  'Дизайн-система: кнопки, поля, таблицы, бейджи',
  'Страница «Лиды»: канбан и карточка лида',
  'Страница «Заявки»: таблица, фильтры, детали',
  'Страница «Грузы»: рейсы и прогресс маршрута',
];

export default function DashboardPage() {
  return (
    <div className="page">
      <section className="hero">
        <span className="hero-icon">
          <Icon name="spark" size={24} />
        </span>
        <div className="hero-body">
          <span className="status-chip status-chip--ok">Новый проект</span>
          <h2>Собираем CRM для логистики с чистого листа</h2>
          <p>
            Каркас на React + Vite готов: маршрутизация, темы, меню и адаптив. Данных пока нет —
            начинаем с той страницы, которую выберете.
          </p>
        </div>
      </section>

      <section className="roadmap" aria-label="Страницы проекта">
        {PAGES.map((page) => (
          <Link className="roadmap-card" to={page.to} key={page.to}>
            <span className="roadmap-head">
              <span className="roadmap-icon">
                <Icon name={page.icon} size={18} />
              </span>
              <span className="roadmap-title">{page.title}</span>
            </span>
            <span className="roadmap-desc">{page.text}</span>
            <span className="roadmap-foot">
              <span>{page.state}</span>
              <Icon name="arrowRight" size={15} />
            </span>
          </Link>
        ))}
      </section>

      <section className="split">
        <article className="panel">
          <h3 className="panel-title">Готово</h3>
          <ul className="steps">
            {DONE.map((item) => (
              <li className="step is-done" key={item}>
                <span className="step-dot">
                  <Icon name="check" size={10} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3 className="panel-title">Дальше</h3>
          <ul className="steps">
            {NEXT.map((item) => (
              <li className="step" key={item}>
                <span className="step-dot" />
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <p className="page-note">
        Подсказка: тема переключается справа вверху и запоминается. Меню слева — единственная
        навигация, пока страниц немного.
      </p>
    </div>
  );
}
