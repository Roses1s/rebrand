import Icon from '../components/Icon.jsx';

/**
 * Заглушка страницы: показывает, что раздел ещё не собран,
 * и какие блоки в нём планируются.
 */
export default function Placeholder({ icon, title, description, features = [], status = 'В разработке' }) {
  return (
    <div className="page">
      <section className="hero">
        <span className="hero-icon">
          <Icon name={icon} size={24} />
        </span>
        <div className="hero-body">
          <span className="status-chip">{status}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </section>

      {features.length > 0 && (
        <section className="plan-grid" aria-label="Что появится на странице">
          {features.map((feature) => (
            <article className="plan-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </section>
      )}

      <p className="page-note">
        Каркас приложения готов: роутинг, светлая и тёмная темы, меню, адаптив. Дальше собираем эту
        страницу — скажите, какие блоки и данные здесь нужны.
      </p>
    </div>
  );
}
