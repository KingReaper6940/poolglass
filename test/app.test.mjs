import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mount} from '../src/app.mjs';
import {example} from '../src/example.mjs';
import {readUTF8,downloads} from '../src/files.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
function setup(){const dom=new JSDOM(html),saved=[];return {dom,d:dom.window.document,saved,app:mount(dom.window.document,{save:(...a)=>saved.push(a)})}}
function event(t,id,type){t.d.getElementById(id).dispatchEvent(new t.dom.window.Event(type,{bubbles:true,cancelable:true}))}
function edit(t,id,value){t.d.getElementById(id).value=value;event(t,id,'input')}
test('simulated sample produces exact counts, baseline, chart, two tables and six exports',()=>{
 const t=setup();t.d.getElementById('sample').click();assert.equal(t.app.getResult().current.percent,'93.75%');assert.match(t.d.getElementById('metrics').textContent,/75%/);assert.equal(t.d.querySelectorAll('#counts tr').length,3);assert.equal(t.d.querySelectorAll('#sweep tr').length,10);assert.ok(t.d.querySelector('#chart svg'));
 for(const b of t.d.querySelectorAll('[data-export]'))b.click();assert.equal(t.saved.length,6);assert.equal(JSON.parse(t.saved[0][2]).schema,'poolglass/1');t.dom.window.close();
});
test('dirty and invalid drafts leave previous study stale and disable exports',()=>{
 const t=setup();t.app.install(example);const previous=t.app.getResult();edit(t,'keep','5');event(t,'settings','submit');assert.equal(t.app.getResult(),previous);assert.equal(t.app.isFresh(),false);assert.match(t.d.getElementById('status').textContent,/stale/);for(const b of t.d.querySelectorAll('[data-export]'))assert.equal(b.disabled,true);t.dom.window.close();
});
test('changing strictness, retention and selected count event changes actual calculations',()=>{
 const t=setup();t.app.install(example);t.d.getElementById('relation').value='lt';event(t,'relation','change');event(t,'settings','submit');assert.equal(t.app.getResult().current.pool.passingFaces,3);
 t.d.getElementById('order').value='highest';t.d.getElementById('event').value='exact';event(t,'settings','submit');assert.equal(t.app.getResult().project.event,'exact');assert.equal(t.app.getResult().current.pool.favor,false);t.dom.window.close();
});
test('pagination shows selected target while complete exports retain every row',()=>{
 const t=setup();t.app.install({...example,dice:30,keep:25,faces:24,target:24,required:21});
 assert.match(t.d.getElementById('count-page').textContent,/Page 2/);assert.match(t.d.getElementById('sweep-page').textContent,/Page 2/);assert.equal(t.d.querySelectorAll('#counts tr').length,6);
 t.d.querySelector('[data-export=json]').click();const r=JSON.parse(t.saved[0][2]);assert.equal(r.rows.length,26);assert.equal(r.sweep.length,26);t.dom.window.close();
});
test('untrusted title and notes remain literal; SVG IDs do not collide with form IDs',()=>{
 const t=setup();t.app.install({...example,title:'<img src=x onerror=alert(1)>',notes:'<script>alert(1)</script>'});assert.equal(t.d.querySelectorAll('#chart img').length,0);assert.equal(t.d.querySelectorAll('#title').length,1);const svg=t.d.querySelector('#chart svg');for(const id of svg.getAttribute('aria-labelledby').split(' '))assert.ok(svg.querySelector('[id="'+id+'"]'));t.dom.window.close();
});
test('pending project imports cannot replace later draft edits',async()=>{
 const t=setup();t.app.install(example);let release;Object.defineProperty(t.d.getElementById('project-file'),'files',{configurable:true,value:[{size:100,arrayBuffer:()=>new Promise(r=>{release=r})}]});
 event(t,'project-file','change');edit(t,'notes','Keep draft');release(new TextEncoder().encode(JSON.stringify({...example,title:'Wrong replacement'})).buffer);await new Promise(r=>setTimeout(r,0));assert.equal(t.d.getElementById('notes').value,'Keep draft');assert.notEqual(t.d.getElementById('title').value,'Wrong replacement');t.dom.window.close();
});
test('valid project import rebuilds and invalid project keeps previous work',async()=>{
 const t=setup();
 for(const p of [example,{...example,dice:0}]){
  const bytes=new TextEncoder().encode(JSON.stringify(p));Object.defineProperty(t.d.getElementById('project-file'),'files',{configurable:true,value:[{size:bytes.length,arrayBuffer:async()=>bytes.buffer}]});event(t,'project-file','change');await new Promise(r=>setTimeout(r,0));
 }
 assert.equal(t.app.getResult().current.percent,'93.75%');assert.match(t.d.getElementById('status').textContent,/intact/);t.dom.window.close();
});
test('reset releases result state, chart and downloads',()=>{
 const t=setup();t.app.install(example);t.d.getElementById('clear').click();assert.equal(t.app.getResult(),null);assert.equal(t.d.querySelectorAll('#chart svg').length,0);assert.equal(t.d.querySelectorAll('#counts tr').length,0);assert.equal(t.d.getElementById('count-next').disabled,true);for(const b of t.d.querySelectorAll('[data-export]'))assert.equal(b.disabled,true);t.dom.window.close();
});
test('UTF8 limits and actual Blob payloads preserve exact integer export strings',async()=>{
 await assert.rejects(()=>readUTF8({size:50000},40000),/size/);await assert.rejects(()=>readUTF8({size:1,arrayBuffer:async()=>new Uint8Array([255]).buffer},10));
 const t=setup(),oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,blobs=[],revoked=[];URL.createObjectURL=b=>{blobs.push(b);return 'blob:'+blobs.length};URL.revokeObjectURL=u=>revoked.push(u);t.dom.window.HTMLAnchorElement.prototype.click=function(){};
 try{const d=downloads(t.d),text='{"ways":"100000000000000000000000001"}';d.save('receipt.json','application/json',text);assert.equal(await blobs[0].text(),text);d.save('b','text/plain','b');d.dispose();assert.equal(revoked.length,2)}
 finally{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;t.dom.window.close()}
});
test('labels, live status, captions, skip target, keyboard-scroll chart and responsive CSS exist',async()=>{
 const t=setup();for(const e of t.d.querySelectorAll('input:not([type=file]),select,textarea'))assert.ok(t.d.querySelector('label[for="'+e.id+'"]'),e.id);
 assert.equal(t.d.getElementById('status').getAttribute('role'),'status');assert.equal(t.d.querySelectorAll('table caption').length,2);assert.ok(t.d.querySelector(t.d.querySelector('.skip').getAttribute('href')));assert.equal(t.d.getElementById('chart').tabIndex,0);
 const css=await readFile(new URL('../style.css',import.meta.url),'utf8');assert.match(css,/max-width:760px/);assert.match(css,/focus-visible/);t.dom.window.close();
});
