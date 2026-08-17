import { defineConfig, loadEnv, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// Local-sandbox fallback: if the root node_modules cannot be modified (read-only
// environment), runtime packages are vendored into ./nm2. On Vercel, where a
// normal `npm install` populates node_modules, nm2 does not exist and these
// aliases resolve normally to node_modules.
const RUNTIME_PKGS = [
  'react', 'react-dom', 'react-router-dom', '@supabase/supabase-js',
  'framer-motion', 'lucide-react', 'gsap', 'zustand',
  '@tanstack/react-query', '@tanstack/react-virtual', 'katex', 'react-markdown',
  'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-highlight',
];
// zustand's dual-package "exports" field is bypassed by directory aliases in
// some bundler paths; point directly at its ESM entries (subpaths first, so
// the re-export chain in esm/index.mjs resolves to mjs files, not CJS).
const buildVendorAliases = (): Record<string, string> => {
  const aliases: Array<[string, string]> = [
    ['zustand/vanilla', 'nm2/node_modules/zustand/esm/vanilla.mjs'],
    ['zustand/react', 'nm2/node_modules/zustand/esm/react.mjs'],
    ['zustand', 'nm2/node_modules/zustand/esm/index.mjs'],
    ...RUNTIME_PKGS.filter((k) => k !== 'zustand').map((k) => [k, `nm2/node_modules/${k}`] as [string, string]),
  ];
  return Object.fromEntries(
    aliases.map(([k, rel]) => [k, path.resolve(__dirname, rel)] as const).filter(([, p]) => fs.existsSync(p))
  );
};

const NM2_ENABLED =
  process.env.NM2_VENDOR === '1' && fs.existsSync(path.resolve(__dirname, 'nm2/node_modules'));

const vendoredAliases: Record<string, string> = NM2_ENABLED ? buildVendorAliases() : {};

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-ignore
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {}

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  const config: UserConfig = {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    resolve: { alias: vendoredAliases },
  };
  return config;
})
