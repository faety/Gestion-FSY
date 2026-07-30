// Périmètre de la conférence FSY 2026 Abidjan Ouest.
//
// Le fichier d'inscription officiel contenait des unités qui ne relèvent pas de
// cette conférence : elles s'y sont glissées par erreur lors de l'export. Les
// inscrits correspondants ont été retirés de prisma/participants.json.
//
// Cette liste est conservée pour deux raisons : documenter le retrait, et
// permettre de refiltrer un nouvel export du fichier d'inscription sans avoir à
// retrouver de mémoire quelles unités écarter.
export const UNITES_HORS_PERIMETRE = [
  "District de Dakar Senegal",
  "Mission West",
  "Pieu de Roosevelt Utah West",
];

export const dansLePerimetre = (pieu: string) => !UNITES_HORS_PERIMETRE.includes(pieu);
