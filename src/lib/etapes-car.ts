// Les trois moments où l'on coche les noms des jeunes à un car.
export const ETAPES_CAR = [
  {
    cle: "MONTEE",
    label: "Départ du pieu",
    description: "Montée dans le car, au pieu ou district, le jour de l'arrivée",
    badge: "🚌 Monté",
    couleur: "blue",
  },
  {
    cle: "ARRIVEE",
    label: "Arrivée au site",
    description: "Descente du car, à l'arrivée sur le lieu de la conférence",
    badge: "✅ Arrivé",
    couleur: "green",
  },
  {
    cle: "DEPART",
    label: "Retour (dernier jour)",
    description: "Montée dans le car le samedi 8 août, pour le départ du lieu de la conférence",
    badge: "🏠 Reparti",
    couleur: "orange",
  },
] as const;

export type EtapeCar = (typeof ETAPES_CAR)[number]["cle"];

export const ETAPES_VALIDES: readonly string[] = ETAPES_CAR.map((e) => e.cle);

export const etapeCar = (cle: string) => ETAPES_CAR.find((e) => e.cle === cle);
