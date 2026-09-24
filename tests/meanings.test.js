import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupMeanings,meaningHTML} from '../src/meanings.js';
const work=(text,notes,id='test')=>({id,body:[{text}],notes,source:'시험 PDF'});
const mark=(w,text)=>({start:w.body[0].text.indexOf(text),end:w.body[0].text.indexOf(text)+text.length,text});
test('existing highlights get exact source note without mutating saved ranges',()=>{
 const w=work('형옥은 집으로 갔다.',[['형옥','화진을 가리킴.']]);const h=mark(w,'형옥');const before=JSON.stringify(h);
 assert.equal(lookupMeanings(w,h).entries[0].meaning,'화진을 가리킴.');assert.equal(JSON.stringify(h),before);
});
test('does not infer an unknown meaning or match inside another word',()=>{
 const w=work('소실점과 소실은 다르다.',[['소실','첩.']]);
 assert.equal(lookupMeanings(w,mark(w,'소실점')).entries.length,0);
 assert.equal(lookupMeanings(w,mark(w,'소실은')).entries.length,1);
 assert.equal(lookupMeanings(work('소실',[]),{start:0,end:2,text:'소실'}).entries.length,0);
});
test('homonyms require matching local hanja',()=>{
 const w=work('종인(種人)과 종인(宗人)이 왔다. 종인이 말했다.',[['종인(種人)','어떤 사람'],['종인(宗人)','먼 일가']]);
 assert.equal(lookupMeanings(w,mark(w,'종인')).entries[0].meaning,'어떤 사람');
 assert.equal(lookupMeanings(w,mark(w,'종인(宗人)')).entries[0].meaning,'먼 일가');
 assert.equal(lookupMeanings(w,mark(w,'종인이')).entries.length,0);
});
test('stale offsets and partial words cannot receive a source label',()=>{
 const w=work('형옥은 집으로 갔다.',[['형옥','화진']]);
 assert.equal(lookupMeanings(w,{start:1,end:3,text:'형옥'}).stale,true);
 assert.equal(lookupMeanings(w,mark(w,'형')).entries.length,0);
});
test('screenshot expressions including endings resolve only in the reviewed work',()=>{
 for(const text of ['무량대복','송덕','불분동서하고','유리표박하여']){
  const w=work(text,[],'hwangsae');assert.equal(lookupMeanings(w,mark(w,text)).entries.length,1);
  assert.equal(lookupMeanings({...w,id:'another'},mark(w,text)).entries.length,0);
 }
});
test('sentence gives constituent notes, not a fabricated sentence interpretation',()=>{
 const w=work('형옥은 소실을 만났다.',[['형옥','화진'],['소실','첩']]);
 assert.equal(lookupMeanings(w,mark(w,w.body[0].text)).entries.length,2);
});
test('rendered source data is escaped and search query encoded',()=>{
 const w=work('형옥', [['형옥','<script>bad</script>']]);const esc=s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;');
 const html=meaningHTML(w,mark(w,'형옥'),esc);assert.ok(!html.includes('<script>'));assert.ok(html.includes(encodeURIComponent('형옥')));
});
