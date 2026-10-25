var Core = (() => {
 function escape(s) { return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
 function answer(answers,q,choice) {
  if(!Number.isInteger(choice)||choice<0||choice>=q.options.length) throw Error('اختيار غير صالح');
  if(Object.hasOwn(answers,q.id)) return {...answers};
  return {...answers,[q.id]:{choice,correct:choice===q.answer}};
 }
 function record(answers,id) { return Object.hasOwn(answers,id)?answers[id]:undefined; }
 function score(questions,answers) {
  let correct=0,answered=0;
  for(const q of questions) { const a=record(answers,q.id);if(a){answered++;if(a.correct)correct++;} }
  return {correct,answered,total:questions.length};
 }
 function isOrder(actual,wanted) { return actual.length===wanted.length&&new Set(actual).size===wanted.length&&actual.every((v,i)=>v===wanted[i]); }
 function matchAudio(text,clip) { return !!clip&&clip.transcript===text&&typeof clip.src==='string'&&/^(?:data:audio\/|https:\/\/)/i.test(clip.src); }
 function validate(c) {
  const errors=[],fail=s=>errors.push(s);
  const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const str=(v,max=4000)=>typeof v==='string'&&v.length<=max;
  const filled=(v,max=4000)=>str(v,max)&&v.trim().length>0;
  if(!obj(c)) return {ok:false,errors:['ملف المحتوى غير صالح.']};
  try { const raw=JSON.stringify(c);if(raw.length>2000000)fail('حجم النصوص أكبر من الحد المسموح.');if(/"(?:__proto__|constructor|prototype)"\s*:/.test(raw))fail('الملف يحتوي على مفاتيح غير مسموح بها.'); }
  catch { return {ok:false,errors:['تعذّرت قراءة المحتوى.']}; }
  if(c.version!==1)fail('نسخة ملف المحتوى غير مدعومة.');
  if(!obj(c.meta)||!['title','subtitle','presenter','introTitle','introLead','welcome'].every(k=>filled(c.meta[k])))fail('أكمل بيانات المقدمة والاسم والترحيب.');
  if(!obj(c.narration)||!['verb','actor','object','method','correct','incorrect','finish'].every(k=>filled(c.narration[k])))fail('أكمل نصوص التعليق الصوتي.');
  if(!Array.isArray(c.rules)||c.rules.length!==3)fail('يلزم وجود القواعد الثلاث.');
  else c.rules.forEach((r,i)=>{
   if(!obj(r)||r.id!==['verb','actor','object'][i]||!['title','question','definition','detail','example','exampleNote'].every(k=>filled(r[k]))||(r.more!==undefined&&!str(r.more))||(r.moreTitle!==undefined&&!str(r.moreTitle,200)))fail('بيانات القاعدة '+(i+1)+' غير مكتملة أو غير صالحة.');
  });
  if(!Array.isArray(c.examples)||!c.examples.length||c.examples.length>20)fail('أضف من مثال واحد إلى 20 مثالًا.');
  else { const ids=new Set; c.examples.forEach((e,i)=>{
   if(!obj(e)){fail('المثال '+(i+1)+' غير صالح.');return;}
   if(!filled(e.id,80)||ids.has(e.id)||!filled(e.title,150)||!['write','plant','read'].includes(e.scene)||!Array.isArray(e.words)||e.words.length!==3||!e.words.every(w=>filled(w,100))||!Array.isArray(e.explanations)||e.explanations.length!==3||!e.explanations.every(w=>filled(w)))fail('المثال '+(i+1)+' يحتاج إلى عنوان وثلاث كلمات وثلاثة تفسيرات ومعرّف مميّز.');
   ids.add(e.id);
  }); }
  if(!Array.isArray(c.questions)||!c.questions.length||c.questions.length>100)fail('أضف من سؤال واحد إلى 100 سؤال.');
  else { const ids=new Set;c.questions.forEach((q,i)=>{
   if(!obj(q)){fail('السؤال '+(i+1)+' غير صالح.');return;}
   if(!filled(q.id,80)||ids.has(q.id)||!filled(q.topic,150)||!filled(q.prompt,1000)||!str(q.sentence,1000)||!Array.isArray(q.options)||q.options.length<2||q.options.length>4||!q.options.every(o=>filled(o,400))||new Set(q.options).size!==q.options.length||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||!filled(q.explanation)||!str(q.hint,1000))fail('راجع السؤال '+(i+1)+': النص والخيارات المختلفة والإجابة الصحيحة والتفسير.');
   ids.add(q.id);
  }); }
  if(!obj(c.ui)||!['goalsTitle','goalsLead','videoTitle','videoLead','exploreTitle','rulesTitle','parseTitle','quizTitle','buildTitle','recapTitle'].every(k=>filled(c.ui[k])))fail('أكمل عناوين المراحل.');
  return {ok:errors.length===0,errors};
 }
 function fingerprint(s) { let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16); }
 function voice(list,uri='') {
  const arabic=list.filter(v=>typeof v.lang==='string'&&/^ar(?:-|_|$)/i.test(v.lang));
  if(uri){const selected=arabic.find(v=>v.voiceURI===uri);if(selected)return selected;}
  for(const code of ['ar-kw','ar-sa','ar-ae','ar-qa','ar-bh','ar-om','ar-001','ar']) {
   const found=arabic.find(v=>{const lang=v.lang.replace(/_/g,'-').toLowerCase();return lang===code||(code!=='ar'&&lang.startsWith(code+'-'));});if(found)return found;
  }
  return null;
 }
 function audioRoute(text,clip,hasVoice,mode='auto') {
  if(mode==='device')return hasVoice?'device':'unavailable';
  const valid=matchAudio(text,clip),embedded=valid&&/^data:audio\//i.test(clip.src);
  if(embedded)return 'embedded';
  if(mode==='recording'&&valid)return 'external';
  if(hasVoice)return 'device';
  return valid?'external':'unavailable';
 }
 function progress(raw,config) {
  if(!raw||typeof raw!=='object'||raw.signature!==fingerprint(JSON.stringify(config))||!raw.state||typeof raw.state!=='object'||Array.isArray(raw.state))return null;
  const s=raw.state,integer=(v,min,max,fallback)=>Number.isInteger(v)&&v>=min&&v<=max?v:fallback;
  const byId=new Map(config.questions.map(q=>[q.id,q]));
  const quizIds=Array.isArray(s.quizIds)&&s.quizIds.length>0&&s.quizIds.length<=config.questions.length&&new Set(s.quizIds).size===s.quizIds.length&&s.quizIds.every(id=>typeof id==='string'&&byId.has(id))?s.quizIds:[];
  const quizStarted=s.quizStarted===true&&quizIds.length>0;
  const choices=s.choices&&typeof s.choices==='object'&&!Array.isArray(s.choices)?s.choices:{};
  let answers={};
  if(quizStarted)for(const id of quizIds){const q=byId.get(id);const choice=Object.hasOwn(choices,id)?choices[id]:null;if(Number.isInteger(choice)&&choice>=0&&choice<q.options.length)answers=answer(answers,q,choice);}
  const buildOrder=Array.isArray(s.buildOrder)&&s.buildOrder.length<=3&&new Set(s.buildOrder).size===s.buildOrder.length&&s.buildOrder.every(v=>Number.isInteger(v)&&v>=0&&v<=2)?s.buildOrder:[];
  return {page:integer(s.page,0,8,0),ex:integer(s.ex,0,config.examples.length-1,0),selectedWord:integer(s.selectedWord,-1,2,-1),rule:integer(s.rule,0,2,0),revealed:Array.isArray(s.revealed)&&s.revealed.length===3?s.revealed.map(v=>v===true):[false,false,false],quizStarted,quizDone:quizStarted&&s.quizDone===true&&quizIds.every(id=>Object.hasOwn(answers,id)),qi:integer(s.qi,0,Math.max(0,quizIds.length-1),0),quizIds:quizStarted?quizIds:[],answers,quizCount:integer(s.quizCount,1,config.questions.length,Math.min(8,config.questions.length)),buildSet:integer(s.buildSet,0,config.examples.length-1,0),buildOrder,buildCompleted:Array.isArray(s.buildCompleted)?[...new Set(s.buildCompleted.filter(i=>Number.isInteger(i)&&i>=0&&i<config.examples.length))]:[]};
 }
 function mediaPatch(raw) {
  const out={audio:{}};if(!raw||typeof raw!=='object')return out;
  const allowed=['intro','verb','actor','object','method','correct','incorrect','finish','goals','explore','quiz','build'];
  if(raw.audio&&typeof raw.audio==='object')for(const id of allowed){
   if(!Object.hasOwn(raw.audio,id))continue;const clip=raw.audio[id];if(clip===null){out.audio[id]=null;continue;}
   if(clip&&typeof clip.src==='string'&&clip.src.length<11200000&&/^data:audio\/(?:mpeg|mp3|mp4|x-m4a|wav|wave|x-wav|aac|ogg|webm)(?:;codecs=[^;,]+)?;base64,[A-Za-z0-9+/]+=*$/i.test(clip.src)&&typeof clip.transcript==='string'&&clip.transcript.length<=4000)out.audio[id]={src:clip.src,transcript:clip.transcript};
  }
  if(typeof raw.video==='string'&&raw.video.length<42000000&&/^data:video\/(?:mp4|webm);base64,[A-Za-z0-9+/]+=*$/i.test(raw.video))out.video=raw.video;
  return out;
 }
 function selectQuestions(questions,count) {
  const n=Math.max(1,Math.min(questions.length,Math.floor(count)||1));
  if(n===questions.length)return questions.slice();
  if(n===1)return questions.slice(0,1);
  return Array.from({length:n},(_,i)=>questions[Math.round(i*(questions.length-1)/(n-1))]);
 }
 function noticeDelay(text,seconds=12) {
  if(seconds===0)return 0;
  return Math.min(30000,Math.max(12000,Number(seconds)*1000||12000,String(text).length*55));
 }
 function scriptJSON(value){return JSON.stringify(value).replace(/</g,'\\u003c');}
 return {escape,answer,score,record,isOrder,validate,matchAudio,fingerprint,voice,audioRoute,progress,mediaPatch,scriptJSON,selectQuestions,noticeDelay};
})();
