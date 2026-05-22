/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_DEV_PRO_SIMULATION: process.env.DEV_PRO_SIMULATION || process.env.NEXT_PUBLIC_DEV_PRO_SIMULATION || '',
  },
  // Pyodide (@web-alchemy/fonttools) только на сервере (API routes), не в клиентском бандле.
  experimental: {
    outputFileTracingIncludes: {
      '/api/generate-static-font': [
        './node_modules/pyodide/**/*',
        './node_modules/@web-alchemy/fonttools/**/*',
        './utils/fonttoolsWebalchemyWorker.mjs',
      ],
      '/api/convert-font-format': [
        './node_modules/pyodide/**/*',
        './node_modules/@web-alchemy/fonttools/**/*',
        './utils/fonttoolsWebalchemyWorker.mjs',
      ],
      // next-auth / openid-client на ONREZA (Bun standalone): без jose → MODULE_NOT_FOUND
      '/api/auth/[...nextauth]': [
        './node_modules/jose/**/*',
        './node_modules/openid-client/**/*',
        './node_modules/next-auth/**/*',
      ],
    },
  },
};

module.exports = nextConfig; 