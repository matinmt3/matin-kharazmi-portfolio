(() => {
  'use strict';
  const MMK=window.MMK;
  let context, pointerCleanups=[];
  let customReduced=false;
  try{customReduced=localStorage.getItem('mmk-reduced-motion')==='true';}catch{}
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  MMK.reduced=()=>customReduced||media.matches;
  function reset(){context?.revert();context=null;pointerCleanups.forEach(fn=>fn());pointerCleanups=[];document.querySelectorAll('.title-line>span,.hero-description,.hero-actions,.hero-signature,.hero-art,.process-grid li,.project-stage').forEach(node=>{node.style.removeProperty('transform');node.style.removeProperty('opacity');node.style.removeProperty('visibility');});}
  function build(entrance=false){
    reset();document.documentElement.dataset.motion=MMK.reduced()?'reduced':'full';
    const control=document.querySelector('#motion-toggle');control.setAttribute('aria-pressed',String(MMK.reduced()));control.textContent=MMK.reduced()?'حرکت کاهش یافته':'کاهش حرکت';
    if(!window.gsap||!window.ScrollTrigger||MMK.reduced())return;
    const gsap=window.gsap;gsap.registerPlugin(ScrollTrigger);
    context=gsap.context(()=>{
      if(entrance){gsap.timeline({defaults:{ease:'power3.out'}}).from('.title-line>span',{yPercent:105,duration:1,stagger:.12}).from('.hero-description,.hero-actions,.hero-signature',{y:20,autoAlpha:0,duration:.65,stagger:.09},'-.65').from('.hero-art',{opacity:0,duration:1.1},0);}
      if(matchMedia('(min-width: 900px)').matches){gsap.to('.hero-art',{y:-65,rotation:-2,scale:.97,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});}
      gsap.from('.process-grid li',{y:30,opacity:0,duration:.6,stagger:.1,ease:'power2.out',scrollTrigger:{trigger:'.process-grid',start:'top 85%',once:true}});
    });
    if(matchMedia('(hover:hover) and (pointer:fine)').matches){
      document.querySelectorAll('.magnetic').forEach(button=>{const inner=button.querySelector('span');if(!inner)return;const move=event=>{const r=button.getBoundingClientRect();gsap.to(inner,{x:(event.clientX-r.left-r.width/2)*.13,y:(event.clientY-r.top-r.height/2)*.16,duration:.35,overwrite:true});};const leave=()=>gsap.to(inner,{x:0,y:0,duration:.5,ease:'power3.out',overwrite:true});button.addEventListener('pointermove',move);button.addEventListener('pointerleave',leave);pointerCleanups.push(()=>{button.removeEventListener('pointermove',move);button.removeEventListener('pointerleave',leave);gsap.set(inner,{clearProps:'transform'});});});
      document.querySelectorAll('.project-stage').forEach(stage=>{const move=event=>{const r=stage.getBoundingClientRect();gsap.to(stage,{rotationX:(.5-(event.clientY-r.top)/r.height)*3,rotationY:((event.clientX-r.left)/r.width-.5)*3,transformPerspective:1000,duration:.5,overwrite:true});};const leave=()=>gsap.to(stage,{rotationX:0,rotationY:0,duration:.6,overwrite:true});stage.addEventListener('pointermove',move);stage.addEventListener('pointerleave',leave);pointerCleanups.push(()=>{stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerleave',leave);gsap.set(stage,{clearProps:'transform'});});});
    }
  }
  MMK.initMotion=()=>{
    build(true);const progress=document.querySelector('.scroll-progress span');let scheduled=false;
    const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`;scheduled=false;};
    window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});update();
    document.querySelector('#motion-toggle').addEventListener('click',()=>{customReduced=!MMK.reduced();try{localStorage.setItem('mmk-reduced-motion',String(customReduced));}catch{}build();MMK.toast(MMK.reduced()?'حرکت‌های غیرضروری کاهش یافت.':'حرکت‌ها فعال شدند.');});
    media.addEventListener('change',()=>build());
    let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>build(),200);});
  };
})();
