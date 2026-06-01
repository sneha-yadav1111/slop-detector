import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/action/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    // No sourcemap: this is a published GitHub Action bundle that runs on the
    // runner, not a debuggable library. The .map also varies slightly between
    // machines/OSes, which made the "dist is up to date" CI check flaky.
    sourcemap: false,
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.json', outDir: 'dist' }),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    json(),
  ],
}
