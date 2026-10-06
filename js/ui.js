(() => {
  'use strict';
  const MMK=window.MMK;
  let returnFocus;
  MMK.showDialog=dialog=>{
    document.querySelectorAll('dialog[open]').forEach(item=>item.close());
    returnFocus=document.activeElement;
    if(!dialog.open)dialog.showModal();
    document.body.classList.add('modal-open');
  };
  MMK.initUI=()=>{
    document.addEventListener('click',event=>{
      const opener=event.target.closest('[data-project-open]'); if(opener){MMK.openProject(opener.dataset.projectOpen);return;}
      const briefOpener=event.target.closest('[data-open-brief]');
      if(briefOpener){const type=briefOpener.dataset.briefType, select=document.querySelector('#brief-form select[name=type]');if(type&&Array.from(select.options).some(option=>option.value===type))select.value=type;MMK.showDialog(document.querySelector('#brief-dialog'));}
      if(event.target.closest('[data-close-dialog]'))event.target.closest('dialog').close();
    });
    document.querySelectorAll('dialog').forEach(dialog=>{
      dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
      dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]')){document.body.classList.remove('modal-open');returnFocus?.focus();}if(dialog.id==='project-dialog')document.querySelector('#project-dialog-content').innerHTML='';});
    });
    const menu=document.querySelector('.menu-toggle'), nav=document.querySelector('#mobile-nav');
    const closeMenu=()=>{nav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','باز کردن منو');};
    menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));menu.setAttribute('aria-label',open?'باز کردن منو':'بستن منو');nav.hidden=open;});
    nav?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!nav.hidden){closeMenu();menu.focus();}});
    const desktop=matchMedia('(min-width: 761px)');desktop.addEventListener('change',event=>{if(event.matches)closeMenu();});
    document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('[data-filter]').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});
      let visible=0;
      document.querySelectorAll('.project-card').forEach(card=>{card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter;if(!card.hidden)visible++;});
      document.querySelector('.filter-status').textContent=`${visible.toLocaleString('fa-IR')} نمونه‌کار نمایش داده می‌شود.`;
      MMK.resizeFrames(); window.ScrollTrigger?.refresh();
    }));
    const form=document.querySelector('#brief-form'), status=document.querySelector('#brief-status');
    const validateBrief=()=>{form.elements.name.setCustomValidity(form.elements.name.value.trim()?'':'نام خود را بنویسید.');form.elements.description.setCustomValidity(form.elements.description.value.trim().length>=10?'':'توضیح پروژه را با دست‌کم ۱۰ نویسه بنویسید.');return form.reportValidity();};
    form.addEventListener('input',event=>event.target.setCustomValidity?.(''));
    const brief=()=>{const values=new FormData(form);return `سلام ${MMK.data.profile.name}،\n\nمن ${values.get('name')} هستم.\nنوع پروژه: ${values.get('type')}\nایمیل: ${values.get('email') || 'در گفتگو اعلام می‌کنم'}\n\nشرح پروژه:\n${values.get('description')}\n\nاین درخواست از سایت معرفی شما آماده شده است.`;};
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!validateBrief())return;
      const contact=MMK.contacts(MMK.data.profile).email;
      if(!contact){status.textContent='ایمیل تماس تنظیم نشده است. شرح پروژه را کپی کنید و در تلگرام بفرستید.';return;}
      const link=document.createElement('a');link.href=`${contact}?subject=${encodeURIComponent('درخواست همکاری در طراحی سایت')}&body=${encodeURIComponent(brief())}`;link.click();
      status.textContent='پیش‌نویس آماده شد. ارسال را در برنامهٔ ایمیل خود تأیید کنید؛ در صورت باز نشدن، شرح پروژه را کپی کنید.';
    });
    document.querySelector('#copy-brief').addEventListener('click',async()=>{
      if(!validateBrief())return;
      try{await MMK.copy(brief());status.textContent='شرح پروژه کپی شد؛ می‌توانید آن را در تلگرام بفرستید.';}
      catch{MMK.download(new Blob([brief()],{type:'text/plain;charset=utf-8'}),'project-brief.txt');status.textContent='مرورگر اجازهٔ کپی نداد؛ شرح پروژه به‌صورت فایل دانلود شد.';}
    });
  };
  MMK.resizeFrames=()=>document.querySelectorAll('.project-stage').forEach(stage=>{stage.style.setProperty('--frame-scale',String((stage.clientWidth-40)/1100));});
})();
