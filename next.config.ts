import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    // Les rapports quotidiens peuvent porter deux photos réduites côté
    // navigateur ; la limite par défaut d'une action serveur (1 Mo) est juste.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
