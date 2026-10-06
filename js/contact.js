(() => {
  'use strict';
  const init=()=>{
    const form=document.querySelector('#contact-form');
    if(!form)return;
    const status=document.querySelector('#contact-form-status');
    const name=form.elements.namedItem('name');
    const description=form.elements.namedItem('description');
    const clearValidity=event=>event.target.setCustomValidity?.('');
    form.addEventListener('input',clearValidity);
    const validate=()=>{
      name.setCustomValidity(name.value.trim()?'':'نام خود را بنویسید.');
      description.setCustomValidity(description.value.trim().length>=10?'':'شرح پروژه را با دست‌کم ۱۰ نویسه بنویسید.');
      return form.reportValidity();
    };
    const profile=()=>window.MMK?.data?.profile || window.PORTFOLIO_DATA?.profile || {};
    const draft=()=>{
      const values=new FormData(form),needs=values.getAll('needs');
      return `سلام ${profile().name || 'محمد متین خوارزمی'}،\n\nمن ${String(values.get('name')).trim()} هستم.\nنوع پروژه: ${values.get('type')}\nایمیل من: ${String(values.get('email') || '').trim() || 'در گفتگو اعلام می‌کنم'}${needs.length?`\nنیازهای اولیه: ${needs.join('، ')}`:''}\n\nشرح پروژه:\n${String(values.get('description')).trim()}\n\nاین درخواست از سایت معرفی شما آماده شده است.`;
    };
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(!validate())return;
      const contacts=window.MMK?.contacts(profile());
      if(!contacts?.email){status.textContent='ایمیل تماس تنظیم نشده است. شرح پروژه را کپی کنید و از راه ارتباطی دیگر بفرستید.';return;}
      const link=document.createElement('a');
      link.href=`${contacts.email}?subject=${encodeURIComponent('گفتگو دربارهٔ پروژهٔ طراحی سایت')}&body=${encodeURIComponent(draft())}`;
      document.body.append(link);link.click();link.remove();
      status.textContent='پیش‌نویس ایمیل آماده شد. ارسال نهایی را در برنامهٔ ایمیل تأیید کنید. اگر برنامه باز نشد، شرح پروژه را کپی کنید.';
    });
    document.querySelector('#contact-copy')?.addEventListener('click',async()=>{
      if(!validate())return;
      try{await window.MMK.copy(draft());status.textContent='شرح پروژه کپی شد. می‌توانید آن را در تلگرام یا ایمیل بفرستید.';}
      catch{
        if(window.MMK?.download){window.MMK.download(new Blob([draft()],{type:'text/plain;charset=utf-8'}),'project-brief.txt');status.textContent='مرورگر اجازهٔ کپی نداد؛ متن درخواست در یک فایل دانلود شد. می‌توانید محتوای فایل را ارسال کنید.';}
        else{status.textContent='مرورگر اجازهٔ کپی نداد. متن فرم را در پیام خود بنویسید.';}
      }
    });
    const syncTelegram=()=>{
      const telegram=profile().telegram;
      if(!/^[a-zA-Z0-9_]{5,32}$/.test(telegram || ''))return;
      document.querySelectorAll('.page-contact [data-contact-telegram]').forEach(node=>{node.textContent=`@${telegram}`;});
    };
    document.addEventListener('MMK-ready',syncTelegram);syncTelegram();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
