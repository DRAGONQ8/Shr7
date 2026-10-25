const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.resolve(__dirname,'../khaled-nahw-interactive.html'),'utf8');
const media=JSON.parse(s.match(/<script id="media-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
test('welcome and core explanations play without OS voices or a connection',()=>{for(const id of ['intro','verb','actor','object','method','correct','incorrect','finish'])assert.ok(media.audio[id]?.src?.startsWith('data:audio/'),id+' must be embedded');});
