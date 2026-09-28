import {build} from 'esbuild'
import {transform} from 'lightningcss'
import {readFile, mkdir, writeFile} from 'node:fs/promises'
import {resolve, dirname, relative} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const external = ['react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-ui-slots']
const css = {
  name: 'scoped-css',
  setup(builder) {
    builder.onResolve({filter: /\.css(?:\?inline)?$/}, args => ({
      path: resolve(args.resolveDir, args.path.replace(/\?inline$/, '')),
      namespace: args.path.endsWith('?inline') ? 'css-text' : 'css-module',
    }))
    for (const namespace of ['css-text', 'css-module']) builder.onLoad({filter: /.*/, namespace}, async args => {
      const result = transform({filename: relative(root, args.path), code: await readFile(args.path), minify: true, cssModules: {pattern: '[hash]_[local]'}})
      const value = namespace === 'css-text' ? result.code.toString() : Object.fromEntries(Object.entries(result.exports ?? {}).map(([key, entry]) => [key, entry.name]))
      return {loader: 'js', contents: `export default ${JSON.stringify(value)};`}
    })
  },
}
await mkdir(resolve(root, 'lib'), {recursive: true})
const common = {absWorkingDir: root, bundle: true, target: 'es2022', minifyWhitespace: true, logLevel: 'info'}
await build({...common, entryPoints: ['src/index.ts', 'src/typert.ts'], outdir: 'lib', platform: 'node', format: 'esm', packages: 'external'})
const result = await build({...common, entryPoints: ['src/client/index.ts'], outfile: 'lib/client.js', platform: 'browser', format: 'cjs', jsx: 'automatic', external, plugins: [css],
  define: {'process.env.NODE_ENV': '"production"'},
  banner: {js: `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;`},
  footer: {js: 'return module.exports;}});'}, metafile: true,
})
await mkdir(resolve(root, 'verification'), {recursive: true})
await writeFile(resolve(root, 'verification/build.json'), JSON.stringify({version: manifest.version, externalImports: result.metafile.outputs['lib/client.js'].imports}, null, 2)+'\n')
