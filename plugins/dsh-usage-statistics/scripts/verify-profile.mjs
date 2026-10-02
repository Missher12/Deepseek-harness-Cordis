/** Install the packed plugin through the real CLI, boot, read, remove, and compare. */
import {spawn, execFileSync} from 'node:child_process'
import {mkdir, mkdtemp, readFile, writeFile, readdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname, resolve, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = process.env.DSH_SOURCE_DIR
if (!source) throw new Error('Set DSH_SOURCE_DIR to a built Harness 0.2.0-rc.1 or 0.2.0-rc.2 source tree')
const cli = resolve(source, 'apps/cli/lib/bin.js')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const runtime = JSON.parse(await readFile(join(source, 'apps/cli/package.json'), 'utf8')).version
assert.equal(runtime, manifest.devDependencies['@deepseek-ai/dsh-session-persistence'])
const artifact = join(root, `dist/missher-dsh-usage-statistics-${manifest.version}.tgz`)
const installSpec = process.env.DSH_INSTALL_SPEC ?? artifact
const label = installSpec === artifact ? 'tarball' : 'directory'
await mkdir(join(root, '.verification'), {recursive: true})
const work = await mkdtemp(join(root, '.verification/profile-'))
await writeFile(join(work, 'package.json'), JSON.stringify({name:'usage-statistics-acceptance-fixtures',private:true,type:'module'}))
await writeFile(join(work, 'seed.mjs'), await readFile(join(root, 'scripts/acceptance-seed.mjs')))
const home = join(work, 'home')
const env = Object.fromEntries(['PATH','HOME','TMPDIR','LANG','TZ'].filter(k => process.env[k]).map(k => [k, process.env[k]]))
Object.assign(env, {DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1', MISSHER_TENCENTDB_DIR: join(work, 'unused-memory')})
// Use the SDK's pinned pnpm without changing system configuration or admission policy.
env.PATH = join(source, 'node_modules/.bin') + (process.platform === 'win32' ? ';' : ':') + (env.PATH ?? '')
const pnpmVersion = execFileSync('pnpm', ['--version'], {env, encoding: 'utf8'}).trim()
const expectedPnpm = JSON.parse(await readFile(join(source, 'package.json'), 'utf8')).packageManager.split('@')[1]
assert.equal(pnpmVersion, expectedPnpm)
const run = args => execFileSync(process.execPath, [cli, ...args], {cwd: work, env, encoding: 'utf8', stdio: ['ignore','pipe','pipe'], timeout: 60_000})
const profile = 'usage-preview'
const patch = join(home, 'profiles', profile, 'cordis.patch.yml')
const base = run(['--profile', profile, '--from-default-profile', 'web', '--dump-config'])
await writeFile(join(work, 'install.log'), run(['plugin', '--profile', profile, 'add', installSpec, '--offline']))
const composed = run(['--profile', profile, '--dump-config'])
assert(composed.includes('missher-usage-statistics'))
await writeFile(join(work, 'composed.yml'), composed)
let child
let closed
async function stop() {
  if (!child) return
  child.kill('SIGTERM')
  const timer = setTimeout(() => child?.kill('SIGKILL'), 8000)
  await closed
  clearTimeout(timer)
  child = undefined
}
async function bootAndRead(mode) {
  const receipt = join(work, `${mode}.json`)
  const reporter = join(work, `${mode}-reporter.mjs`)
  const installed = mode !== 'removed'
  await writeFile(reporter, `import {writeFile,rename} from 'node:fs/promises';
export const inject=${JSON.stringify(installed ? ['usageStatistics','usageStatisticsAcceptanceSeed'] : ['usageStatisticsAcceptanceSeed'])};
export async function apply(ctx){const snapshot=${installed ? 'await ctx.usageStatistics.snapshot()' : 'null'};await writeFile(${JSON.stringify(receipt+'.tmp')},JSON.stringify({snapshot,pluginActive:ctx.get('usageStatistics')!==undefined}));await rename(${JSON.stringify(receipt+'.tmp')},${JSON.stringify(receipt)});}`)
  await writeFile(patch, `- insert:\n    - id: acceptance-seed\n      name: ${JSON.stringify(join(work,'seed.mjs'))}\n    - id: acceptance-reporter\n      name: ${JSON.stringify(reporter)}\n`)
  child = spawn(process.execPath, [cli,'--profile',profile,'--no-open','--host','127.0.0.1','--port','0'], {cwd: work, env, stdio:['ignore','pipe','pipe']})
  let log = ''
  child.stdout.on('data', chunk => { log += chunk.toString() })
  child.stderr.on('data', chunk => { log += chunk.toString() })
  closed = new Promise(resolve => child.once('exit', resolve))
  const deadline = Date.now()+40_000
  while (!existsSync(receipt)) {
    if (Date.now()>deadline || child.exitCode!==null) {
      await writeFile(join(work, `${mode}.log`), log)
      throw new Error(`Profile ${mode} failed; inspect ${work}/${mode}.log`)
    }
    await new Promise(resolve => setTimeout(resolve,100))
  }
  const report = JSON.parse(await readFile(receipt,'utf8'))
  await writeFile(join(work, `${mode}.log`), log)
  if (installed) {
    assert.equal(report.snapshot.summary.totalTokens,30_000)
    assert.equal(report.snapshot.insights.cacheHitRate,0.76)
    assert.equal(report.snapshot.sessionCount,1)
    assert.equal(report.snapshot.omittedSessions,0)
    assert.equal(report.snapshot.hourly.tokens.length,24)
    assert.equal(report.snapshot.hourly.tokens.reduce((a,b)=>a+b,0),30_000)
  } else assert.equal(report.snapshot,null)
  assert.equal(report.pluginActive,installed)
  await stop()
  await writeFile(join(work, `${mode}.log`), log)
  return report.snapshot
}
async function protectedSessions(dir, result={}) {
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    const path=join(dir,entry.name)
    if(entry.isDirectory()) await protectedSessions(path,result)
    else if(entry.isFile()) result[path.slice(home.length)]=createHash('sha256').update(await readFile(path)).digest('hex')
  }
  return result
}
try {
  await bootAndRead('installed')
  const before=await protectedSessions(join(home,'sessions'))
  // Preserve the v1 domain / v4 derived rows across process and Bundle lifetimes.
  const cachePath=join(home,'storages','missher_usage_statistics.json')
  const cacheBefore=await readFile(cachePath)
  const cache=JSON.parse(cacheBefore)
  assert.deepEqual(cache.unit,{name:'missher_usage_statistics',version:1})
  assert.equal(cache.tables.sessions['usage-statistics-validation-v4'].schemaVersion,4)
  // Simulate a valid previous-release cache. Only derived facts may be rebuilt.
  const legacy=structuredClone(cache)
  legacy.tables.sessions['usage-statistics-validation-v4'].schemaVersion=3
  delete legacy.tables.sessions['usage-statistics-validation-v4'].row.hourly
  await writeFile(cachePath,JSON.stringify(legacy))
  await bootAndRead('upgraded-v3')
  assert.deepEqual(await readFile(cachePath),cacheBefore)
  assert.deepEqual(await protectedSessions(join(home,'sessions')),before)
  await bootAndRead('restarted')
  assert.deepEqual(await readFile(cachePath),cacheBefore)
  assert.deepEqual(await protectedSessions(join(home,'sessions')),before)
  await writeFile(patch,'[]\n')
  await writeFile(join(work,'remove.log'),run(['plugin','--profile',profile,'remove','@missher/dsh-usage-statistics']))
  assert.equal(run(['--profile',profile,'--dump-config']),base)
  await bootAndRead('removed')
  assert.deepEqual(await protectedSessions(join(home,'sessions')),before)
  assert.deepEqual(await readFile(cachePath),cacheBefore)
  await writeFile(join(work,'reinstall.log'),run(['plugin','--profile',profile,'add',installSpec,'--offline']))
  await bootAndRead('reinstalled')
  assert.deepEqual(await readFile(cachePath),cacheBefore)
  assert.deepEqual(await protectedSessions(join(home,'sessions')),before)
  await writeFile(patch,'[]\n')
  const report={runtime,pnpmVersion,version:manifest.version,installKind:label,profileWork:work,artifactSha256:createHash('sha256').update(await readFile(artifact)).digest('hex'),install:true,loaderBoot:true,hostSnapshotRead:true,syntheticTokens:30_000,cacheHitRate:0.76,uninstallRestoresBase:true,pluginServiceRemoved:true,sessionBytesUnchanged:true,cacheDomainVersion:1,cacheRowVersion:4,legacyV3RebuiltWithoutSessionWrites:true,hourlyTokens:30_000,cacheBytesUnchangedAfterRestartRemoveReinstall:true,reinstallRestoresStatistics:true,realModel:false}
  await writeFile(join(root,`verification/profile-${label}.json`),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
} finally {await stop()}
