/**
 * PostCSS config for Tailwind CSS v4.
 * v4 uses the @tailwindcss/postcss plugin. No tailwind.config.ts is needed —
 * the design tokens live in src/app/globals.css via the @theme block.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
