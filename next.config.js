/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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