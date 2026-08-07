import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { ETAPES_CAR } from "@/lib/etapes-car";
import { A_ANNONCER } from "@/lib/report";
import { EncartReport } from "@/components/BandeauReport";

export default async function CarsPage() {
  const user = await exigerUtilisateur();

  const cars = await prisma.car.findMany({
    include: {
      pieu: {
        include: {
          _count: { select: { jeunes: { where: { statutInscription: { not: "Annulé(e)" } } } } },
        },
      },
      affectations: { include: { user: true } },
    },
  });

  // Tri numérique : « Car 2 » avant « Car 10 », que le tri alphabétique inverse.
  cars.sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { numeric: true, sensitivity: "base" })
  );

  const mouvements = await prisma.mouvement.groupBy({ by: ["carId", "type"], _count: true });
  const compte = (carId: string, type: string) =>
    mouvements.find((m) => m.carId === carId && m.type === type)?._count ?? 0;

  const nonAffectes = cars.reduce(
    (n, c) =>
      n + ETAPES_CAR.filter((e) => !c.affectations.some((a) => a.etape === e.cle)).length,
    0
  );

  return (
    <div className="space-y-4">
      {A_ANNONCER && (
        <EncartReport precision="Les affectations sont conservées. Le trajet est plus long qu'annoncé au départ : le site est à Jacqueville, et non à Abidjan — prévoyez-le avec les pieux." />
      )}
      <div>
        <h1 className="text-2xl font-bold">🚌 Cars — Arrivées & départs</h1>
        <p className="text-slate-500 text-sm">
          Un car par pieu ou district. Pour chaque car, le couple dirigeant et les
          coordinateurs principaux désignent qui coche les noms à chacune des trois étapes.
        </p>
      </div>

      {nonAffectes > 0 && (
        <p className="text-sm bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-800">
          <strong>{nonAffectes} pointage(s) sans personne affectée</strong> sur{" "}
          {cars.length * ETAPES_CAR.length}. Ouvrez un car pour désigner qui coche les noms.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {cars.map((car) => (
          <Link
            key={car.id}
            href={`/cars/${car.id}`}
            className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition block"
          >
            <div className="font-bold">{car.nom}</div>
            <div className="text-sm text-slate-500">
              {car.pieu._count.jeunes} jeunes attendus · capacité {car.capacite}
            </div>

            <ul className="mt-3 space-y-1.5">
              {ETAPES_CAR.map((e) => {
                const pointeurs = car.affectations.filter((a) => a.etape === e.cle);
                const jeSuisAffecte = pointeurs.some((a) => a.userId === user.id);
                return (
                  <li key={e.cle} className="text-sm flex items-start justify-between gap-2">
                    <span className="text-slate-600">
                      {e.label}
                      <span className="block text-xs text-slate-400">
                        {pointeurs.length === 0 ? (
                          <span className="text-amber-700">Personne d'affecté</span>
                        ) : (
                          pointeurs.map((a) => `${a.user.prenom} ${a.user.nom}`).join(", ")
                        )}
                        {jeSuisAffecte && <span className="text-fsy font-medium"> · vous</span>}
                      </span>
                    </span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 whitespace-nowrap ${
                        e.couleur === "blue"
                          ? "bg-blue-50 text-blue-700"
                          : e.couleur === "green"
                            ? "bg-green-50 text-green-700"
                            : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {compte(car.id, e.cle)}/{car.pieu._count.jeunes}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Link>
        ))}
      </div>
    </div>
  );
}
