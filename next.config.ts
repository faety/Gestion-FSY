import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "exceljs"],
  experimental: {
    // Les rapports quotidiens portent deux photos réduites côté navigateur, et
    // le fichier d'inscription entier se verse d'un coup : la limite par défaut
    // d'une action serveur (1 Mo) est juste dans les deux cas.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
