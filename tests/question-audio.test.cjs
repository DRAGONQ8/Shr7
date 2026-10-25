const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../src/core.js'),'utf8'),ctx);
const C=ctx.Core,q={id:'one',prompt:'ما الفاعل؟',sentence:'كَتَبَ خَالِدٌ الدَّرْسَ.',options:['خَالِدٌ','الدَّرْسَ'],answer:0,explanation:'خَالِدٌ فاعل مرفوع.'};
test('an unanswered question requests its own recording when automatic question audio is enabled',()=>{
 assert.equal(C.questionAudio(q,{},true,true),'question-one');
 assert.equal(C.questionAudio(q,{},false,true),'');
 assert.equal(C.questionAudio(q,{},true,false),'');
});
test('returning to an answered question never requests automatic solution audio',()=>{
 assert.equal(C.questionAudio(q,C.answer({},q,0),true,true),'');
 assert.equal(C.questionAudio(q,C.answer({},q,1),true,true),'');
 assert.equal(C.questionAudio(undefined,{},true,true),'');
});
