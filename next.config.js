const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      include: path.resolve(__dirname, 'assets', 'icon', 'edit'),
      type: 'asset/resource',
    });
    return config;
  },
  // Pyodide (@web-alchemy/fonttools) подгружает .asm.js / .wasm динамически — без этого Vercel не кладёт их в serverless trace.
  experimental: {
    outputFileTracingIncludes: {
      '/api/generate-static-font': [
        './node_modules/pyodide/**/*',
        './node_modules/@web-alchemy/fonttools/**/*',
      ],
    },
  },
};

module.exports = nextConfig; 