import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Imports the plugin as a default export

export default defineConfig({
  plugins: [react()], // Use 'react()' instead of 'vitePluginReact()'
  server: {
    port: 5173,
    host: true
  }
});