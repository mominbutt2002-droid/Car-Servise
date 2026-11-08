import { listBookings } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS = {
  scheduled: "Запланирована",
  completed: "Выполнена",
  cancelled: "Отменена",
};

function formatWhen(value) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year} ${time}`;
}

export default async function AdminPage() {
  const bookings = await listBookings();
  return (
    <main>
      <h1>Журнал записей</h1>
      <p className="lead">Демо без входа. Всего: {bookings.length}.</p>
      <ul className="bookings">
        {bookings.map((booking) => (
          <li key={booking.id} data-testid="booking-row">
            <span><small>Услуга</small>{booking.serviceName}</span>
            <span><small>Мастер</small>{booking.masterName}</span>
            <span><small>Авто</small>{booking.make} {booking.model} · {booking.plate}</span>
            <span><small>Время</small>{formatWhen(booking.startsAt)}</span>
            <span><small>Клиент</small>{booking.customerName}</span>
            <span><small>Телефон</small>{booking.customerPhone}</span>
            <span><small>Статус</small>{STATUS[booking.status] || booking.status}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
