(() => {
  'use strict';
  const MMK=window.MMK, e=MMK.escape;
  function projectCard(project) {
    const image=MMK.safeUrl(project.image,{image:true}), preview=MMK.safeUrl(project.preview), link=MMK.safeUrl(project.link);
    const media=image ? `<img src="${e(image)}" alt="${e(project.title)}؛ پیش‌نمایش پروژه" loading="lazy" width="1100" height="800">` : preview ? `<iframe src="${e(preview)}" title="پیش‌نمایش ${e(project.title)}" loading="lazy" tabindex="-1" aria-hidden="true" inert></iframe>` : '<div class="resume-empty"><p>تصویر این پروژه به‌زودی اضافه می‌شود.</p></div>';
    const accent=/^#[0-9a-fA-F]{6}$/.test(project.accent) ? project.accent : '#242729';
    return `<article class="project-card" data-category="${e(project.category)}" data-project="${e(project.id)}"><div class="project-stage" style="--project-accent:${accent}">${media}<button class="project-open-overlay" data-project-open="${e(project.id)}" aria-label="مشاهدهٔ جزئیات ${e(project.title)}"><span>مشاهدهٔ جزئیات</span></button></div><div class="project-body"><div class="project-meta"><span>${e(project.categoryLabel)}</span><span>${e(project.year)}</span></div><h3 class="project-title">${e(project.title)}</h3><p class="project-subtitle">${e(project.subtitle)}</p><p class="project-description">${e(project.description)}</p><span class="project-type">${e(project.type || 'نمونه‌کار')}</span><div class="project-links"><button class="text-button" data-project-open="${e(project.id)}">داستان این پروژه</button>${link?`<a href="${e(link)}" target="_blank" rel="noopener noreferrer">مشاهدهٔ سایت</a>`:''}</div></div></article>`;
  }
  MMK.renderProjects=projects=>{
    const grid=document.querySelector('#project-grid');
    if(!grid)return;
    grid.innerHTML=projects.length ? projects.map(projectCard).join('') : '<div class="resume-empty"><h3>نمونه‌کارهای بعدی در راه‌اند.</h3><p>برای صحبت دربارهٔ پروژه‌تان با من در تماس باشید.</p></div>';
  };
  MMK.renderResumes=resumes=>{
    const container=document.querySelector('#resume-files'); if(!container)return;
    container.innerHTML=resumes.length ? resumes.map(resume=>{
      const url=resume.previewUrl&&MMK.objectUrls.has(resume.previewUrl)?resume.previewUrl:MMK.safeUrl(resume.file);
      return `<article class="resume-document"><span class="document-icon" aria-hidden="true">PDF</span><div><h3>${e(resume.title)}</h3><p>${e(resume.description || 'رزومهٔ قابل دانلود')}</p></div>${url?`<a class="document-action" href="${e(url)}" target="_blank" rel="noopener noreferrer" download="${e(resume.filename || 'resume.pdf')}" aria-label="دانلود ${e(resume.title)}">دانلود</a>`:''}</article>`;
    }).join('') : '<article class="resume-document"><span class="document-icon" aria-hidden="true">CV</span><div><h3>رزومهٔ آنلاین</h3><p>معرفی و راه‌های ارتباط؛ مناسب چاپ</p></div><a class="document-action" href="resume.html">مشاهده</a></article>';
  };
  MMK.applyProfile=profile=>{
    const contacts=MMK.contacts(profile);
    for(const field of ['name','role','intro','about']) document.querySelectorAll(`[data-profile-${field}]`).forEach(node=>{node.textContent=profile[field] || '';});
    document.querySelectorAll('[data-profile-latin-name]').forEach(node=>{node.textContent=profile.latinName || '';});
    document.querySelectorAll('[data-contact-email]').forEach(node=>{node.textContent=profile.email || '';if(contacts.email)node.href=contacts.email;else node.hidden=true;});
    document.querySelectorAll('[data-contact-telegram]').forEach(node=>{if(contacts.telegram)node.href=contacts.telegram;else node.hidden=true;});
    document.querySelectorAll('[data-contact-github]').forEach(node=>{if(contacts.github)node.href=contacts.github;else node.hidden=true;});
    const page=document.body.dataset.page;
    const title=page&&page!=='index'?`${document.body.dataset.pageLabel} | ${profile.name}`:`${profile.name} | ${profile.role}`;document.title=title;
    if(!page||page==='index')document.querySelector('meta[name=description]')?.setAttribute('content',profile.intro || '');
    document.querySelector('meta[property="og:title"]')?.setAttribute('content',title);
    if(!page||page==='index')document.querySelector('meta[property="og:description"]')?.setAttribute('content',profile.intro || '');
  };
  MMK.openProject=id=>{
    const project=MMK.data.projects.find(item=>item.id===id); if(!project)return;
    const link=MMK.safeUrl(project.link), image=MMK.safeUrl(project.image,{image:true}), preview=MMK.safeUrl(project.preview);
    const media=image?`<img src="${e(image)}" alt="پیش‌نمایش ${e(project.title)}">`:preview?`<iframe title="تجربهٔ تعاملی ${e(project.title)}" src="${e(preview)}" loading="lazy"></iframe>`:'';
    document.querySelector('#project-dialog-content').innerHTML=`<p class="section-kicker">${e(project.type || 'نمونه‌کار')} / ${e(project.categoryLabel)}</p><h2 id="project-dialog-title">${e(project.title)}</h2><p class="modal-description">${e(project.description)}</p>${media?`<div class="case-visual">${media}</div>`:''}<div class="case-block"><h3>مسئلهٔ طراحی</h3><p>${e(project.challenge || project.description)}</p></div><div class="case-block"><h3>مسیر اجرا</h3><p>${e(project.solution || 'طراحی و توسعه با تمرکز بر تجربهٔ کاربر.')}</p></div><div class="tags">${(project.deliverables || []).map(item=>`<span>${e(item)}</span>`).join('')}</div><div class="case-block"><h3>ابزارهای ساخت</h3><div class="tags" dir="ltr">${(project.stack || []).map(item=>`<span>${e(item)}</span>`).join('')}</div></div><div class="case-actions">${link?`<a class="button button-primary" href="${e(link)}" target="_blank" rel="noopener noreferrer">مشاهدهٔ سایت کامل</a>`:''}<button class="button button-outline" data-open-brief>گفتگو دربارهٔ پروژهٔ مشابه</button></div>`;
    MMK.showDialog(document.querySelector('#project-dialog'));
  };
})();
