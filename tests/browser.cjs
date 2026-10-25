const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const ROOT=path.resolve(__dirname,'..'),out=path.join(ROOT,'artifacts');fs.mkdirSync(out,{recursive:true});
const url='file://'+path.join(ROOT,'khaled-nahw-interactive.html');
const lesson=JSON.parse(fs.readFileSync(ROOT+'/content/lesson.json','utf8'));
let checks=0;const failures=[];
function check(value,message){checks++;assert.ok(value,message);}
async function init(page){
 await page.addInitScript(()=>{
  const OriginalAudio=window.Audio;window.__audio=[];
  window.Audio=function(...args){const audio=new OriginalAudio(...args);window.__audio.push(audio);return audio;};window.Audio.prototype=OriginalAudio.prototype;
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],cancel(){},addEventListener(){}}});
  Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:undefined});
 });
 page.on('pageerror',error=>failures.push(error.message));
 await page.goto(url);await page.waitForSelector('#stage .screen');
}
async function chapter(page,n){await page.locator('#chapters button[data-index="'+n+'"]').click();await page.waitForSelector('#stage .screen');}
async function settings(page){await page.click('#settingsButton');await page.waitForSelector('#settingsDialog[open]');}
async function closeSettings(page){await page.locator('#settingsDialog .close-dialog').click();}
async function geometry(page,label,minStage=60){
 const r=await page.evaluate(()=>{
  const stage=document.querySelector('#stage'),footer=document.querySelector('.footer');const sr=stage.getBoundingClientRect(),fr=footer.getBoundingClientRect();
  return {stageHeight:sr.height,footerTop:fr.top,footerBottom:fr.bottom,width:innerWidth,height:innerHeight,horizontal:stage.scrollWidth-stage.clientWidth,bodyHorizontal:document.documentElement.scrollWidth-innerWidth};
 });
 check(r.footerTop>=0&&r.footerBottom<=r.height+1,label+' footer fits '+JSON.stringify(r));
 check(r.stageHeight>=minStage,label+' usable stage '+JSON.stringify(r));
 check(r.horizontal<=2&&r.bodyHorizontal<=2,label+' no sideways clipping '+JSON.stringify(r));
}
async function layouts(browser,name){
 for(const [w,h] of [[412,915],[440,956],[915,412],[956,440],[667,320],[320,568],[1280,800]]){
  const context=await browser.newContext({viewport:{width:w,height:h},offline:true});const page=await context.newPage();
  try{
   await init(page);await page.click('#soundToggle');
   for(let n=0;n<9;n++){await chapter(page,n);await geometry(page,name+' '+w+'x'+h+' screen '+n);}
   await settings(page);await page.check('#bigText');
   await page.locator('#settingsBody').evaluate(e=>e.scrollTop=e.scrollHeight);
   const dialog=await page.evaluate(()=>{const d=document.querySelector('#settingsDialog').getBoundingClientRect(),b=document.querySelector('#settingsBody').getBoundingClientRect(),e=document.querySelector('.settings-end').getBoundingClientRect();return {top:d.top,bottom:d.bottom,bodyBottom:b.bottom,endTop:e.top,endBottom:e.bottom,height:innerHeight};});
   check(dialog.top>=0&&dialog.bottom<=h+1&&dialog.bodyBottom<=dialog.bottom+1,name+' bounded dialog '+w+' '+JSON.stringify(dialog));
   check(dialog.endTop>=0&&dialog.endBottom<=dialog.bodyBottom+2,name+' dialog final settings reachable '+w);
   await closeSettings(page);await chapter(page,6);await page.locator('[data-action="quiz-start"]').click();
   for(const answer of await page.locator('.answer').all()){
    await answer.scrollIntoViewIfNeeded();const fits=await answer.evaluate(e=>{const r=e.getBoundingClientRect(),s=document.querySelector('#stage').getBoundingClientRect();return r.top>=s.top-2&&r.bottom<=s.bottom+2;});check(fits,name+' enlarged answer can be reached '+w);
   }
   await page.click('#soundToggle');await chapter(page,4);
   await page.waitForSelector('#narrationBar:not([hidden])');await geometry(page,name+' '+w+'x'+h+' both docks',70);
   await page.screenshot({path:path.join(out,name+'-'+w+'x'+h+'-large.png')});
   if(w===915){
    await page.click('#fullToggle');await page.waitForTimeout(100);await geometry(page,name+' fullscreen');
    const actual=await page.evaluate(()=>!!document.fullscreenElement);if(name==='chromium')check(actual,'Chromium native fullscreen entered');
    await page.click('#zenExit');await settings(page);await page.locator('#settingsBody').evaluate(e=>e.scrollTop=e.scrollHeight);await closeSettings(page);
    if(actual)await page.evaluate(()=>document.exitFullscreen());
   }
  }catch(e){await page.screenshot({path:path.join(out,name+'-'+w+'x'+h+'-FAIL.png')}).catch(()=>{});throw e;}finally{await context.close();}
 }
}
async function interactions(browser,name){
 const context=await browser.newContext({viewport:{width:440,height:956},offline:true,acceptDownloads:true});const page=await context.newPage();
 try{
  await init(page);await page.locator('[data-action="start"]').click();
  await page.waitForFunction(()=>window.__audio.at(-1)?.currentTime>0.05);
  check(await page.evaluate(()=>window.__audio.at(-1).src.startsWith('data:audio/')),'Welcome is real embedded playback');
  await chapter(page,3);await page.locator('[data-action="word"][data-index="1"]').click();
  await page.waitForFunction(()=>window.__audio.at(-1)?.currentTime>0.05);
  check((await page.locator('#soundCaption').textContent()).includes('فاعل مرفوع'),'Word interaction reads the correct explanation');
  await chapter(page,4);await page.locator('[data-action="rule"][data-index="2"]').click();await page.waitForFunction(()=>window.__audio.at(-1)?.currentTime>0.05);
  check((await page.locator('#soundCaption').textContent()).includes('المفعول به'),'Rule interaction reads object explanation');
  await page.evaluate(()=>{const a=window.__audio.at(-1);a.currentTime=Math.max(0,a.duration-.15);});
  await page.waitForFunction(()=>document.querySelector('#audioState').textContent.includes('انتهى الصوت'));
  check(await page.locator('#narrationBar').isVisible(),'Subtitles remain after playback ends');
  await settings(page);await page.uncheck('#autoNarrate');await closeSettings(page);await chapter(page,6);await page.selectOption('#quizCount','30');await page.locator('[data-action="quiz-start"]').click();
  await page.locator('[data-id="question-q1"]').click();await page.waitForFunction(()=>window.__audio.at(-1)?.currentTime>0.05);await page.click('#stopSound');
  // First answer stays locked and going backward clears the next question's clock.
  const wrong=(lesson.questions[0].answer+1)%lesson.questions[0].options.length;
  await page.locator('[data-action="answer"][data-index="'+wrong+'"]').click();await page.locator('[data-action="answer"][data-index="'+lesson.questions[0].answer+'"]').click();
  check(await page.locator('.answer.wrong').count()===1,'Repeated answer does not replace the first choice');
  await page.locator('[data-action="quiz-next"]').click();await page.locator('[data-action="timer"]').click();await page.locator('[data-action="quiz-prev"]').click();await page.locator('[data-action="quiz-next"]').click();
  check((await page.locator('#timerButton').textContent()).includes('30 ثانية للتفكير'),'Previous clears the old question timer');
  for(let i=1;i<lesson.questions.length;i++){await page.locator('[data-action="answer"][data-index="'+lesson.questions[i].answer+'"]').click();await page.locator('[data-action="quiz-next"]').click();}
  check((await page.locator('.result-circle').textContent()).replace(/\s/g,'')==='29من30','Full quiz result counts 29 of 30');
  await page.locator('[data-action="retry-mistakes"]').click();check((await page.locator('.quiz-count').textContent()).includes('1 / 1'),'Retry contains only the mistaken question');await page.locator('[data-action="answer"][data-index="'+lesson.questions[0].answer+'"]').click();await page.locator('[data-action="quiz-next"]').click();
  await chapter(page,7);for(let n of [0,1,2])await page.locator('[data-action="add-word"][data-index="'+n+'"]').click();await page.locator('[data-action="build-check"]').click();check((await page.locator('.feedback').textContent()).includes('جملة مكتملة'),'Sentence construction completes');
  // Decode every MP3 using the real browser media stack while fully offline.
  const decoded=await page.evaluate(async()=>{const m=JSON.parse(document.querySelector('#media-data').textContent);const results=[];for(const [id,c] of Object.entries(m.audio)){const a=new Audio();a.preload='metadata';const result=await new Promise(resolve=>{const timer=setTimeout(()=>resolve({id,error:'timeout'}),10000);a.onloadedmetadata=()=>{clearTimeout(timer);resolve({id,duration:a.duration});};a.onerror=()=>{clearTimeout(timer);resolve({id,error:a.error?.message||'decode'});};a.src=c.src;});a.removeAttribute('src');a.load();results.push(result);}return results;});
  check(decoded.length===81&&decoded.every(x=>x.duration>0&&!x.error),'All 81 embedded MP3s decode offline');
  fs.writeFileSync(path.join(out,name+'-media.json'),JSON.stringify(decoded,null,2));
  await chapter(page,0);const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="share-html"]').click();const download=await downloadPromise;
  check(await page.locator('#stage .download-fallback').count()===1,'Manual share/download fallback is inside the visible lesson');
  const exported=path.join(out,name+'-exported.html');await download.saveAs(exported);
  const reopened=await context.newPage();await reopened.goto('file://'+exported);await reopened.waitForSelector('#stage .screen[data-screen="intro"]');check(await reopened.locator('dialog[open]').count()===0,'Export reopens with closed dialogs');
  const ready=await reopened.evaluate(()=>{const m=JSON.parse(document.querySelector('#media-data').textContent);return {clips:Object.keys(m.audio).length,video:m.video.startsWith('data:video/')};});check(ready.clips===81&&ready.video,'Export preserves narration and original video');await reopened.close();
  check(failures.length===0,'No JavaScript runtime errors: '+failures.join('; '));
 }catch(e){await page.screenshot({path:path.join(out,name+'-interaction-FAIL.png')}).catch(()=>{});throw e;}finally{await context.close();}
}
(async()=>{
 for(const name of ['chromium','webkit']){
  const type=pw[name],browser=await type.launch({headless:true,...(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES&&name==='chromium'?{executablePath:type.executablePath(),args:['--no-sandbox']}:{} )});
  try{await layouts(browser,name);await interactions(browser,name);}finally{await browser.close();}
 }
 console.log('Browser checks passed:',checks);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks,failures},null,2));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:false,checks,error:String(e),failures},null,2));process.exitCode=1;});
