import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages: https://pv-dn.github.io/price-lookup/
export default defineConfig({
  plugins: [react()],
  base: "/price-lookup/",
});
