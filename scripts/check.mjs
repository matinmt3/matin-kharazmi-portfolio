import assert from 'node:assert/strict';
import {lstat, readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

export const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const forbiddenSegments = new Set(['.git', 'node_modules', 'dist']);

export function validateRelativePath(value) {
  if (typeof value !== 'string' || !value || /[\\\0:?#]/.test(value) || value.startsWith('/')) {
    throw new Error(`Invalid manifest path: ${String(value)}`);
  }
  const segments = value.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || forbiddenSegments.has(segment.toLowerCase()))) {
    throw new Error(`Unsafe manifest path: ${value}`);
  }
  return value;
}

export async function regularFile(root, relative) {
  validateRelativePath(relative);
  const resolvedRoot = await realpath(root);
  const absolute = path.resolve(resolvedRoot, ...relative.split('/'));
  if (!absolute.startsWith(resolvedRoot + path.sep)) throw new Error(`Path escapes project: ${relative}`);
  let current = resolvedRoot;
  const segments = relative.split('/');
  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index]);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${relative}`);
    if (index < segments.length - 1 && !info.isDirectory()) throw new Error(`Not a directory: ${current}`);
    if (index === segments.length - 1 && !info.isFile()) throw new Error(`Not a regular file: ${relative}`);
  }
  return absolute;
}

export async function readManifest(root = projectRoot) {
  const manifest = JSON.parse(await readFile(await regularFile(root, 'bundle-manifest.json'), 'utf8'));
  assert.equal(manifest.version, 1, 'Unsupported bundle-manifest version');
  assert.ok(Array.isArray(manifest.files) && manifest.files.length, 'Manifest must contain files:string[]');
  manifest.files.forEach(validateRelativePath);
  assert.equal(new Set(manifest.files).size, manifest.files.length, 'Manifest contains duplicate files');
  for (const required of ['bundle-manifest.json', 'index.html', 'studio.html', 'resume.html', 'data/site-data.js']) {
    assert.ok(manifest.files.includes(required), `Manifest is missing ${required}`);
  }
  if (manifest.sourceArchive) {
    validateRelativePath(manifest.sourceArchive);
    assert.ok(manifest.files.includes(manifest.sourceArchive), 'Source archive must be listed in manifest.files');
    await regularFile(root, manifest.sourceArchive);
  }
  return manifest;
}

const decodeAttribute = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function checkReference(root, files, source, raw, documents) {
  const value = decodeAttribute(raw).trim();
  if (!value) return;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      assert.ok(url.hostname && !url.username && !url.password, `${source}: invalid web URL ${value}`);
    } else if (url.protocol === 'mailto:') {
      assert.match(decodeURIComponent(url.pathname), /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/, `${source}: invalid email URL`);
    }
    return;
  }
  if (/^data:/i.test(value)) return;
  assert.ok(!/^[a-z][a-z\d+.-]*:/i.test(value) && !value.startsWith('//'), `${source}: unsupported URL ${value}`);
  assert.ok(!value.startsWith('/'), `${source}: root-relative URL breaks project Pages paths: ${value}`);
  const url = new URL(value, `https://portfolio.invalid/${source}`);
  const referencePath = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  assert.ok(!/[\\\0]/.test(referencePath), `${source}: invalid path ${value}`);
  const absolute = path.resolve(root, path.posix.dirname(source), referencePath || path.posix.basename(source));
  assert.ok(absolute.startsWith(root + path.sep), `${source}: reference escapes project ${value}`);
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  validateRelativePath(relative);
  assert.ok(files.has(relative), `${source}: unlisted local reference ${value}`);
  await regularFile(root, relative);
  if (url.hash && relative.endsWith('.html')) {
    const target = documents.get(relative);
    const id = decodeURIComponent(url.hash.slice(1));
    assert.ok(target?.ids.has(id), `${source}: missing fragment ${value}`);
  }
}

function runHelperContracts(context) {
  const {MMK} = context.window;
  assert.equal(MMK.safeUrl('javascript:alert(1)'), '', 'Executable URLs must be rejected');
  assert.equal(MMK.safeUrl('../private.txt'), '', 'Parent paths must be rejected');
  assert.equal(MMK.safeUrl('assets/%2e%2e/private.txt'), '', 'Encoded parent paths must be rejected');
  assert.equal(MMK.safeUrl('assets/%252e%252e/private.txt'), '', 'Double-encoded paths must be rejected');
  assert.equal(MMK.safeUrl('/assets/image.webp'), '', 'Project assets must remain relative');
  assert.equal(MMK.safeUrl('data:image/svg+xml;base64,PHN2Zz4=', {image:true}), '', 'Active image formats must be rejected');
  assert.equal(MMK.safeUrl('assets/images/chrome-ribbon.webp'), 'assets/images/chrome-ribbon.webp');
  assert.equal(MMK.safeUrl('https://example.com/work'), 'https://example.com/work');
  assert.equal(MMK.safeUrl('blob:unregistered', {image:true}), '', 'Only registered object URLs are accepted');
  assert.equal(MMK.escape('<a title="x">&\''), '&lt;a title=&quot;x&quot;&gt;&amp;&#39;', 'Content must be escaped before HTML insertion');
  assert.equal(MMK.contacts({email:'bad', telegram:'@name', github:'javascript:x'}).email, '');
  assert.equal(MMK.contacts({email:'person@example.com', telegram:'valid_name', github:''}).telegram, 'https://t.me/valid_name');
}

