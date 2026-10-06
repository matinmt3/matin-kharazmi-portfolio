(() => {
  'use strict';
  const MMK = window.MMK = window.MMK || {};
  const MAX_BYTES = 30 * 1024 * 1024;
  const MAX_MANIFEST_BYTES = 1024 * 1024;
  const MANIFEST_PATH = 'bundle-manifest.json';
  const DATA_PATH = 'data/site-data.js';
  const encoder = new TextEncoder();
  const tooLarge = () => new Error('حجم کل خروجی باید حداکثر ۳۰ مگابایت باشد. حجم تصاویر یا فایل‌های رزومه را کاهش دهید.');
  const isUpload = path => path.startsWith('assets/uploads/') || path.startsWith('assets/resumes/');
  const isHidden = path => path.split('/').some(part => part.startsWith('.'));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function checkedPath(path) {
    if (typeof path !== 'string' || !path || path.length > 1024 || path !== path.trim() ||
        path.startsWith('/') || /[\\:%?#<>|"*\u0000-\u001f\u007f]/.test(path) ||
        path.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error('مسیر یکی از فایل‌های خروجی معتبر نیست. مسیر فایل باید نسبی و داخل پوشهٔ سایت باشد.');
    }
    return path;
  }

  MMK.serializeData = data => {
    let serialized;
    try { serialized = JSON.stringify(data, null, 2); }
    catch (cause) { throw new Error('داده‌های سایت قابل تبدیل به JSON نیستند.', {cause}); }
    if (typeof serialized !== 'string') throw new Error('داده‌های سایت برای خروجی گرفتن موجود نیستند.');
    return serialized.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  };

  MMK.exportSite = async data => {
    const location = window.location;
    if (location.protocol === 'file:') {
      throw new Error('برای خروجی گرفتن، سایت را از سرور محلی باز کنید: در پوشهٔ پروژه npm start را اجرا کنید و نشانی نمایش‌داده‌شده را در مرورگر باز کنید.');
    }
    if (!['http:', 'https:'].includes(location.protocol)) {
      throw new Error('خروجی گرفتن فقط از نشانی HTTP یا HTTPS سایت امکان‌پذیر است.');
    }
    if (typeof window.fflate?.zipSync !== 'function') {
      throw new Error('ابزار ساخت ZIP بارگذاری نشده است. صفحه را دوباره بارگذاری کنید.');
    }
    const root = new URL('./', location.href);
    const files = Object.create(null);
    let totalBytes = 0;

    function fileUrl(path) {
      const url = new URL(checkedPath(path), root);
      if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) {
        throw new Error('خواندن فایل خارج از پوشهٔ سایت مجاز نیست.');
      }
      return url;
    }

    function addFile(path, bytes) {
      checkedPath(path);
      const previousSize = files[path]?.byteLength || 0;
      const nextTotal = totalBytes - previousSize + bytes.byteLength;
      if (nextTotal > MAX_BYTES) throw tooLarge();
      files[path] = bytes;
      totalBytes = nextTotal;
    }

    async function fetchBytes(path, limit) {
      const url = fileUrl(path);
      let response;
      try {
        response = await fetch(url.href, {credentials: 'same-origin', redirect: 'error', cache: 'no-store'});
      } catch (cause) {
        throw new Error(`خواندن فایل «${path}» ممکن نشد. اتصال و اجرای سایت با npm start را بررسی کنید.`, {cause});
      }
      if (!response.ok) {
        const message = isUpload(path)
          ? `فایل بارگذاری‌شدهٔ «${path}» پیدا نشد. دوباره آن را بارگذاری کنید و سپس خروجی بگیرید.`
          : `فایل لازم برای خروجی «${path}» پیدا نشد؛ کامل بودن فایل‌های سایت را بررسی کنید.`;
        throw new Error(message);
      }
      if (response.url && new URL(response.url).origin !== root.origin) {
        throw new Error('خواندن فایل از نشانی خارج از سایت مجاز نیست.');
      }
      const declaredSize = Number(response.headers.get('content-length'));
      if (Number.isFinite(declaredSize) && declaredSize > limit) {
        if (path === MANIFEST_PATH) throw new Error('فهرست فایل‌های خروجی بیش از حد بزرگ است.');
        throw tooLarge();
      }
      if (!response.body) return new Uint8Array();
      if (typeof response.body.getReader !== 'function') {
        throw new Error('مرورگر امکان خواندن امن فایل‌های خروجی را ندارد. از نسخهٔ جدید مرورگر استفاده کنید.');
      }
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) {
            await reader.cancel();
            if (path === MANIFEST_PATH) throw new Error('فهرست فایل‌های خروجی بیش از حد بزرگ است.');
            throw tooLarge();
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return bytes;
    }

    async function uploadBytes(path) {
      let stored;
      if (typeof MMK.store?.file === 'function') {
        try { stored = await MMK.store.file(path); }
        catch (cause) { throw new Error(`خواندن فایل «${path}» از حافظهٔ مرورگر ممکن نشد.`, {cause}); }
      }
      if (stored == null) return fetchBytes(path, MAX_BYTES - totalBytes);
      let bytes;
      if (stored instanceof Blob) {
        if (stored.size > MAX_BYTES - totalBytes) throw tooLarge();
        bytes = new Uint8Array(await stored.arrayBuffer());
      } else if (stored instanceof Uint8Array) {
        bytes = stored;
      } else if (stored instanceof ArrayBuffer) {
        bytes = new Uint8Array(stored);
      } else {
        throw new Error(`فایل ذخیره‌شدهٔ «${path}» معتبر نیست. دوباره آن را بارگذاری کنید.`);
      }
      if (bytes.byteLength > MAX_BYTES - totalBytes) throw tooLarge();
      return bytes;
    }

    // Take a snapshot before fetching so later edits cannot alter this export.
    const serializedData = MMK.serializeData(data);
    if (serializedData.length > MAX_BYTES) throw tooLarge();
    const snapshot = JSON.parse(serializedData);
    const dataScript = `window.PORTFOLIO_DATA = ${serializedData};\n`;
    if (dataScript.length > MAX_BYTES) throw tooLarge();
    addFile(DATA_PATH, encoder.encode(dataScript));

    const manifestBytes = await fetchBytes(MANIFEST_PATH, MAX_MANIFEST_BYTES);
    let manifest;
    try { manifest = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(manifestBytes)); }
    catch (cause) { throw new Error('فهرست فایل‌های خروجی معتبر نیست. فایل bundle-manifest.json را بررسی کنید.', {cause}); }
    if (!manifest || !Array.isArray(manifest.files) || manifest.files.length > 10000) {
      throw new Error('فهرست فایل‌های خروجی باید شامل آرایهٔ files با مسیرهای نسبی باشد.');
    }
    const paths = new Set(manifest.files.map(checkedPath));
    paths.add(DATA_PATH);
    paths.add(MANIFEST_PATH);
    let sourceArchivePath, sourceFiles;
    if (manifest.sourceArchive !== undefined) {
      sourceArchivePath = checkedPath(manifest.sourceArchive);
      if (isHidden(sourceArchivePath) || sourceArchivePath === DATA_PATH || sourceArchivePath === MANIFEST_PATH) {
        throw new Error('مسیر بستهٔ منبع خروجی باید یک فایل عمومی و مستقل داخل سایت باشد.');
      }
      const bytes = await fetchBytes(sourceArchivePath, MAX_BYTES - totalBytes);
      let archive;
      try { archive = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes)); }
      catch (cause) { throw new Error('بستهٔ منبع خروجی JSON معتبر نیست. فایل export-source.json را بررسی کنید.', {cause}); }
      if (archive?.version !== 1 || !archive.files || typeof archive.files !== 'object' || Array.isArray(archive.files)) {
        throw new Error('ساختار بستهٔ منبع خروجی معتبر نیست؛ نسخهٔ ۱ و فهرست files لازم است.');
      }
      sourceFiles = archive.files;
      paths.add(sourceArchivePath);
      addFile(sourceArchivePath, bytes);
    }
    const references = [
      ...(Array.isArray(snapshot?.projects) ? snapshot.projects.map(project => project?.image) : []),
      ...(Array.isArray(snapshot?.resumes) ? snapshot.resumes.map(resume => resume?.file) : [])
    ];
    for (const reference of references) {
      if (typeof reference === 'string' && isUpload(reference)) paths.add(checkedPath(reference));
    }

    function updatePageMetadata(path, bytes) {
      if (path !== 'index.html' && path !== 'resume.html') return bytes;
      const profile = snapshot?.profile || {};
      const name = String(profile.name ?? ''), role = String(profile.role ?? '');
      const pageTitle = path === 'resume.html' ? `رزومه | ${name}` : role ? `${name} | ${role}` : name;
      let html = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
      html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(pageTitle)}</title>`);
      if (path === 'index.html') {
        const intro = escapeHtml(profile.intro);
        html = html.replace(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/gi,
          () => `<meta name="description" content="${intro}">`);
        html = html.replace(/<meta\b(?=[^>]*\bproperty\s*=\s*["']og:title["'])[^>]*>/gi,
          () => `<meta property="og:title" content="${escapeHtml(pageTitle)}">`);
        html = html.replace(/<meta\b(?=[^>]*\bproperty\s*=\s*["']og:description["'])[^>]*>/gi,
          () => `<meta property="og:description" content="${intro}">`);
      }
      if (html.length > MAX_BYTES - totalBytes) throw tooLarge();
      return encoder.encode(html);
    }

    for (const path of paths) {
      if (path === DATA_PATH || path === MANIFEST_PATH || path === sourceArchivePath) continue;
      let bytes;
      if (isHidden(path)) {
        if (!sourceFiles || !Object.prototype.hasOwnProperty.call(sourceFiles, path) || typeof sourceFiles[path] !== 'string') {
          throw new Error(`فایل پنهان «${path}» در بستهٔ منبع خروجی موجود نیست. فایل export-source.json را بررسی کنید.`);
        }
        if (sourceFiles[path].length > MAX_BYTES - totalBytes) throw tooLarge();
        bytes = encoder.encode(sourceFiles[path]);
      } else {
        bytes = isUpload(path) ? await uploadBytes(path) : await fetchBytes(path, MAX_BYTES - totalBytes);
      }
      addFile(path, updatePageMetadata(path, bytes));
    }
    const exportedManifest = {...manifest, files: [...paths]};
    addFile(MANIFEST_PATH, encoder.encode(JSON.stringify(exportedManifest, null, 2) + '\n'));
    const zipped = window.fflate.zipSync(files, {level: 6});
    if (zipped.byteLength > MAX_BYTES) throw tooLarge();
    return new Blob([zipped], {type: 'application/zip'});
  };
})();
