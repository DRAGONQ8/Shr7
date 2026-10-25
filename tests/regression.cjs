const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:chromium.executablePath(),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:844,height:390}});
 await page.goto('file://'+path.resolve(__dirname,'../khaled-nahw-interactive.html'));
 await page.click('#settingsButton');
 await page.locator('#settingsBody').evaluate(e=>e.scrollTop=e.scrollHeight);
 const layout=await page.evaluate(()=>{
  const d=document.querySelector('#settingsDialog'), b=document.querySelector('#settingsBody');
  const r=d.getBoundingClientRect(),br=b.getBoundingClientRect();
  return {dialogFits:r.top>=0&&r.bottom<=innerHeight,bodyFits:br.bottom<=r.bottom+1,bodyScrollable:b.scrollHeight>b.clientHeight};
 });
 const media=await page.evaluate(()=>JSON.parse(document.querySelector('#media-data').textContent));
 console.log('settings',layout);
 const problems=[];
 if(!layout.dialogFits||!layout.bodyFits)problems.push('Settings content exceeds the dialog bounds in landscape.');
 for(const key of ['intro','verb','actor','object','method','correct','incorrect','finish'])if(!media.audio[key]?.src?.startsWith('data:audio/'))problems.push('Missing offline narration: '+key);
 await browser.close();
 if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}else console.log('Regression checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
