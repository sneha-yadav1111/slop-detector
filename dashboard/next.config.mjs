/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The shared scoring core lives outside dashboard/ (../src/core). Allow Next to compile it.
  outputFileTracingRoot: new URL('..', import.meta.url).pathname,
  webpack(config) {
    // The core uses NodeNext-style explicit ".js" import specifiers that point at
    // ".ts" source files. Teach webpack to resolve "./foo.js" -> "./foo.ts".
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    }
    return config
  },
}

export default nextConfig