export async function checkProject(root = projectRoot) {
  root = await realpath(root);
  const manifest = await readManifest(root);
  const files = new Set(manifest.files);
  const texts = new Map();
  for (const relative of files) {
    const absolute = await regularFile(root, relative);
    const info = await lstat(absolute);
    assert.ok(info.size || relative === '.nojekyll', `Empty release file: ${relative}`);
    if (/\.(?:html|css|js|mjs|json|md|yml)$/.test(relative)) texts.set(relative, await readFile(absolute, 'utf8'));
    if (/\.(?:js|mjs)$/.test(relative)) {
      const result = spawnSync(process.execPath, ['--check', absolute], {encoding:'utf8', windowsHide:true});
      assert.equal(result.status, 0, `${relative}: JavaScript syntax error\n${result.stderr || result.error || ''}`);
    }
    if (relative.endsWith('.json')) JSON.parse(texts.get(relative));
  }
  if (manifest.sourceArchive) {
    const archive = JSON.parse(await readFile(await regularFile(root, manifest.sourceArchive), 'utf8'));
    assert.equal(archive.version, 1, 'Unsupported source archive version');
    assert.ok(archive.files && typeof archive.files === 'object' && !Array.isArray(archive.files), 'Invalid source archive files');
    for (const [relative, content] of Object.entries(archive.files)) {
      validateRelativePath(relative);
      assert.ok(files.has(relative) && relative.split('/').some(segment => segment.startsWith('.')), `Unexpected source archive file: ${relative}`);
      assert.equal(typeof content, 'string', `Source archive entry must contain UTF-8 text: ${relative}`);
    }
    for (const relative of files) {
      if (relative.split('/').some(segment => segment.startsWith('.'))) {
        assert.ok(Object.hasOwn(archive.files, relative), `Source archive is missing ${relative}`);
      }
    }
  }

  const documents = new Map();
  for (const [relative, text] of texts) {
    if (!relative.endsWith('.html')) continue;
    const ids = new Set();
    for (const match of text.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)) {
      assert.ok(!ids.has(match[2]), `${relative}: duplicate HTML id ${match[2]}`);
      ids.add(match[2]);
    }
    assert.match(text, /<html\b[^>]*\blang=["']fa["'][^>]*\bdir=["']rtl["']/i, `${relative}: Persian RTL document attributes missing`);
    documents.set(relative, {ids});
  }
  let references = 0;
  for (const [relative, text] of texts) {
    const rawReferences = [];
    if (relative.endsWith('.html')) {
      for (const match of text.matchAll(/\b(?:href|src|action|poster)\s*=\s*(["'])(.*?)\1/g)) rawReferences.push(match[2]);
    } else if (relative.endsWith('.css')) {
      for (const match of text.matchAll(/url\(\s*(["']?)([^\s)"']+)\1\s*\)/g)) rawReferences.push(match[2]);
    } else if (relative.endsWith('.md')) {
      for (const match of text.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) rawReferences.push(match[1]);
    }
    for (const reference of rawReferences) {
      await checkReference(root, files, relative, reference, documents);
      references++;
    }
  }

  const context = vm.createContext({window:{}, URL, console});
  new vm.Script(texts.get('js/utils.js'), {filename:'js/utils.js'}).runInContext(context, {timeout:1000});
  runHelperContracts(context);
  new vm.Script(texts.get('data/site-data.js'), {filename:'data/site-data.js'}).runInContext(context, {timeout:1000});
  const data = context.window.PORTFOLIO_DATA;
  assert.ok(data?.profile && Array.isArray(data.projects) && Array.isArray(data.resumes), 'Invalid site data structure');
  const ids = new Set();
  for (const project of data.projects) {
    assert.match(project.id, /^[A-Za-z\d_-]+$/, 'Project IDs must be safe and stable');
    assert.ok(!ids.has(project.id), `Duplicate project ID ${project.id}`);
    ids.add(project.id);
    for (const field of ['image', 'preview', 'link']) {
      if (!project[field]) continue;
      assert.ok(context.window.MMK.safeUrl(project[field], {image:field==='image'}), `Invalid ${field} for ${project.id}`);
      await checkReference(root, files, 'index.html', project[field], documents);
    }
  }
  for (const resume of data.resumes) {
    assert.ok(context.window.MMK.safeUrl(resume.file), `Invalid resume file: ${resume.title}`);
    await checkReference(root, files, 'resume.html', resume.file, documents);
  }
  const contacts = context.window.MMK.contacts(data.profile);
  for (const field of ['email', 'telegram', 'github']) {
    if (data.profile[field]) assert.ok(contacts[field], `Invalid profile ${field}`);
  }

  const dependencies = JSON.parse(texts.get('docs/dependencies.json'));
  for (const dependency of dependencies) {
    assert.match(dependency.version, /^\d+\.\d+\.\d+$/, `Unpinned version: ${dependency.package}`);
    assert.match(dependency.integrity, /^sha512-[A-Za-z\d+/]+={0,2}$/, `Missing integrity: ${dependency.package}`);
    assert.equal(new URL(dependency.url).protocol, 'https:', 'Dependency source must use HTTPS');
    for (const file of Object.values(dependency.files)) assert.ok(files.has(file), `Unlisted dependency file: ${file}`);
  }
  console.log(`Checked ${files.size} release files, ${documents.size} RTL pages, ${references} references and URL/escaping contracts.`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkProject().catch(error => {console.error(`Check failed: ${error.message}`); process.exitCode = 1;});
}
