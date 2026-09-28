import {execFileSync} from 'node:child_process'
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
mkdirSync(join(root, 'dist'), {recursive: true})
const output = execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', 'dist'], {cwd: root, encoding: 'utf8'})
const [pack] = JSON.parse(output)
const file = join(root, 'dist', pack.filename)
const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex')
writeFileSync(join(root, 'dist', 'SHA256SUMS'), `${sha256}  ${pack.filename}\n`)
console.log(JSON.stringify({file, sha256, files: pack.files.length, size: pack.size}, null, 2))
