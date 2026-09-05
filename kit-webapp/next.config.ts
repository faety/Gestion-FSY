import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ces paquets s'exécutent côté Node et ne doivent pas être empaquetés par
  // Next : sans cette ligne, Prisma et bcrypt échouent au déploiement.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    // Limite par défaut d'une action serveur : 1 Mo. À relever dès qu'un
    // formulaire porte une image ou un fichier — mais les photos passent de
    // préférence directement chez Cloudinary (voir src/lib/cloudinary.ts).
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
