// Demo mode runs the app entirely against local mock data, with no backend
// and no auth check. Enabled at build time for the static GitHub Pages
// deploy (see .github/workflows/deploy.yml).
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
