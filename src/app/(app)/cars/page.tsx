import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { ETAPES_CAR } from "@/lib/etapes-car";
import { A_ANNONCER } from "@/lib/report";
import { EncartReport } from "@/components/BandeauReport";
import { RafraichirAuto } from "@/components/RafraichirAuto";

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
      clotures: true,
    },
  });

  // Tri numérique : « Car 2 » avant « Car 10 », que le tri alphabétique inverse.
  cars.sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { numeric: true, sensitivity: "base" })
  );

  // Un jeune ne compte qu'une fois par étape, et l'heure du dernier pointage
  // dit si le car est « en cours » : c'est le tableau de bord du direct.
  const mouvements = await prisma.mouvement.findMany({
    select: { carId: true, type: true, jeuneId: true, horodatage: true },
  });
  const parEtape = new Map<string, { jeunes: Set<string>; dernier: Date }>();
  for (const m of mouvements) {
    const cle = `${m.carId}|${m.type}`;
    const e = parEtape.get(cle) ?? { jeunes: new Set<string>(), dernier: m.horodatage };
    e.jeunes.add(m.jeuneId);
    if (m.horodatage > e.dernier) e.dernier = m.horodatage;
    parEtape.set(cle, e);
  }
  const compte = (carId: string, type: string) =>
    parEtape.get(`${carId}|${type}`)?.jeunes.size ?? 0;
  const dernierPointage = (carId: string, type: string) =>
    parEtape.get(`${carId}|${type}`)?.dernier ?? null;
  const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const nonAffectes = cars.reduce(
    (n, c) =>
      n + ETAPES_CAR.filter((e) => !c.affectations.some((a) => a.etape === e.cle)).length,
    0
  );

  return (
    <div className="space-y-4">
      <RafraichirAuto secondes={12} />
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
                const cloture = car.clotures.find((c) => c.etape === e.cle) ?? null;
                const dernier = dernierPointage(car.id, e.cle);
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
                    <span className="text-right shrink-0">
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 whitespace-nowrap inline-block ${
                          cloture
                            ? "bg-green-600 text-white"
                            : e.couleur === "blue"
                              ? "bg-blue-50 text-blue-700"
                              : e.couleur === "green"
                                ? "bg-green-50 text-green-700"
                                : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {cloture ? `🔒 ${cloture.pointes}` : compte(car.id, e.cle)}/
                        {car.pieu._count.jeunes}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {cloture
                          ? `clôturé à ${fmtHeure.format(cloture.clotureLe)}`
                          : dernier
                            ? `en cours · dernier à ${fmtHeure.format(dernier)}`
                            : "pas commencé"}
                      </span>
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
