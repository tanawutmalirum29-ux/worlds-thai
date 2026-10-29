import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins:[react()],
  server:{host:'0.0.0.0'},
  build:{rollupOptions:{input:{
    main:fileURLToPath(new URL('./index.html',import.meta.url)),
    admin:fileURLToPath(new URL('./khw-admin-14c2a0bd51d3fb0266f2ce0c9beb67c16dbf1e4700c5efaa0842e1a5.html',import.meta.url))
  }}}
});
