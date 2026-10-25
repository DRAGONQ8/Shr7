// These checks catch automatic solution playback, stale recordings, and footer bypasses.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),lesson=JSON.parse(fs.readFileSync(root+'/content/lesson.json','utf8'));
let checks=0;
function check(value,label){checks++;assert.ok(value,label);}
async function run(browser){
 const context=await browser.newContext({viewport:{width:440,height:956},offline:true,acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const OriginalAudio=window.Audio;window.__audio=[];
  window.Audio=function(...args){const a=new OriginalAudio(...args);window.__audio.push(a);return a;};window.Audio.prototype=OriginalAudio.prototype;
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],cancel(){},addEventListener(){}}});
  Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:undefined});
 });
 try{
  await page.goto('file://'+root+'/khaled-nahw-interactive.html');
  await page.locator('#chapters [data-index="6"]').click();
  await page.selectOption('#quizCount','30');await page.locator('[data-action="quiz-start"]').click();
  await page.waitForFunction(()=>document.querySelector('#soundCaption').textContent.startsWith('أيّ كلمة تدلّ على الفعل؟')&&window.__audio.some(a=>!a.paused&&a.currentTime>0));
  check(await page.locator('#nextButton').isDisabled(),'The bottom next button cannot bypass an unanswered question');
  const q1=lesson.questions[0];await page.locator('[data-action="answer"][data-index="'+q1.answer+'"]').click();
  check(await page.locator('[data-action="read-explanation"]').count()===1,'An explicit answer playback choice appears after selection');
  check(await page.locator('#narrationBar').isHidden(),'The question recording and subtitle bar stop when an option is chosen');
  check(await page.evaluate(()=>{const m=JSON.parse(document.querySelector('#media-data').textContent);return !window.__audio.some(a=>a.getAttribute('src')===m.audio['explain-q1'].src);}), 'No answer recording is created automatically');
  check(await page.locator('.answer.correct').count()===1,'The correct answer remains visible without speech');
  await page.locator('[data-action="read-explanation"]').click();
  await page.waitForFunction(()=>document.querySelector('#soundCaption').textContent.startsWith('كَتَبَ هو الفعل')&&window.__audio.at(-1)?.currentTime>0);
  check(true,'The explicit choice plays the embedded answer without OS voices');
  await page.click('#nextButton');
  await page.waitForFunction(()=>document.querySelector('#soundCaption').textContent.startsWith('مَن الفاعل في هذه الجملة؟'));
  check((await page.locator('.quiz-count').textContent()).includes('2 / 30'),'The bottom next button advances inside the quiz');
  await page.click('#prevButton');check(await page.locator('#narrationBar').isHidden(),'Revisiting an answered question does not automatically read its solution');
  await page.click('#nextButton');await page.locator('[data-action="timer"]').click();await page.click('#prevButton');await page.click('#nextButton');
  check((await page.locator('#timerButton').textContent()).includes('30 ثانية للتفكير'),'Back and next clear a previous timer');
  await page.click('#soundToggle');check(await page.locator('#narrationBar').isHidden(),'Muting stops the active recording');
  const count=await page.evaluate(()=>window.__audio.length);await page.locator('[data-action="answer"][data-index="'+lesson.questions[1].answer+'"]').click();await page.click('#nextButton');
  check(await page.evaluate(n=>window.__audio.length===n,count),'Global mute also prevents the next question and feedback effect');
  await page.click('#soundToggle');await page.click('#settingsButton');await page.uncheck('#autoQuestions');await page.locator('#settingsDialog .close-dialog').click();
  await page.locator('[data-action="answer"][data-index="'+lesson.questions[2].answer+'"]').click();await page.click('#nextButton');
  check(await page.locator('#narrationBar').isHidden(),'Automatic question audio can be disabled independently');
  await page.locator('[data-id="question-q4"]').click();await page.waitForFunction(()=>window.__audio.at(-1)?.currentTime>0);
  check(await page.locator('#narrationBar').isVisible(),'Manual question playback works with automatic questions disabled');
  await page.locator('#chapters [data-index="0"]').click();await Promise.all([page.waitForEvent('download'),page.locator('#stage [data-action="share-html"]').click()]);
  check(await page.locator('#stage .download-fallback').isVisible(),'Sharing fallback stays in the visible lesson');
  await page.setViewportSize({width:667,height:320});await page.click('#settingsButton');await page.check('#bigText');await page.selectOption('#noticeDuration','0');await page.locator('#settingsDialog .close-dialog').click();
  await page.locator('#chapters [data-index="4"]').click();
  const stage=await page.locator('#stage').boundingBox();check(stage.height>=90,'Both persistent docks leave at least 90px for the small landscape lesson');
  check(errors.length===0,'No JavaScript runtime errors: '+errors.join('; '));
  console.log('Question-first audio checks passed:',checks);
 } catch(e){fs.mkdirSync(root+'/artifacts',{recursive:true});await page.screenshot({path:root+'/artifacts/voice-flow-FAIL.png'}).catch(()=>{});console.error('Voice-flow errors:',errors);throw e;} finally {await context.close();}
}
async function deliveryEdges(browser){
 const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce',acceptDownloads:true});
 const page=await context.newPage();const problems=[];
 try{
  await page.addInitScript(()=>{
   Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
   Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Native sharing is unavailable','NotAllowedError');}});
  });
  await page.goto('file://'+root+'/khaled-nahw-interactive.html');
  await page.click('#soundToggle');await page.locator('#chapters [data-index="6"]').click();await page.locator('[data-action="quiz-start"]').click();
  await page.click('#settingsButton');await page.check('#zenMode');await page.locator('#settingsDialog .close-dialog').click();
  const footer=await page.locator('#nextButton').boundingBox();checks++;if(footer.x<0||footer.x+footer.width>320)problems.push('Narrow fullscreen Next button is clipped: '+JSON.stringify(footer));
  await page.click('#zenExit');await page.locator('#chapters [data-index="0"]').click();await page.locator('#stage [data-action="share-html"]').click();
  await page.waitForTimeout(100);
  checks++;if(await page.locator('#stage .download-fallback').count()!==1)problems.push('A rejected native share leaves no visible download fallback');
  assert.equal(problems.length,0,problems.join('\n'));console.log('Delivery edge checks passed: 2');
 }finally{await context.close();}
}
(async()=>{const b=await pw.chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});try{await deliveryEdges(b);await run(b);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
