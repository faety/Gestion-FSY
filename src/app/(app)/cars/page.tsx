import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function CarsPage() {
  const cars = await prisma.car.findMany({
    include: {
      pieu: { include: { _count: { select: { jeunes: true } } } },
      responsable: true,
    },
    orderBy: { nom: "asc" },
  });

  // Derniers mouvements par jeune pour compter montés/arrivés/partis par car
  const mouvements = await prisma.mouvement.groupBy({
    by: ["carId", "type"],
    _count: true,
  });
  const compte = (carId: string, type: string) =>
    mouvements.find((m) => m.carId === carId && m.type === type)?._count ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🚌 Cars — Arrivées & départs</h1>
      <p className="text-slate-500 text-sm">
        Chaque car est rattaché à un pieu/district. Le conseiller responsable valide les
        montées, arrivées et départs des jeunes.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {cars.map((car) => (
          <Link
            key={car.id}
            href={`/cars/${car.id}`}
            className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition block"
          >
            <div className="font-bold">{car.nom}</div>
            <div className="text-sm text-slate-500 mt-1">
              {car.pieu._count.jeunes} jeunes du pieu — capacité {car.capacite}
            </div>
            <div className="text-sm text-slate-500">
              Responsable :{" "}
              {car.responsable ? `${car.responsable.prenom} ${car.responsable.nom}` : "—"}
            </div>
            <div className="flex gap-2 mt-3 text-xs">
              <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-1">
                Montés : {compte(car.id, "MONTEE")}
              </span>
              <span className="bg-green-50 text-green-700 rounded-full px-2 py-1">
                Arrivés : {compte(car.id, "ARRIVEE")}
              </span>
              <span className="bg-orange-50 text-orange-700 rounded-full px-2 py-1">
                Partis : {compte(car.id, "DEPART")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
