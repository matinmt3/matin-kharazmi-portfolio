(() => {
  'use strict';
  const MMK = window.MMK = window.MMK || {};
  MMK.escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  MMK.safeUrl = (value, {image=false}={}) => {
    const url = String(value || '').trim();
    if (!url) return '';
    if (image && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) return url;
    if (image && url.startsWith('blob:') && MMK.objectUrls?.has(url)) return url;
    if (/^(https?):\/\//i.test(url)) { try { return new URL(url).href; } catch { return ''; } }
    let decoded;try{decoded=decodeURIComponent(url);}catch{return '';}
    if (/^[a-zA-Z0-9_./%-]+$/.test(url) && !decoded.startsWith('/') && !decoded.split('/').includes('..') && !/[\\:?#%]/.test(decoded)) return url;
    return '';
  };
  MMK.clone = value => JSON.parse(JSON.stringify(value));
  MMK.emailValid = value => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value));
  MMK.contacts = profile => ({
    email: MMK.emailValid(profile.email) ? `mailto:${profile.email}` : '',
    telegram: /^[a-zA-Z0-9_]{5,32}$/.test(profile.telegram) ? `https://t.me/${profile.telegram}` : '',
    github: MMK.safeUrl(profile.github)
  });
  MMK.toast = message => { const element=document.querySelector('#toast'); if (!element) return; element.textContent=message; element.hidden=false; clearTimeout(MMK.toastTimer); MMK.toastTimer=setTimeout(()=>{element.hidden=true;},5000); };
  MMK.download = (blob,name) => { const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=name; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); };
  MMK.copy = async text => { if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(text); };
  MMK.objectUrls = new Set();
})();
