import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/server.ts'],
  format: 'esm',
  target: 'node22',
  clean: true,
  dts: false,
});
