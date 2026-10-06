(() => {
  'use strict';
  const MMK=window.MMK;
  async function start(){
    MMK.data=MMK.clone(window.PORTFOLIO_DATA);
    if(new URLSearchParams(location.search).get('preview')==='draft'){
      try{const draft=await MMK.store.read();if(draft){MMK.data=await MMK.store.preview(draft);document.querySelector('.draft-banner').hidden=false;
        const mainPages=new Set(['index.html','work.html','services.html','about.html','contact.html']);
        document.querySelectorAll('a[href]').forEach(link=>{if(link.hasAttribute('data-published-link'))return;const url=new URL(link.getAttribute('href'),location.href);if(url.origin===location.origin&&mainPages.has(url.pathname.split('/').pop())){url.searchParams.set('preview','draft');link.href=url.href;}});
      }}
      catch{MMK.toast('پیش‌نمایش محلی در این مرورگر در دسترس نیست؛ محتوای منتشرشده نمایش داده می‌شود.');}
    }
    MMK.applyProfile(MMK.data.profile);MMK.renderProjects(MMK.data.projects);MMK.renderResumes(MMK.data.resumes);MMK.initUI();MMK.resizeFrames();
    window.addEventListener('resize',MMK.resizeFrames,{passive:true});
    document.querySelectorAll('[data-year]').forEach(node=>{node.textContent=new Date().getFullYear();});
    MMK.initMotion();
    document.dispatchEvent(new CustomEvent('MMK-ready'));
    document.fonts?.ready.then(()=>window.ScrollTrigger?.refresh());
  }
  start().catch(error=>{console.error('Portfolio initialization failed',error);MMK.toast('بخشی از صفحه بارگذاری نشد؛ صفحه را دوباره باز کنید.');});
})();
