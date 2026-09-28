/** Verify native directory installation, activation, RPC, charts, and removal on DSH 0.1.7. */
import {_electron as electron} from 'playwright'
import {initProfile} from '@deepseek-ai/dsh-app-boot'
import {mkdir, mkdtemp, readFile, writeFile, readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve, join} from 'node:path'
import assert from 'node:assert/strict'
const plugin=resolve('.')
await mkdir(resolve('.verification'),{recursive:true})
const root=await mkdtemp(resolve('.verification/native-017-'))
const home=join(root,'home')
const fixtures=join(root,'fixtures')
const output=resolve('output/playwright/0.2.0')
await mkdir(fixtures,{recursive:true});await mkdir(output,{recursive:true})
await writeFile(join(fixtures,'package.json'),JSON.stringify({name:'usage-native-acceptance-fixtures',private:true,type:'module'}))
await writeFile(join(fixtures,'seed.mjs'),await readFile('scripts/acceptance-seed.mjs'))
const profile=join(home,'profiles/desktop')
initProfile(profile,['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app'])
await writeFile(join(profile,'cordis.patch.yml'),`- insert:\n    - id: acceptance-seed\n      name: ${JSON.stringify(join(fixtures,'seed.mjs'))}\n`)
const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG','TZ'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]))
Object.assign(env,{DSH_HOME:home,DSH_TELEMETRY_DISABLED:'1'})
const executable=process.env.DSH_DESKTOP_EXECUTABLE
if(!executable)throw new Error('Set DSH_DESKTOP_EXECUTABLE to an unwrapped Desktop 0.1.7-rc.2 reference build that respects DSH_HOME')
let app,page
const errors=[]
async function sessionHashes(dir=join(home,'sessions'),result={}){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name)
  if(entry.isDirectory())await sessionHashes(path,result)
  else if(entry.isFile())result[path.slice(home.length)]=createHash('sha256').update(await readFile(path)).digest('hex')
 }
 return result
}
try {
 app=await electron.launch({executablePath:executable,args:[`--user-data-dir=${join(root,'electron')}`],cwd:root,env,timeout:60_000})
 app.on('window',p=>{p.on('pageerror',e=>errors.push(e.message))})
 const deadline=Date.now()+55_000
 while(Date.now()<deadline){
  for(const window of app.windows()){
   if(window.isClosed())continue
   if(await window.getByRole('button',{name:/^(添加 API Key|Add API Key)$/}).isVisible().catch(()=>false))await window.getByRole('button',{name:/^(添加 API Key|Add API Key)$/}).click()
   const later=window.getByRole('button',{name:/^(稍后配置|Set up later|Configure later)$/})
   if(await later.isVisible().catch(()=>false))await later.click()
   if(await window.getByRole('button',{name:/^(插件|Plugins)$/}).isVisible().catch(()=>false)){page=window;break}
  }
  if(page)break
  await new Promise(r=>setTimeout(r,200))
 }
 assert(page,'workspace opened after keyless onboarding')
 console.log('Workspace ready',new URL(page.url()).protocol)
 await page.getByRole('button',{name:/^(插件|Plugins)$/}).click()
 await page.getByRole('button',{name:/^(添加插件|Add plugin)$/}).click()
 const dialog=page.getByRole('dialog').last()
 await dialog.getByRole('textbox').first().fill(plugin)
 await dialog.getByRole('button',{name:/^(安装|Install)$/}).click()
 const enable=page.getByRole('button',{name:/^(立即启用|Enable now)$/})
 await enable.waitFor({timeout:55_000})
 await page.screenshot({path:join(output,'directory-installed.png')})
 console.log('Native directory install accepted')
 await enable.click()
 await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click()
 await page.getByRole('menuitem',{name:/^(设置|Settings)$/}).click()
 const settings=page.locator('[data-shortcut-modal="settings"]')
 await settings.getByRole('button',{name:/^(使用统计|Usage)$/}).waitFor({timeout:30_000})
 await settings.getByRole('button',{name:/^(使用统计|Usage)$/}).click()
 const panel=settings.locator('section[aria-label="Usage"],section[aria-label="使用统计"]')
 await panel.locator('[data-display-tokens="30000"]').waitFor({timeout:25_000})
 assert.equal(await panel.locator('[data-activity-day]').count(),371)
 assert.equal(await page.locator('style[data-plugin="@missher/dsh-usage-statistics"]').count(),1)
 for(const[name,value]of[[/^(每周|Weekly)$/,'weekly'],[/^(累计|Cumulative)$/,'cumulative'],[/^(每日|Daily)$/,'daily']]){
  await panel.getByRole('tab',{name}).click();assert.equal(await panel.locator(`[data-particle-mode="${value}"]`).count(),371)
 }
 await panel.screenshot({path:join(output,'installed-usage.png')})
 const receipt={desktopVersion:await app.evaluate(({app})=>app.getVersion()),scheme:new URL(page.url()).protocol,nativeLocalDirectoryInstall:true,activityCells:371,chartModes:['daily','weekly','cumulative'],syntheticTokens:30_000,text:await panel.innerText(),errors}
 await writeFile(join(output,'native-installed.json'),JSON.stringify(receipt,null,2)+'\n')
 const protectedBefore=await sessionHashes()
 await settings.getByRole('button',{name:/^(关闭|Close)$/}).click()
 await page.getByRole('button',{name:/^(插件|Plugins)$/}).click()
 await page.getByRole('button',{name:/^(查看|View) @missher\/dsh-usage-statistics$/}).click()
 await page.getByRole('button',{name:/^(卸载|Uninstall) @missher\/dsh-usage-statistics$/}).click()
 const confirmation=page.getByRole('dialog').last()
 await confirmation.getByRole('button',{name:/^(卸载|Uninstall)$/}).click()
 await page.getByRole('button',{name:/^(卸载|Uninstall) @missher\/dsh-usage-statistics$/}).waitFor({state:'detached',timeout:55_000})
 await page.getByRole('button',{name:/^(账号菜单|Account menu)$/}).click()
 await page.getByRole('menuitem',{name:/^(设置|Settings)$/}).click()
 assert.equal(await page.locator('[data-shortcut-modal="settings"]').getByRole('button',{name:/^(使用统计|Usage)$/}).count(),0)
 assert.equal(await page.locator('style[data-plugin="@missher/dsh-usage-statistics"]').count(),0)
 assert.deepEqual(await sessionHashes(),protectedBefore)
 const profileManifest=JSON.parse(await readFile(join(profile,'package.json'),'utf8'))
 assert(!profileManifest.dsh.profile.bundles.includes('@missher/dsh-usage-statistics'))
 assert.deepEqual(errors,[])
 const {text,...summary}=receipt
 const report={...summary,nativeUninstall:true,usageEntryRemoved:true,pluginStylesRemoved:true,sessionBytesUnchanged:true,realModel:false,entrySha256:{}}
 for(const entry of ['lib/index.js','lib/client.js','lib/typert.js'])report.entrySha256[entry]=createHash('sha256').update(await readFile(entry)).digest('hex')
 await writeFile(join(output,'native-removed.json'),JSON.stringify(report,null,2)+'\n')
 await writeFile(resolve('verification/native.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report,null,2))
} catch(error){
 for(const[pIndex,p]of(app?.windows()??[]).entries()){
  if(p.isClosed())continue
  const body=await p.locator('body').innerText().catch(()=> '')
  await writeFile(join(output,`failure-${pIndex}.txt`),body+'\n'+errors.join('\n'))
  await p.screenshot({path:join(output,`failure-${pIndex}.png`)}).catch(()=>{})
  console.error(body.slice(0,5500))
 }
 throw error
} finally {
 if(app){const timer=setTimeout(()=>app.process().kill('SIGTERM'),8000);await app.close().catch(()=>{});clearTimeout(timer)}
}
