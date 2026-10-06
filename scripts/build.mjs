import {copyFile, lstat, mkdir, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {checkProject, projectRoot, regularFile} from './check.mjs';

async function build() {
  const root = await realpath(projectRoot);
  const manifest = await checkProject(root);
  const destination = path.resolve(root, 'dist');
  // Deletion is limited to this project's immediate dist directory.
  if (path.dirname(destination) !== root || path.basename(destination) !== 'dist' || destination === root) {
    throw new Error('Unsafe build destination');
  }
  try {
    const info = await lstat(destination);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('dist must be a regular directory');
    const resolvedDestination = await realpath(destination);
    if (resolvedDestination !== destination) throw new Error('dist resolves outside its expected location');
    await rm(destination, {recursive:true});
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(destination);
  for (const relative of manifest.files) {
    const source = await regularFile(root, relative);
    const target = path.resolve(destination, ...relative.split('/'));
    if (!target.startsWith(destination + path.sep)) throw new Error(`Unsafe destination: ${relative}`);
    await mkdir(path.dirname(target), {recursive:true});
    await copyFile(source, target);
  }
  // The official Pages uploader omits dotfiles. Keep their UTF-8 source public
  // under an ordinary filename so the browser exporter can restore original paths.
  if (manifest.sourceArchive) {
    const sourceFiles = Object.create(null);
    for (const relative of manifest.files) {
      if (!relative.split('/').some(segment => segment.startsWith('.'))) continue;
      const source = await regularFile(root, relative);
      sourceFiles[relative] = new TextDecoder('utf-8', {fatal:true}).decode(await readFile(source));
    }
    const archiveTarget = path.resolve(destination, ...manifest.sourceArchive.split('/'));
    if (!archiveTarget.startsWith(destination + path.sep)) throw new Error('Unsafe source archive destination');
    await writeFile(archiveTarget, JSON.stringify({version:1, files:sourceFiles}, null, 2) + '\n', 'utf8');
  }
  await checkProject(destination);
  console.log(`Built dist from ${manifest.files.length} explicit manifest files.`);
}

build().catch(error => {console.error(`Build failed: ${error.message}`); process.exitCode = 1;});
