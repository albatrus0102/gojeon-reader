import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupMeanings,meaningHTML,externalHTML} from '../src/meanings.js';
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
test('verb endings, plural and honorific suffixes still resolve to the headword',()=>{
 for(const [text,term] of [['좌기되기만','좌기'],['추열치','추열'],['불원천리하옵고','불원천리'],['침혹하사','침혹'],['사림들','사림'],['원견지하온','원견지']]){
  const w=work(text+' 하니라.',[[term,'뜻']]);assert.equal(lookupMeanings(w,mark(w,text)).entries.length,1,text);
 }
 const w=work('소실점',[['소실','첩']]);assert.equal(lookupMeanings(w,mark(w,'소실점')).entries.length,0);
});
test('headwords in dictionary form (하다/되다) match their conjugations',()=>{
 const w=work('가장 통해하도다.',[['통해하다','몹시 분하게 여기다.']]);assert.equal(lookupMeanings(w,mark(w,'통해하도다')).entries[0].term,'통해하다');
});
test('hanja glosses inside the body do not break phrase notes',()=>{
 const w=work('차소위락미지액(此所謂落眉之厄)이로다',[['차소위락미지액이로다','이른바 눈썹에 떨어진 재앙이로다.']]);
 assert.equal(lookupMeanings(w,mark(w,'차소위락미지액(此所謂落眉之厄)이로다')).entries.length,1);
 assert.equal(lookupMeanings(w,mark(w,'미지액')).entries.length,1);
});
test('"A ~ B" notes cover the passage and single-letter list headwords need their hanja',()=>{
 const w=work('모사는 재인이요, 성사는 재천이라 하였으니 연(燕), 계(薊)의 연장.',[['모사는 재인이요 ~ 재천이라','일은 사람이 꾸미고 이룸은 하늘에 달림.'],['연, 계','중국 북부 지역 이름.']]);
 assert.equal(lookupMeanings(w,mark(w,'재인이요')).entries[0].term,'모사는 재인이요 ~ 재천이라');
 assert.equal(lookupMeanings(w,mark(w,'연(燕)')).entries[0].term,'연, 계');
 assert.equal(lookupMeanings(w,mark(w,'연장')).entries.length,0);
});
test('external results are rendered with source labels and never as textbook notes',()=>{
 const esc=s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;');
 const r={term:'청촉이나',matched:'청촉',dictionary:[{word:'청촉',pos:'명사',definition:'청을 넣어 부탁함.',origin:'請囑',link:''},{word:'청촉',pos:'명사',definition:'<b>다른 뜻</b>',origin:'',link:''}],ai:{sense:0,meaning:'',context:'재판을 잘 봐 달라고 부탁하는 일.',model:'gemini-3.5-flash-lite'}};
 const html=externalHTML(r,esc);
 assert.ok(html.includes('우리말샘')&&html.includes('청을 넣어 부탁함.')&&!html.includes('<b>')&&!html.includes('다른 뜻'));
 assert.ok(html.includes('AI 문맥 풀이 · 검토 필요')&&!html.includes('교재 각주'));
 assert.ok(externalHTML({dictionary:[],ai:null},esc).includes('찾지 못했어요'));
});
test('verse works: stanza and break blocks keep offsets and workbook notes resolve',()=>{
 const w={id:'ga-test',kind:'verse',collection:'수특',source:'PDF 1쪽',body:[{type:'verse',text:'보고 싶네 임의 얼굴'},{type:'break',text:''},{type:'verse',text:'식불감미하고 침불안석이라'},{type:'stanza',text:'<제1수>'}],notes:[['식불감미','근심으로 음식 맛이 없음.'],['침불안석(寢不安席)','편안히 잠들지 못함.']]};
 const body=w.body.map(b=>b.text).join('');const p=body.indexOf('침불안석이라');
 const r=lookupMeanings(w,{start:p,end:p+6,text:'침불안석이라'});
 assert.equal(r.entries.length,1);assert.equal(r.entries[0].kind,'문제집 각주');assert.ok(r.entries[0].source==='PDF 1쪽');
});
test('suffix check stops at a block boundary so a note at the end of a verse line resolves',()=>{
 const w={id:'v',kind:'verse',body:[{type:'verse',text:'푸른 것은 산람(山嵐)이라'},{type:'verse',text:'수많은 바위 골짜기를'}],notes:[['산람','산 아지랑이.'],['수많은','많고 많은.']],source:'p'};
 const body=w.body.map(b=>b.text).join('');
 assert.equal(lookupMeanings(w,{start:body.indexOf('산람'),end:body.indexOf('산람')+6,text:'산람(山嵐)'}).entries.length,1);
 const q=body.indexOf('수많은');assert.equal(lookupMeanings(w,{start:q,end:q+3,text:'수많은'}).entries[0].term,'수많은');
});
