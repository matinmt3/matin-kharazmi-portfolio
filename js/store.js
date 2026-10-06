(() => {
  'use strict';
  const MMK=window.MMK;
  let opening;
  function open() {
    if (!opening) opening=new Promise((resolve,reject)=>{
      const request=indexedDB.open('mmk-content-studio',1);
      request.onupgradeneeded=()=>{request.result.createObjectStore('draft');request.result.createObjectStore('files');};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return opening;
  }
  async function transaction(store,mode,action) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,mode), request=action(tx.objectStore(store));
      tx.oncomplete=()=>resolve(request.result);
      tx.onerror=()=>reject(tx.error || request.error);
      tx.onabort=()=>reject(tx.error || new Error('Storage transaction aborted'));
    });
  }
  MMK.store={
    read:()=>transaction('draft','readonly',s=>s.get('content')),
    save:data=>transaction('draft','readwrite',s=>s.put(data,'content')),
    file:path=>transaction('files','readonly',s=>s.get(path)),
    putFile:(path,file)=>transaction('files','readwrite',s=>s.put(file,path)),
    removeFile:path=>transaction('files','readwrite',s=>s.delete(path)),
    async preview(data) {
      const draft=MMK.clone(data);
      for (const project of draft.projects) if (project.image?.startsWith('assets/uploads/')) {
        const blob=await this.file(project.image);
        if (blob) { const url=URL.createObjectURL(blob); MMK.objectUrls.add(url); project.image=url; }
      }
      for (const resume of draft.resumes) {
        const blob=await this.file(resume.file);
        if (blob) { const url=URL.createObjectURL(blob); MMK.objectUrls.add(url); resume.previewUrl=url; }
      }
      return draft;
    }
  };
  window.addEventListener('pagehide',()=>MMK.objectUrls.forEach(URL.revokeObjectURL));
})();
