export function mountReader(works,userId,onHighlights){
const WORKS=works;
const $=s=>document.querySelector(s), KEY='classics-reader-cloud-'+userId;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state={theme:'sepia',font:null,work:WORKS[0].id,highlights:[],positions:{}},pending=null,deleting=null,restoring=false,toastTimer;
try{const loaded=JSON.parse(localStorage.getItem(KEY)||'null');if(loaded&&typeof loaded==='object')Object.assign(state,loaded);if(!Array.isArray(state.highlights))state.highlights=[];if(!state.positions||typeof state.positions!=='object')state.positions={};localStorage.setItem(KEY,JSON.stringify(state));}catch(e){$('#storageWarning').hidden=false;}
state.font=state.font==null?null:Math.min(26,Math.max(16,Number(state.font)||18.5));if(!['sepia','white','dark'].includes(state.theme))state.theme='sepia';
const collectionOf=w=>w.collection||'수특';
const collections=['수특','수완'].filter(c=>WORKS.some(w=>collectionOf(w)===c));
if(!collections.includes(state.collection))state.collection=collections[0];
let atHome=true;
let current=WORKS.find(w=>w.id===state.work)||WORKS[0];
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));onHighlights(state.highlights);}catch(e){$('#storageWarning').hidden=false;}}
function toast(t){$('#toast').textContent=t;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').textContent='',2200);}
const tabletWidth=matchMedia('(min-width:700px)');
function effectiveFont(){return state.font??(tabletWidth.matches?20:18.5);}
function appearance(){document.body.dataset.theme=state.theme;document.documentElement.style.setProperty('--font',effectiveFont()+'px');$('#fontSize').textContent=effectiveFont()+'px';$('#smaller').disabled=effectiveFont()<=16;$('#larger').disabled=effectiveFont()>=26;document.querySelectorAll('#themes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.theme===state.theme));}
function showHome(){
 savePosition();atHome=true;document.body.dataset.view='home';pending=null;getSelection().removeAllRanges();$('#highlightBar').hidden=true;$('#homeButton').hidden=true;$('#workSelect').hidden=true;$('#homeBrand').hidden=false;$('#progress').style.width='0';$('#count').textContent=state.highlights.length;
 const visibleWorks=WORKS.filter(w=>collectionOf(w)===state.collection);
 $('#main').innerHTML=`<div class="home-heading"><div class="eyebrow">2027 수능특강 · 수능완성</div><h1>오늘 읽을 작품</h1><p class="meta">고전산문 ${WORKS.length}작품 · 원문과 함께 읽는 이야기의 맥락</p></div><nav class="collections" aria-label="교재별 작품 목록">${collections.map(c=>`<button data-collection="${c}" aria-pressed="${c===state.collection}">${c}<span>${WORKS.filter(w=>collectionOf(w)===c).length}</span></button>`).join('')}</nav><h2 class="shelf-label">${state.collection==='수완'?'수능완성':'수능특강'} <span>${visibleWorks.length}작품</span></h2><div class="shelf">${visibleWorks.map((w,i)=>`<button class="book" data-work="${w.id}"><span class="book-index">${String(i+1).padStart(2,'0')}</span><span class="book-text"><span class="book-title">${w.title}</span><span class="book-meta">${w.genre} · ${w.author||'작자 미상'}</span></span><span class="book-arrow" aria-hidden="true">›</span></button>`).join('')}</div>`;
 document.querySelectorAll('[data-collection]').forEach(b=>b.onclick=()=>{state.collection=b.dataset.collection;persist();showHome();document.querySelector(`[data-collection="${state.collection}"]`).focus({preventScroll:true});});
 document.querySelectorAll('[data-work]').forEach(b=>b.onclick=()=>{current=WORKS.find(w=>w.id===b.dataset.work);render(false);});scrollTo(0,0);
}
function render(restore=true){
 atHome=false;document.body.dataset.view='reader';$('#homeButton').hidden=false;$('#workSelect').hidden=false;$('#homeBrand').hidden=true;
 pending=null;$('#highlightBar').hidden=true;state.work=current.id;$('#workSelect').value=current.id;
 const w=current,collection=collectionOf(w),bookLabel=collection==='수완'?'수능완성':'수능특강';state.collection=collection;
 $('#main').innerHTML=`<div class="eyebrow">${bookLabel} 문학 · ${w.author||'작자 미상'} · ${w.genre}</div><h1>${w.title}</h1><p class="meta">${w.source}</p><div class="actions"><button class="primary" id="toBody">본문 바로 읽기</button></div>
 <details id="synopsis"><summary><span class="num">01</span><span>전체 줄거리<small>${w.synopsis.length}개 ${w.id==='kkokdu'?'거리':'장면'} · 처음부터 결말까지</small></span></summary><div class="detail-content synopsis"><p class="source">${w.synSource} / 원문 페이지를 확인해 재서술한 줄거리</p>${w.synopsis.map((s,i)=>`<h3><span>${String(i+1).padStart(2,'0')}</span>${esc(s[0])}</h3><p>${esc(s[1])}</p>`).join('')}</div></details>
 <details id="diagrams"><summary><span class="num">02</span><span>${w.diagramTitle}<small>KBS 원본 · 눌러서 확대</small></span></summary><div class="detail-content">${w.diagrams.map((d,i)=>`<button class="figure-button" data-figure="${i}" aria-label="${esc(d.caption)} 확대"><img src="${d.src}" alt="${esc(d.caption)}"></button><p class="caption">${d.caption} · 눌러서 크게 보기</p>`).join('')}</div></details>
 <section class="position"><h2><span class="num">03</span>${collection}은 이 부분</h2><p>${w.location}</p>${w.variantNote?`<p class="source">${esc(w.variantNote)}</p>`:""}<ol class="timeline">${w.timeline.map(t=>`<li class="${t.startsWith(collection)?'current':''}">${t}</li>`).join('')}</ol></section>
 <section class="excerpt-section" id="excerpt"><h2 class="section-title"><span class="num">04</span>${bookLabel} 본문</h2><p class="source">${w.source}<br>단어나 문장을 길게 눌러 표시할 수 있어요.</p><div class="reading" id="reading">${w.body.map((b,i)=>`<${b.type==='heading'?'h3':'p'} id="b${i}" data-block="${i}" class="${b.type}">${b.type==='dialogue'?'<span class="speaker">'+esc(b.text.slice(0,b.text.indexOf(' : ')))+'</span>'+esc(b.text.slice(b.text.indexOf(' : '))):esc(b.text)}</${b.type==='heading'?'h3':'p'}>`).join('')}</div><p class="source">— ${w.author||'작자 미상'}, 「${w.title}」</p></section>
 <section class="bottom-section" id="notes"><h2 class="section-title"><span class="num">05</span>각주·낱말</h2><dl class="notes">${w.notes.length?w.notes.map(n=>`<div><dt>${esc(n[0])}</dt><dd>${esc(n[1])}</dd></div>`).join(''):'<div class=source>이 수록 대목에는 별도로 실린 각주가 없습니다.</div>'}</dl><p class="source">${bookLabel} 수록 각주</p></section>
 <section class="bottom-section"><h2 class="section-title"><span class="num">06</span>핵심 포인트</h2>${w.points.map(p=>`<div class="point"><h3>${esc(p[0])}</h3><p>${esc(p[1])}</p></div>`).join('')}<p class="source">${w.pointSource}</p></section><footer>본문은 업로드된 ${bookLabel} PDF 기준입니다. 문항·선지와 문항용 기호·밑줄은 제외하고, 한자 병기와 지문·중략·각주는 유지했습니다. 줄거리·도표·보충 설명은 KBS 기준입니다.<br><br>고전 읽기 · ${bookLabel} 독서판</footer>`;
 applyHighlights();$('#toBody').onclick=()=>$('#excerpt').scrollIntoView();
 document.querySelectorAll('[data-figure]').forEach(b=>b.onclick=()=>{const d=w.diagrams[+b.dataset.figure];$('#zoomImage').src=d.src;$('#zoomImage').style.width='100%';$('#zoomLabel').textContent='KBS 원본';$('#zoom').showModal();});
 $('#reading').onclick=e=>{let m=e.target.closest('mark');if(m&&!getSelection().toString()){askDelete(m.dataset.id);}};
 if(restore&&state.positions[w.id]){restoring=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{restorePosition();restoring=false;}));}else{restoring=true;scrollTo(0,0);requestAnimationFrame(()=>restoring=false);}
 persist();updateProgress();dispatchEvent(new CustomEvent("reader:work",{detail:{id:w.id,title:w.title}}));
}
function applyHighlights(){
 const root=$('#reading');if(!root){$('#count').textContent=state.highlights.length;return;}root.querySelectorAll('mark').forEach(m=>m.replaceWith(document.createTextNode(m.textContent)));root.normalize();
 const records=state.highlights.filter(h=>h.work===current.id).sort((a,b)=>b.start-a.start);
 for(const h of records){if(root.textContent.slice(h.start,h.end)!==h.text)continue;let walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n,offset=0,parts=[];while(n=walker.nextNode()){let len=n.length;if(offset<h.end&&offset+len>h.start)parts.push([n,Math.max(0,h.start-offset),Math.min(len,h.end-offset)]);offset+=len;}
 for(let i=parts.length-1;i>=0;i--){let[n,a,b]=parts[i],r=document.createRange();r.setStart(n,a);r.setEnd(n,b);const m=document.createElement('mark');m.dataset.color=h.color;m.dataset.id=h.id;m.title='눌러서 표시 삭제';r.surroundContents(m);}}
 // Color the speaker label without changing the underlying text used for saved ranges.
 $('#count').textContent=state.highlights.length;
}
function captureSelection(){
 const sel=getSelection(),root=$('#reading');if(!root||!sel.rangeCount||sel.isCollapsed){if(!pending)$('#highlightBar').hidden=true;return;}
 const r=sel.getRangeAt(0);if(!root.contains(r.startContainer)||!root.contains(r.endContainer)){pending=null;$('#highlightBar').hidden=true;return;}
 const prefix=document.createRange();prefix.selectNodeContents(root);prefix.setEnd(r.startContainer,r.startOffset);const start=prefix.toString().length,end=start+r.toString().length;
 if(end>start&&r.toString().trim()){pending={work:current.id,start,end,text:root.textContent.slice(start,end)};$('#highlightBar').hidden=false;}
}
document.addEventListener('selectionchange',()=>{const s=getSelection();if(s.isCollapsed){pending=null;$('#highlightBar').hidden=true;}else captureSelection();});
$('#highlightBar').addEventListener('pointerdown',e=>e.preventDefault());
$('#highlightBar').querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{if(!pending)return;const h={...pending,color:b.dataset.color,id:Date.now().toString(36)+Math.random().toString(36).slice(2,7)};state.highlights=state.highlights.filter(x=>x.work!==h.work||x.end<=h.start||x.start>=h.end);state.highlights.push(h);pending=null;getSelection().removeAllRanges();$('#highlightBar').hidden=true;persist();applyHighlights();toast('하이라이트를 저장했어요');});
$('#cancelHighlight').onclick=()=>{pending=null;getSelection().removeAllRanges();$('#highlightBar').hidden=true;};
function askDelete(id){deleting=id;const h=state.highlights.find(h=>h.id===id);if(!h)return;$('#deleteText').textContent=h.text;$('#deleteDialog').showModal();}
$('#confirmDelete').onclick=()=>{state.highlights=state.highlights.filter(h=>h.id!==deleting);persist();applyHighlights();renderSaved();$('#deleteDialog').close();toast('표시를 지웠어요');};
function excerptLabel(h){const w=WORKS.find(w=>w.id===h.work);if(!w)return h.text;let offset=0,parts=[];for(const b of w.body){const end=offset+b.text.length;if(offset<h.end&&end>h.start)parts.push(b.text.slice(Math.max(0,h.start-offset),Math.min(b.text.length,h.end-offset)));offset=end;}return parts.join('\n\n');}
function renderSaved(){const list=$('#savedItems');list.innerHTML=state.highlights.length?state.highlights.map(h=>{const w=WORKS.find(w=>w.id===h.work);return `<div class="saved-item"><small><span class="saved-swatch ${h.color}"></span>${esc(w?collectionOf(w)+' · '+w.title:'작품')}</small><p>${esc(excerptLabel(h))}</p><button data-jump="${h.id}">본문에서 보기</button><button data-delete="${h.id}">삭제</button></div>`;}).join(''):'<p style="margin-top:25px">아직 표시한 문장이 없어요. 본문에서 단어나 문장을 선택하고 색을 골라 보세요.</p>';
 list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>askDelete(b.dataset.delete));list.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{const h=state.highlights.find(h=>h.id===b.dataset.jump);savePosition();current=WORKS.find(w=>w.id===h.work);$('#saved').close();render(false);requestAnimationFrame(()=>{const m=$('#reading').querySelector(`mark[data-id="${h.id}"]`);if(m)m.scrollIntoView({block:'center'});});});}
