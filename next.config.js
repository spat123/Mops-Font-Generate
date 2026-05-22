/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
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
    },
  },
};

module.exports = nextConfig; 