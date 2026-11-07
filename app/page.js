import Book from "@/components/Book";
import { listCatalog } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await listCatalog();
  return (
    <main>
      <h1>Запись в автосервис</h1>
      <p className="lead">
        Диагностика, ремонт, замена масла и мойка. Выберите мастера, автомобиль и свободное окно.
      </p>
      <Book services={catalog.services} masters={catalog.masters} initialCars={catalog.cars} />
    </main>
  );
}
