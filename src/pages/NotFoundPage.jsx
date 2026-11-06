import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFoundPage() {
  return (
    <div className="page">
      <section className="hero">
        <span className="hero-icon">
          <Icon name="search" size={24} />
        </span>
        <div className="hero-body">
          <span className="status-chip">404</span>
          <h2>Страница не найдена</h2>
          <p>Такого раздела пока нет. Вернитесь на дашборд и выберите нужный пункт меню.</p>
          <Link className="btn btn-primary" to="/dashboard">
            <Icon name="arrowRight" size={16} /> На дашборд
          </Link>
        </div>
      </section>
    </div>
  );
}
