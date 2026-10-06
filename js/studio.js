(() => {
  'use strict';
  const M=window.MMK, e=M.escape, $=selector=>document.querySelector(selector);
  const status=$('#studio-status'), profileForm=$('#profile-form'), projectForm=$('#project-form'), resumeForm=$('#resume-form');
  let data=M.clone(window.PORTFOLIO_DATA), busy=false;
  const labels={branding:'سایت معرفی',webapp:'وب‌اپلیکیشن',commerce:'فروشگاه'};
  const message=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
  const uid=prefix=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const array=text=>String(text).split(/[,،]/).map(value=>value.trim()).filter(Boolean).slice(0,15);
  const trimForm=form=>form.querySelectorAll('input:not([type=file]),textarea').forEach(input=>input.value=input.value.trim());
  function setTab(name,focus=false) {
    document.querySelectorAll('[data-tab]').forEach(tab=>{const selected=tab.dataset.tab===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;if(selected&&focus)tab.focus();});
    document.querySelectorAll('[role=tabpanel]').forEach(panel=>panel.hidden=panel.id!==`panel-${name}`);
  }
  document.querySelectorAll('[data-tab]').forEach(tab=>{
    tab.addEventListener('click',()=>setTab(tab.dataset.tab));
    tab.addEventListener('keydown',event=>{
      const tabs=[...document.querySelectorAll('[data-tab]')], index=tabs.indexOf(tab);
      let next;if(event.key==='ArrowLeft')next=(index+1)%tabs.length;else if(event.key==='ArrowRight')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();setTab(tabs[next].dataset.tab,true);}
    });
  });
  function populateProfile() {
    for(const key of Object.keys(data.profile)){const input=profileForm.elements.namedItem(key);if(input)input.value=data.profile[key] || '';}
  }
  function readProfile() {
    trimForm(profileForm);
    if(!profileForm.checkValidity()){setTab('profile');profileForm.reportValidity();return null;}
    const values=new FormData(profileForm), profile={...data.profile};
    for(const key of ['name','latinName','role','email','telegram','github','intro','about'])profile[key]=String(values.get(key) || '').trim();
    if(profile.github&&!/^https?:\/\//i.test(profile.github)){setTab('profile');message('لینک گیت‌هاب باید با https:// آغاز شود.',true);return null;}
    return profile;
  }
  function renderLists() {
    $('#studio-project-list').innerHTML=data.projects.length?data.projects.map(project=>`<article class="studio-row"><div><h3>${e(project.title)}</h3><p>${e(project.categoryLabel)} · ${e(project.type)}</p></div><div class="row-actions"><button class="text-button" data-edit-project="${e(project.id)}" aria-label="ویرایش ${e(project.title)}">ویرایش</button><button class="text-button" data-remove-project="${e(project.id)}" aria-label="حذف ${e(project.title)} از پیش‌نویس">حذف از پیش‌نویس</button></div></article>`).join(''):'<p class="studio-empty">هنوز پروژه‌ای اضافه نشده است.</p>';
    $('#studio-resume-list').innerHTML=data.resumes.length?data.resumes.map(resume=>`<article class="studio-row"><div><h3>${e(resume.title)}</h3><p>${e(resume.description || resume.filename)}</p></div><div class="row-actions"><button class="text-button" data-view-resume="${e(resume.id)}">دیدن PDF</button><button class="text-button" data-remove-resume="${e(resume.id)}" aria-label="حذف ${e(resume.title)} از پیش‌نویس">حذف از پیش‌نویس</button></div></article>`).join(''):'<p class="studio-empty">فایل PDF اضافه نشده است. رزومهٔ آنلاین سایت همچنان قابل مشاهده و چاپ است.</p>';
  }
  async function run(task) {
    if(busy)return;busy=true;document.querySelectorAll('button:not([role=tab])').forEach(button=>button.disabled=true);
    try{await task();}catch(error){message(error?.message?.includes('ذخیره')||error?.message?.includes('فایل')||error?.message?.includes('ZIP')||error?.message?.includes('سایت')?error.message:'انجام نشد. فضای ذخیره‌سازی یا دسترسی مرورگر را بررسی کن؛ ورودی‌های فرم حفظ شده‌اند.',true);}
    finally{busy=false;document.querySelectorAll('button').forEach(button=>button.disabled=false);}
  }
  async function save(next,text='پیش‌نویس روی این دستگاه ذخیره شد.') {
    try{await M.store.save(next);}catch{throw new Error('ذخیره انجام نشد. مرورگر به فضای کافی یا اجازهٔ ذخیره‌سازی نیاز دارد.');}
    data=next;renderLists();message(text);
  }
  profileForm.addEventListener('submit',event=>{event.preventDefault();const profile=readProfile();if(profile)run(()=>save({...data,profile}));});
  function editProject(id='') {
    const project=data.projects.find(item=>item.id===id);projectForm.reset();
    projectForm.elements.id.value=id;
    if(project)for(const key of ['title','subtitle','category','type','year','link','description','challenge','solution'])projectForm.elements.namedItem(key).value=project[key] || '';
    projectForm.elements.deliverables.value=project?.deliverables?.join('، ') || '';
    projectForm.elements.stack.value=project?.stack?.join(', ') || 'HTML, CSS, JavaScript';
    $('#project-form-heading').textContent=project?'ویرایش پروژه':'پروژهٔ جدید';projectForm.hidden=false;projectForm.elements.title.focus();
  }
  $('#new-project').addEventListener('click',()=>editProject());$('#cancel-project').addEventListener('click',()=>projectForm.hidden=true);
  projectForm.addEventListener('submit',event=>{
    event.preventDefault();trimForm(projectForm);if(!projectForm.reportValidity())return;
    run(async()=>{
      const values=new FormData(projectForm), id=String(values.get('id')) || uid('project'), previous=data.projects.find(item=>item.id===id);
      const category=String(values.get('category')), link=String(values.get('link') || '').trim();
      if(link&&!M.safeUrl(link))throw new Error('لینک سایت معتبر نیست؛ از https:// یا مسیر یک فایل در پروژه استفاده کن.');
      let image=previous?.image || '', selected=projectForm.elements.image.files[0];
      if(selected){
        const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
        if(!extensions[selected.type]||selected.size>5*1024*1024)throw new Error('فایل تصویر باید PNG، JPG یا WebP و کوچک‌تر از ۵ مگابایت باشد.');
        let bitmap;try{bitmap=await createImageBitmap(selected);}catch{throw new Error('فایل انتخاب‌شده یک تصویر خوانا نیست.');}
        const width=bitmap.width,height=bitmap.height;bitmap.close();if(width>12000||height>12000)throw new Error('فایل تصویر بیش از حد بزرگ است؛ طول و عرض را کمتر از ۱۲۰۰۰ پیکسل کن.');
        image=`assets/uploads/${uid('image')}.${extensions[selected.type]}`;await M.store.putFile(image,selected);
      }
      const project={...previous,id,category,categoryLabel:labels[category],image,link,preview:previous?.preview || '',accent:previous?.accent || '#242729'};
      for(const key of ['title','subtitle','type','year','description','challenge','solution'])project[key]=String(values.get(key) || '').trim();
      project.deliverables=array(values.get('deliverables'));project.stack=array(values.get('stack'));
      const projects=previous?data.projects.map(item=>item.id===id?project:item):[...data.projects,project];
      await save({...data,projects},'پروژه ذخیره شد. برای انتشار عمومی، ZIP جدید را دریافت کن.');projectForm.hidden=true;
    });
  });
  resumeForm.addEventListener('submit',event=>{
    event.preventDefault();trimForm(resumeForm);if(!resumeForm.reportValidity())return;
    run(async()=>{
      const selected=resumeForm.elements.file.files[0];
      if(!selected||selected.size>10*1024*1024)throw new Error('فایل PDF باید کوچک‌تر از ۱۰ مگابایت باشد.');
      const signature=new TextDecoder().decode(await selected.slice(0,5).arrayBuffer());if(signature!=='%PDF-')throw new Error('فایل انتخاب‌شده PDF معتبر نیست.');
      const id=uid('resume'), file=`assets/resumes/${id}.pdf`;await M.store.putFile(file,selected);
      const values=new FormData(resumeForm), resume={id,file,title:String(values.get('title')).trim(),description:String(values.get('description') || '').trim(),filename:selected.name};
      await save({...data,resumes:[...data.resumes,resume]},'فایل رزومه ذخیره شد. برای انتشار عمومی، ZIP جدید را دریافت کن.');resumeForm.reset();
    });
  });
  document.addEventListener('click',event=>{
    const edit=event.target.closest('[data-edit-project]');if(edit){editProject(edit.dataset.editProject);return;}
    const removeProject=event.target.closest('[data-remove-project]');if(removeProject){run(()=>save({...data,projects:data.projects.filter(item=>item.id!==removeProject.dataset.removeProject)},'پروژه فقط از پیش‌نویس حذف شد.'));return;}
    const removeResume=event.target.closest('[data-remove-resume]');if(removeResume){run(()=>save({...data,resumes:data.resumes.filter(item=>item.id!==removeResume.dataset.removeResume)},'فایل فقط از پیش‌نویس حذف شد.'));return;}
    const view=event.target.closest('[data-view-resume]');if(view){run(async()=>{
      const resume=data.resumes.find(item=>item.id===view.dataset.viewResume);if(!resume)return;
      const blob=await M.store.file(resume.file);if(blob)M.download(blob,resume.filename || 'resume.pdf');else{const link=document.createElement('a');link.href=M.safeUrl(resume.file);link.target='_blank';link.rel='noopener';link.click();}
      message('فایل رزومه برای مشاهده یا دانلود آماده شد.');
    });}
  });
  $('#export-site').addEventListener('click',()=>{
    const profile=readProfile();if(!profile)return;
    run(async()=>{await save({...data,profile},'در حال آماده‌سازی فایل کامل سایت…');const zip=await M.exportSite(data);M.download(zip,'matin-kharazmi-portfolio.zip');message('ZIP کامل آماده شد. فایل‌ها را استخراج و در ریپازیتوری گیت‌هاب جایگزین کن.');});
  });
  $('#export-json').addEventListener('click',()=>{const profile=readProfile();if(!profile)return;M.download(new Blob([JSON.stringify({...data,profile},null,2)],{type:'application/json'}),'portfolio-content-backup.json');message('پشتیبان متن‌ها دانلود شد؛ فایل‌های تصویری و PDF داخل آن نیست.');});
  $('#reset-draft').addEventListener('click',()=>$('#reset-confirm').hidden=false);$('#cancel-reset').addEventListener('click',()=>$('#reset-confirm').hidden=true);
  $('#confirm-reset').addEventListener('click',()=>run(async()=>{await save(M.clone(window.PORTFOLIO_DATA),'پیش‌نویس به محتوای منتشرشده بازگردانده شد.');populateProfile();projectForm.hidden=true;$('#reset-confirm').hidden=true;}));
  (async()=>{
    try{const draft=await M.store.read();if(draft?.version===1&&draft.profile&&Array.isArray(draft.projects)&&Array.isArray(draft.resumes)){data=draft;message('پیش‌نویس ذخیره‌شدهٔ این دستگاه آماده است.');}else message('محتوای منتشرشده آمادهٔ ویرایش است.');}
    catch{message('فضای ذخیره‌سازی در دسترس نیست. می‌توانی نسخهٔ منتشرشده را ببینی؛ برای ذخیره، این صفحه را از سرور محلی یا مرورگر دارای اجازهٔ ذخیره باز کن.',true);}
    populateProfile();renderLists();$('#export-site').disabled=false;
  })();
})();
