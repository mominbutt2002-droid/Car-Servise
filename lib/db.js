import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const state = globalThis.__nordPg ?? { pool: undefined, local: undefined, seed: undefined };
globalThis.__nordPg = state;

export async function sql(text, params = []) {
  if (databaseUrl !== "") {
    state.pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await state.pool.query(text, params)).rows;
  }
  state.local ??= startLocal().catch((error) => {
    state.local = undefined;
    throw error;
  });
  return (await (await state.local).query(text, params)).rows;
}

async function startLocal() {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}

function ensureSeed() {
  state.seed ??= seedIfEmpty().catch((error) => {
    state.seed = undefined;
    throw error;
  });
  return state.seed;
}

function moscowNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

function addDays(dateStr, days) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function weekday(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function openDays(count = 5) {
  const { date } = moscowNow();
  const days = [];
  for (let i = 0; days.length < count && i < 21; i += 1) {
    const cursor = addDays(date, i);
    if (weekday(cursor) !== 0) days.push(cursor);
  }
  return days;
}

function stamp(date, hour) {
  return `${date}T${String(hour).padStart(2, "0")}:00`;
}

function asNumber(value) {
  return value == null ? value : Number(value);
}

async function seedIfEmpty() {
  const [{ c }] = await sql("SELECT COUNT(*)::int AS c FROM services");
  if (Number(c) > 0) return;

  const services = [
    [1, "Диагностика", "service"],
    [2, "Ремонт", "service"],
    [3, "Замена масла", "service"],
    [4, "Мойка", "detailing"],
  ];
  for (const row of services) {
    await sql("INSERT INTO services (id, name, kind) VALUES ($1, $2, $3)", row);
  }

  const masters = [
    [1, "Андрей Соколов", "Механик"],
    [2, "Игорь Лебедев", "Диагност"],
    [3, "Елена Морозова", "Детейлер"],
  ];
  for (const row of masters) {
    await sql("INSERT INTO masters (id, name, role) VALUES ($1, $2, $3)", row);
  }

  for (const serviceId of [1, 2, 3]) {
    await sql("INSERT INTO master_services (master_id, service_id) VALUES ($1, $2)", [1, serviceId]);
    await sql("INSERT INTO master_services (master_id, service_id) VALUES ($1, $2)", [2, serviceId]);
  }
  await sql("INSERT INTO master_services (master_id, service_id) VALUES ($1, $2)", [3, 4]);

  await sql("INSERT INTO cars (id, make, model, plate) VALUES ($1, $2, $3, $4)", [1, "Toyota", "Camry", "А123ВС777"]);
  await sql("INSERT INTO cars (id, make, model, plate) VALUES ($1, $2, $3, $4)", [2, "Kia", "Rio", "О789РТ197"]);

  const today = moscowNow().date;
  const next = openDays(2)[0];
  const historyRows = [
    [3, 1, 1, `${addDays(today, -14)}T11:00`, "Сергей Орлов", "+7 916 204-18-33", "completed"],
    [1, 2, 2, `${addDays(today, -8)}T09:00`, "Олег Сафин", "+7 926 318-60-12", "completed"],
    [1, 1, 1, stamp(next, 10), "Сергей Орлов", "+7 916 204-18-33", "scheduled"],
  ];
  for (const row of historyRows) {
    await sql(
      `INSERT INTO bookings (service_id, master_id, car_id, starts_at, customer_name, customer_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      row,
    );
  }
}

export async function listSlots(masterId) {
  await ensureSeed();
  const { date: today, hour: nowHour } = moscowNow();
  const takenRows = await sql(
    "SELECT starts_at FROM bookings WHERE master_id = $1 AND status <> 'cancelled'",
    [masterId],
  );
  const taken = new Set(takenRows.map((row) => row.starts_at));
  const slots = [];
  for (const date of openDays(5)) {
    for (let hour = 9; hour <= 16; hour += 1) {
      if (date === today && hour <= nowHour) continue;
      const startsAt = stamp(date, hour);
      slots.push({
        startsAt,
        date,
        time: `${String(hour).padStart(2, "0")}:00`,
        free: !taken.has(startsAt),
      });
    }
  }
  return slots;
}

export async function listCatalog() {
  await ensureSeed();
  const services = (await sql("SELECT id, name, kind FROM services ORDER BY id")).map((row) => ({
    ...row,
    id: asNumber(row.id),
  }));
  const masters = (await sql("SELECT id, name, role FROM masters ORDER BY id")).map((row) => ({
    ...row,
    id: asNumber(row.id),
  }));
  const links = await sql("SELECT master_id, service_id FROM master_services");
  const cars = (await sql("SELECT id, make, model, plate FROM cars ORDER BY id")).map((row) => ({
    ...row,
    id: asNumber(row.id),
  }));
  return {
    services,
    masters: masters.map((master) => ({
      ...master,
      serviceIds: links
        .filter((link) => asNumber(link.master_id) === master.id)
        .map((link) => asNumber(link.service_id)),
    })),
    cars,
  };
}

export async function history(carId) {
  await ensureSeed();
  const rows = await sql(
    `SELECT b.id, b.starts_at AS "startsAt", b.status, b.customer_name AS "customerName",
            s.name AS "serviceName", m.name AS "masterName"
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN masters m ON m.id = b.master_id
     WHERE b.car_id = $1
     ORDER BY b.starts_at DESC`,
    [carId],
  );
  return rows.map((row) => ({ ...row, id: asNumber(row.id) }));
}

export async function listBookings() {
  await ensureSeed();
  const rows = await sql(
    `SELECT b.id, b.starts_at AS "startsAt", b.status, b.customer_name AS "customerName",
            b.customer_phone AS "customerPhone", s.name AS "serviceName", m.name AS "masterName",
            c.make AS make, c.model AS model, c.plate AS plate
     FROM bookings b
     JOIN services s ON s.id = b.service_id
     JOIN masters m ON m.id = b.master_id
     JOIN cars c ON c.id = b.car_id
     ORDER BY b.starts_at DESC`,
  );
  return rows.map((row) => ({ ...row, id: asNumber(row.id) }));
}

export async function createCar({ make, model, plate }) {
  await ensureSeed();
  const cleanMake = String(make || "").trim();
  const cleanModel = String(model || "").trim();
  const cleanPlate = String(plate || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!cleanMake || !cleanModel || !cleanPlate) {
    return { error: "Укажите марку, модель и госномер" };
  }
  const existing = await sql("SELECT id, make, model, plate FROM cars WHERE plate = $1", [cleanPlate]);
  if (existing[0]) return { car: { ...existing[0], id: asNumber(existing[0].id) } };
  const inserted = await sql(
    `INSERT INTO cars (id, make, model, plate)
     SELECT COALESCE(MAX(id), 0) + 1, $1, $2, $3 FROM cars
     RETURNING id, make, model, plate`,
    [cleanMake, cleanModel, cleanPlate],
  );
  return { car: { ...inserted[0], id: asNumber(inserted[0].id) } };
}

export async function createBooking({ serviceId, masterId, carId, startsAt, customerName, customerPhone }) {
  await ensureSeed();
  const name = String(customerName || "").trim();
  const phone = String(customerPhone || "").trim();
  const service = Number(serviceId);
  const master = Number(masterId);
  const car = Number(carId);
  if (!name || !phone) return { error: "Укажите имя и телефон" };
  if (!service || !master || !car || !startsAt) return { error: "Заполните услугу, мастера, авто и время" };

  const allowed = await sql(
    "SELECT 1 FROM master_services WHERE master_id = $1 AND service_id = $2",
    [master, service],
  );
  const carRow = await sql("SELECT id FROM cars WHERE id = $1", [car]);
  if (!allowed.length || !carRow.length) return { error: "Проверьте услугу, мастера и автомобиль" };

  const offered = (await listSlots(master)).some((slot) => slot.startsAt === startsAt);
  if (!offered) return { error: "Это окно недоступно" };

  let inserted;
  try {
    inserted = await sql(
      `INSERT INTO bookings (service_id, master_id, car_id, starts_at, customer_name, customer_phone, status)
       SELECT $1, $2, $3, $4, $5, $6, 'scheduled'
       WHERE NOT EXISTS (
         SELECT 1 FROM bookings
         WHERE master_id = $2 AND starts_at = $4 AND status <> 'cancelled'
       )
       RETURNING id`,
      [service, master, car, startsAt, name, phone],
    );
  } catch (error) {
    if (error.code === "23505") return { error: "Это время уже занято у выбранного мастера" };
    throw error;
  }
  if (!inserted.length) return { error: "Это время уже занято у выбранного мастера" };
  const booking = (await listBookings()).find((row) => row.id === asNumber(inserted[0].id));
  return { booking };
}
