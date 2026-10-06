(() => {
  'use strict';
  const MMK=window.MMK;
  async function start(){
    MMK.data=MMK.clone(window.PORTFOLIO_DATA);
    if(new URLSearchParams(location.search).get('preview')==='draft'){
      try{const draft=await MMK.store.read();if(draft){MMK.data=await MMK.store.preview(draft);document.querySelector('.draft-banner').hidden=false;}}
      catch{MMK.toast('پیش‌نمایش محلی در این مرورگر در دسترس نیست؛ محتوای منتشرشده نمایش داده می‌شود.');}
    }
    MMK.applyProfile(MMK.data.profile);MMK.renderProjects(MMK.data.projects);MMK.renderResumes(MMK.data.resumes);MMK.initUI();MMK.resizeFrames();
    window.addEventListener('resize',MMK.resizeFrames,{passive:true});
    document.querySelectorAll('[data-year]').forEach(node=>{node.textContent=new Date().getFullYear();});
    MMK.initMotion();
    document.fonts?.ready.then(()=>window.ScrollTrigger?.refresh());
  }
  start().catch(error=>{console.error('Portfolio initialization failed',error);MMK.toast('بخشی از صفحه بارگذاری نشد؛ صفحه را دوباره باز کنید.');});
})();
