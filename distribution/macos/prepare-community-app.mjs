// Preserve the existing Intel installation identity in the newly built desktop.
import { createRequire } from 'node:module';
const desktopRequire = createRequire(new URL('../../apps/desktop/package.json', import.meta.url));
const builderRequire = createRequire(desktopRequire.resolve('app-builder-lib/package.json'));
const asar = builderRequire('@electron/asar');
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const candidate = process.argv[2];
const evidence = process.argv[3];
if (!evidence || !path.isAbsolute(evidence)) throw Error('Supply an absolute evidence directory');
fs.mkdirSync(evidence, { recursive: true, mode: 0o700 });
if (fs.existsSync(path.join(evidence, 'before-isolation.asar')) || fs.existsSync(path.join(evidence, 'before-isolation.asar.unpacked'))) throw Error('Use a new evidence directory');
if (!candidate?.endsWith('/DeepSeek Harness.app') || !candidate.includes('/.desktop-build/')) {
  throw Error('Only an isolated candidate application may be modified');
}
const resources = path.join(candidate, 'Contents/Resources');
const source = path.join(resources, 'app.asar');
const output = path.join(resources, 'isolated.asar');
if (fs.existsSync(output)) throw Error('Candidate output already exists');
const bootstrap = fs.readFileSync(path.join(root, 'isolated-bootstrap.mjs'));
const manifest = JSON.parse(asar.extractFile(source, 'package.json'));
if (manifest.version !== '0.2.0-rc.2' || manifest.dshDesktopAppId !== 'com.missher.deepseek-harness.intel.isolated') {
  throw Error('Unexpected version or application identity');
}
const main = asar.extractFile(source, 'lib/main.js').toString();
const protocol = 'if (app.isPackaged || process.env.DSH_DESKTOP_DEV_APP === "1") app.setAsDefaultProtocolClient("dsh");';
if (main.split(protocol).length !== 2) throw Error('Reinspect the protocol registration before adapting this build');
const hostPath = 'dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/index.js';
const host = asar.extractFile(source, hostPath).toString();
if (host.split('"19387"').length !== 2) throw Error('Reinspect the Host port before adapting this build');
manifest.main = 'lib/isolated-bootstrap.js';
manifest.dshCommunityDesktop = { name: 'Missher DeepSeek Harness Desktop', platform: 'mac-x64', preparation: 'distribution/macos/prepare-community-app.mjs' };
const changes = new Map([
  ['package.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n')],
  ['lib/main.js', Buffer.from(main.replace(protocol, '// Keep the existing system protocol handler for this isolated installation.'))],
  [hostPath, Buffer.from(host.replace('"19387"', '"0"'))],
  ['lib/isolated-bootstrap.js', bootstrap],
]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const descriptor = JSON.parse(asar.extractFile(source, 'dsh/desktop-runtime.json'));
if (descriptor.release.version !== manifest.version || descriptor.platform !== 'darwin' || descriptor.arch !== 'x64') throw Error('Runtime version or target differs');
let inventoryCount = 0;
for (const row of descriptor.files) {
  const before = asar.extractFile(source, 'dsh/' + row.path);
  if (sha(before) !== row.sha256 || before.length !== row.bytes) throw Error('Preexisting runtime inventory mismatch: ' + row.path);
  const changed = changes.get('dsh/' + row.path);
  if (changed) { row.sha256 = sha(changed); row.bytes = changed.length; }
  inventoryCount++;
}
changes.set('dsh/desktop-runtime.json', Buffer.from(JSON.stringify(descriptor, null, 2) + '\n'));
const entries = new Map(asar.listPackage(source).map(p => [p.slice(1), asar.statFile(source, p.slice(1), false)]));
for (const [name, bytes] of changes) if (!entries.has(name)) entries.set(name, { size: bytes.length });
const streams = [...entries].map(([name, info]) => {
  if (info.files) return { path: name, type: 'directory', unpacked: !!info.unpacked };
  if (info.link) return { path: name, type: 'link', unpacked: !!info.unpacked, symlink: info.link };
  return { path: name, type: 'file', unpacked: !!info.unpacked,
    stat: { size: changes.get(name)?.length ?? info.size, mode: info.executable ? 0o755 : 0o644 },
    streamGenerator: () => Readable.from(changes.get(name) ?? asar.extractFile(source, name)) };
});
await asar.createPackageFromStreams(output, streams);
await new Promise(resolve => setTimeout(resolve, 500));
let verifiedFiles = 0;
for (const [name, info] of entries) {
  if (info.files || info.link) continue;
  if (!(changes.get(name) ?? asar.extractFile(source, name)).equals(asar.extractFile(output, name))) throw Error('Byte verification failed: ' + name);
  if (!!info.unpacked !== !!asar.statFile(output, name, false).unpacked) throw Error('Unpack policy changed: ' + name);
  verifiedFiles++;
}
const restoredPermissions = [];
for (const row of descriptor.files) {
  const name = 'dsh/' + row.path;
  const bytes = asar.extractFile(output, name);
  if (bytes.length !== row.bytes || sha(bytes) !== row.sha256) throw Error('New runtime inventory mismatch: ' + row.path);
  if (row.executable && asar.statFile(output, name, false).unpacked) {
    const physical = output + '.unpacked/' + name;
    if (!(fs.statSync(physical).mode & 0o111)) { fs.chmodSync(physical, 0o755); restoredPermissions.push(row.path); }
  }
}
const headerSha256 = sha(Buffer.from(asar.getRawHeader(output).headerString));
const infoPlist = path.join(candidate, 'Contents/Info.plist');
const plist = JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', infoPlist]));
if (plist.CFBundleIdentifier !== manifest.dshDesktopAppId || plist.CFBundleShortVersionString !== manifest.version) throw Error('Plist identity differs');
delete plist.CFBundleURLTypes;
plist.ElectronAsarIntegrity['Resources/app.asar'].hash = headerSha256;
const temporaryPlist = path.join(resources, 'isolation-info.json');
fs.writeFileSync(temporaryPlist, JSON.stringify(plist));
execFileSync('plutil', ['-convert', 'xml1', '-o', infoPlist, temporaryPlist]);
fs.unlinkSync(temporaryPlist);
fs.renameSync(source, path.join(evidence, 'before-isolation.asar'));
fs.renameSync(source + '.unpacked', path.join(evidence, 'before-isolation.asar.unpacked'));
fs.renameSync(output, source);
fs.renameSync(output + '.unpacked', source + '.unpacked');
// Keep pre-adaptation bytes outside the shipped application for rollback.
const result = { at: new Date().toISOString(), version: manifest.version, appId: manifest.dshDesktopAppId,
  candidate, verifiedFiles, inventoryCount, restoredPermissions, changedFiles: [...changes.keys()],
  headerSha256, asarSha256: sha(fs.readFileSync(source)) };
fs.writeFileSync(path.join(evidence, 'isolated-app-verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
