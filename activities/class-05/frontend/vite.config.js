// Multi-page setup: /app (deliverable 05A) and /learn (deliverable 05B)
// grow inside the same project for two weeks.
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        app: fileURLToPath(new URL('app/index.html', import.meta.url)),
        learn: fileURLToPath(new URL('learn/index.html', import.meta.url))
      }
    }
  }
});
