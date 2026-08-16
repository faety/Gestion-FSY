import { exigerUtilisateur } from "@/lib/auth";
import { Photobooth } from "@/components/Photobooth";

export const metadata = { title: "Photobooth souvenir" };

// L'iPad de l'événement, en mode borne : la tablette reste connectée sur un
// compte encadrant, ouverte sur cette page, et les jeunes défilent. Conseil
// pratique : verrouiller l'iPad sur Safari avec « Accès guidé » (triple clic
// sur le bouton latéral) pour que personne ne sorte de la page.
export default async function SouvenirPage() {
  await exigerUtilisateur();
  return <Photobooth />;
}
