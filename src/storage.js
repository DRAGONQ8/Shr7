var LessonStorage=(()=>{
 let opened=null;
 function open(){
  if(opened)return opened;
  opened=new Promise((resolve,reject)=>{
   let request;try{request=indexedDB.open('khaled-nahw-device',1);}catch(e){reject(e);return;}
   let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;reject(Error('التخزين غير متاح'));}},4000);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records');};
   request.onsuccess=()=>{clearTimeout(timer);if(settled){request.result.close();return;}settled=true;const db=request.result;db.onversionchange=()=>{db.close();opened=null;};resolve(db);};
   request.onerror=()=>{clearTimeout(timer);settled=true;reject(request.error);};
   request.onblocked=()=>{clearTimeout(timer);settled=true;reject(Error('التخزين مشغول'));};
  }).catch(e=>{opened=null;throw e;});
  return opened;
 }
 async function get(key){try{const db=await open();return await new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly');const r=tx.objectStore('records').get(key);r.onsuccess=()=>resolve({ok:true,value:r.result});r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error);});}catch{return {ok:false};}}
 async function put(key,value){try{const db=await open();return await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put(value,key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}catch{return false;}}
 return {get,put};
})();
