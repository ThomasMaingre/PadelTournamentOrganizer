/** @type {import('next').NextConfig} */
const nextConfig = {
  // Génère .next/standalone + server.js pour le conteneur
  output: "standalone",

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Tu désactives l’Image Optimization (OK en Docker si tu veux éviter sharp)
  images: {
    unoptimized: true,
  },
}

export default nextConfig
