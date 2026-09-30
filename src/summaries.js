// One-sentence summaries per passage chunk (C1, C2 …). The reader writes their own line for each chunk;
// the reference summary and the easily-confused points stay hidden until they ask for them.
// Drafts are saved through the notes store under `${work}#C1` so they sync like memos.
export function attachSummaries({store,flushDelay=800}){
 let timer;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function preview(w,s){const t=w.body.slice(s.from,s.to).map(b=>b.text).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();return t.length>34?t.slice(0,34)+'…':t;}
 function mount(w){
  if(!Array.isArray(w.segments)||!w.segments.length)return;
  const old=document.getElementById('chunkSummaries');if(old)old.remove();
  const section=document.createElement('section');section.className='bottom-section';section.id='chunkSummaries';
  section.innerHTML=`<h2 class="section-title"><span class="num">C</span>덩어리별 한 문장 요약</h2><p class="source">본문의 C1, C2 표시대로 나뉜 덩어리입니다. 큰 흐름이 잡혔는지 한 문장으로 적고, 기준 요약과 비교해 보세요.</p>${w.segments.map((s,i)=>`<div class="chunk" data-chunk="${i}"><h3><span class="chunk-label">${esc(s.label)}</span><span class="chunk-preview">${esc(preview(w,s))}</span></h3><textarea class="chunk-input" rows="2" maxlength="600" placeholder="이 덩어리를 한 문장으로…" aria-label="${esc(s.label)} 요약"></textarea><details class="chunk-answer"><summary>기준 요약 보기</summary><div class="chunk-body"><p class="chunk-summary">${esc(s.summary)}</p>${s.pitfalls&&s.pitfalls.length?`<p class="chunk-pit-title">헷갈리기 쉬운 점</p><ul class="chunk-pitfalls">${s.pitfalls.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}<p class="source">기준 요약은 본문만 근거로 정리한 것이라 표현이 달라도 흐름이 같으면 맞게 읽은 것입니다.</p></div></details><small class="chunk-status" role="status"></small></div>`).join('')}`;
  const notes=document.getElementById('notes');(notes||document.querySelector('#main footer')).before(section);
  section.querySelectorAll('.chunk').forEach(box=>{
   const i=+box.dataset.chunk,id=`${w.id}#${w.segments[i].label}`,input=box.querySelector('.chunk-input'),status=box.querySelector('.chunk-status');
   const refresh=()=>{const n=store.get(id);if(document.activeElement!==input&&input.value!==n.body)input.value=n.body;status.textContent=!n.body?'':n.conflict?'다른 기기에서 고친 내용이 있어요. 위 칸의 내용으로 다시 저장됩니다.':n.dirty?'기기에 저장됨 · 동기화 대기':store.remote?'저장됨 · 다른 기기와 동기화':'이 기기에 저장됨';};
   input.oninput=()=>{if(store.get(id).conflict)store.resolve(id,input.value);else store.edit(id,input.value);refresh();clearTimeout(timer);timer=setTimeout(()=>store.flush(),flushDelay);};
   box.refresh=refresh;refresh();
  });
 }
 const prev=store.onChange;store.onChange=()=>{if(typeof prev==='function')prev();document.querySelectorAll('#chunkSummaries .chunk').forEach(b=>b.refresh&&b.refresh());};
 addEventListener('reader:work',e=>{const w=e.detail.work||e.detail;if(w&&w.body)mount(w);});
}
