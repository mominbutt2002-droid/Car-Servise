"use client";

import { useEffect, useState } from "react";

const STATUS = {
  scheduled: "Запланирована",
  completed: "Выполнена",
  cancelled: "Отменена",
};

function formatWhen(value) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}${time ? ` ${time}` : ""}`;
}

export default function Book({ services, masters, initialCars }) {
  const [serviceId, setServiceId] = useState(null);
  const [masterId, setMasterId] = useState(null);
  const [cars, setCars] = useState(initialCars);
  const [carId, setCarId] = useState(null);
  const [history, setHistory] = useState([]);
  const [slots, setSlots] = useState([]);
  const [startsAt, setStartsAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  const masterOptions = masters.filter((master) => master.serviceIds.includes(serviceId));
  const days = [...new Set(slots.map((slot) => slot.date))];

  useEffect(() => {
    if (!carId) return;
    let ignore = false;
    fetch(`/api/history?carId=${carId}`)
      .then((response) => response.json())
      .then((data) => {
        if (!ignore) setHistory(data.visits || []);
      })
      .catch(() => {
        if (!ignore) setError("Не удалось загрузить историю");
      });
    return () => {
      ignore = true;
    };
  }, [carId]);

  useEffect(() => {
    if (!masterId) return;
    let ignore = false;
    fetch(`/api/slots?masterId=${masterId}`)
      .then((response) => response.json())
      .then((data) => {
        if (ignore) return;
        const nextSlots = data.slots || [];
        setSlots(nextSlots);
        setStartsAt((current) => (nextSlots.some((slot) => slot.free && slot.startsAt === current) ? current : ""));
      })
      .catch(() => {
        if (!ignore) setError("Не удалось загрузить окна");
      });
    return () => {
      ignore = true;
    };
  }, [masterId, done]);

  async function addCar(event) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/cars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ make, model, plate }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || "Не удалось сохранить автомобиль");
      return;
    }
    setCars((current) => (current.some((car) => car.id === data.car.id) ? current : [...current, data.car]));
    setCarId(data.car.id);
    setMake("");
    setModel("");
    setPlate("");
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        masterId,
        carId,
        startsAt,
        customerName: name,
        customerPhone: phone,
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.message || "Не удалось сохранить запись");
      setDone({ refresh: Date.now() });
      return;
    }
    setDone(data.booking);
    setName("");
    setPhone("");
  }

  return (
    <div>
      {done?.id ? (
        <p className="ok" id="confirmation">
          Запись №{done.id} сохранена. Окно этого мастера больше не свободно.{" "}
          <a href="/admin">Открыть журнал</a>
        </p>
      ) : null}

      <h2>1. Услуга</h2>
      <div className="grid">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            className={serviceId === service.id ? "opt active" : "opt"}
            onClick={() => {
              setServiceId(service.id);
              setMasterId(null);
              setStartsAt("");
              setError("");
            }}
          >
            {service.name}
          </button>
        ))}
      </div>

      {serviceId ? (
        <>
          <h2>2. Мастер</h2>
          <div className="grid">
            {masterOptions.map((master) => (
              <button
                key={master.id}
                type="button"
                className={masterId === master.id ? "opt active" : "opt"}
                onClick={() => {
                  setMasterId(master.id);
                  setStartsAt("");
                  setError("");
                }}
              >
                {master.name}
                <br />
                <span className="note">{master.role}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {masterId ? (
        <>
          <h2>3. Автомобиль</h2>
          <div className="grid">
            {cars.map((car) => (
              <button
                key={car.id}
                type="button"
                className={carId === car.id ? "opt active" : "opt"}
                onClick={() => {
                  setCarId(car.id);
                  setError("");
                }}
              >
                {car.make} {car.model}
                <br />
                <span className="note">{car.plate}</span>
              </button>
            ))}
          </div>
          <form onSubmit={addCar} className="row">
            <label>
              Марка
              <input value={make} onChange={(event) => setMake(event.target.value)} placeholder="Lada" />
            </label>
            <label>
              Модель
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Vesta" />
            </label>
            <label>
              Госномер
              <input value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="А000АА777" />
            </label>
            <button className="add" type="submit">Добавить авто</button>
          </form>
        </>
      ) : null}

      {carId ? (
        <>
          <h2>4. История этого авто</h2>
          {history.length === 0 ? <p className="note">Записей пока нет.</p> : null}
          <ul className="history" id="history">
            {history.map((visit) => (
              <li key={visit.id}>
                {formatWhen(visit.startsAt)} — {visit.serviceName}, {visit.masterName}, {STATUS[visit.status] || visit.status}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {carId && masterId ? (
        <>
          <h2>5. Свободное время</h2>
          <p className="note">Занятые окна этого мастера выбрать нельзя.</p>
          {days.map((day) => (
            <div key={day}>
              <h3>{formatWhen(day)}</h3>
              <div className="grid">
                {slots.filter((slot) => slot.date === day).map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    disabled={!slot.free}
                    className={startsAt === slot.startsAt ? "opt active" : "opt"}
                    onClick={() => setStartsAt(slot.startsAt)}
                  >
                    {slot.time}{slot.free ? "" : " · занято"}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <h2>6. Контакты</h2>
          <form onSubmit={submit}>
            <label>
              Имя
              <input id="customer-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              Телефон
              <input id="customer-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            </label>
            {error ? <p className="err">{error}</p> : null}
            <button className="submit" id="save-booking" type="submit" disabled={busy || !startsAt}>
              {busy ? "Сохраняем…" : "Записать"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
