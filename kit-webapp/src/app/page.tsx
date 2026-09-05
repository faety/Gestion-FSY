import { redirect } from "next/navigation";
import { getUtilisateur } from "@/lib/auth";

// La racine : vers l'accueil connecté, ou la connexion. Remplacer par une
// page de présentation publique si l'application en a une.
export default async function RacinePage() {
  const user = await getUtilisateur();
  redirect(user ? "/accueil" : "/login");
}