function savePosition(){if(restoring||atHome)return;let nodes=[...document.querySelectorAll('#reading [data-block]')],n=nodes.find(n=>n.getBoundingClientRect().bottom>90);const inBody=$('#excerpt')&&$('#excerpt').getBoundingClientRect().top<100;state.positions[current.id]=inBody&&n?{block:+n.dataset.block,fraction:Math.max(0,(80-n.getBoundingClientRect().top)/n.getBoundingClientRect().height)}:{y:scrollY};persist();}
function restorePosition(){const p=state.positions[current.id];if(!p)return;const n=document.getElementById('b'+p.block);if(n)scrollTo(0,scrollY+n.getBoundingClientRect().top+p.fraction*n.getBoundingClientRect().height-80);else scrollTo(0,p.y||0);}
function updateProgress(){const root=$('#reading');if(!root)return;const r=root.getBoundingClientRect(),total=r.height;const pct=Math.max(0,Math.min(100,(80-r.top)/total*100));$('#progress').style.width=pct+'%';}
let scrollTimer;addEventListener('scroll',()=>{updateProgress();clearTimeout(scrollTimer);scrollTimer=setTimeout(savePosition,250);},{passive:true});addEventListener('pagehide',savePosition);document.addEventListener('visibilitychange',()=>{if(document.hidden)savePosition();});
$('#workSelect').innerHTML=collections.map(c=>`<optgroup label="${c==='수완'?'수능완성':'수능특강'}">${WORKS.filter(w=>collectionOf(w)===c).map(w=>`<option value="${w.id}">${w.title}</option>`).join('')}</optgroup>`).join('');$('#workSelect').onchange=e=>{savePosition();current=WORKS.find(w=>w.id===e.target.value);render();};
$('#settingsButton').onclick=()=>$('#settings').showModal();$('#listButton').onclick=()=>{renderSaved();$('#saved').showModal();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#themes').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme;appearance();persist();});
function changeFont(delta){savePosition();state.font=Math.max(16,Math.min(26,effectiveFont()+delta));appearance();persist();if(!atHome)restorePosition();}
$('#smaller').onclick=()=>changeFont(-.5);$('#larger').onclick=()=>changeFont(.5);
$('#zoomIn').onclick=()=>$('#zoomImage').style.width=Math.min(400,parseFloat($('#zoomImage').style.width)+50)+'%';$('#zoomOut').onclick=()=>$('#zoomImage').style.width=Math.max(100,parseFloat($('#zoomImage').style.width)-50)+'%';
tabletWidth.addEventListener('change',appearance);
$('#homeButton').onclick=showHome;appearance();showHome();
return {getHighlights:()=>state.highlights, receiveHighlights(items){state.highlights=items;localStorage.setItem(KEY,JSON.stringify(state));applyHighlights();renderSaved();}, importHighlights(items){state.highlights=items;persist();applyHighlights();renderSaved();}};

}