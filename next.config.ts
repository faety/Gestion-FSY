import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    // Les rapports quotidiens peuvent porter deux photos réduites côté
    // navigateur ; la limite par défaut d'une action serveur (1 Mo) est juste.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Inclut la base de démonstration dans les fonctions serverless (Vercel)
  outputFileTracingIncludes: {
    "/**": ["./prisma/demo.db"],
  },
};

export default nextConfig;
