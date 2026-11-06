import Placeholder from './Placeholder.jsx';

export default function TripsPage() {
  return (
    <Placeholder
      icon="truck"
      title="Грузы"
      description="Рейсы в работе: прогресс по маршруту, водитель и машина, ETA, проблемы и этапы рейса."
      features={[
        { title: 'Реестр рейсов', text: 'Номер рейса и заявки, клиент, маршрут с прогрессом, ETA.' },
        { title: 'Водители и машины', text: 'Кто везёт, телефон, ТС, перевозчик.' },
        { title: 'Контроль рейса', text: 'Этапы, статусы, оповещения о проблемах и просрочке.' },
      ]}
    />
  );
}
