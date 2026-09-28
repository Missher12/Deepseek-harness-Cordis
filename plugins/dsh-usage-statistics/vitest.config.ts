import { defineConfig } from 'vitest/config'
import { standardDecoratorPlugin } from '../../vitest.shared.ts'
export default defineConfig({
  plugins: [standardDecoratorPlugin()],
  test: {include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'], environment: 'node', execArgv: ['--no-experimental-webstorage'], testTimeout: 15_000},
})
