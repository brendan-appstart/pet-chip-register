/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The registry must run anywhere (self-hosted VPS, Docker, or a PaaS). The
  // standalone output bundles a minimal server so the Docker image stays small
  // and has no dependency on a specific host.
  output: 'standalone',
  poweredByHeader: false,
  // Keep the database driver and ORM (which use Node built-ins like node:crypto
  // and native bindings) out of the webpack bundle — they run as native Node
  // requires on the server. Required for the startup migrator in instrumentation.ts.
  serverExternalPackages: ['@libsql/client', 'drizzle-orm', 'sharp'],
  experimental: {
    // Server Actions are used for state-changing owner/portal operations.
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
};

export default nextConfig;
