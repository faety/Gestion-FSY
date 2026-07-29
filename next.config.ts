import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // Inclut la base de démonstration dans les fonctions serverless (Vercel)
  outputFileTracingIncludes: {
    "/**": ["./prisma/demo.db"],
  },
};

export default nextConfig;
