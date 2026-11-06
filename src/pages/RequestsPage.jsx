import Placeholder from './Placeholder.jsx';

export default function RequestsPage() {
  return (
    <Placeholder
      icon="requests"
      title="Заявки"
      description="Реестр заявок на перевозку со статусами, ставками клиенту и перевозчику, маржой и карточкой заявки."
      features={[
        { title: 'Таблица заявок', text: 'Маршрут, груз, даты, ставки, маржа, статус, менеджер.' },
        { title: 'Статусы и табы', text: 'Новая, В работе, Машина назначена, В пути, Выгружено, Отменена.' },
        { title: 'Карточка заявки', text: 'Финансы, перевозчик и водитель, документы, история.' },
      ]}
    />
  );
}
