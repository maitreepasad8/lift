// Copies Tesseract's worker, wasm core and English language data into
// public/tesseract so they ship inside the extension (MV3 forbids remote code).
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`))

const out = 'public/tesseract'
rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'core'), { recursive: true })
mkdirSync(join(out, 'lang'), { recursive: true })

cpSync(join(pkgDir('tesseract.js'), 'dist/worker.min.js'), join(out, 'worker.min.js'))

// We run the LSTM engine only, so tesseract.js picks one of these by CPU support.
const coreDir = pkgDir('tesseract.js-core')
for (const file of [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]) {
  cpSync(join(coreDir, file), join(out, 'core', file))
}

cpSync(
  join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int/eng.traineddata.gz'),
  join(out, 'lang/eng.traineddata.gz'),
)

console.log(`Tesseract assets copied to ${out}`)
