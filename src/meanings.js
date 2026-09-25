// Evidence-only lookup. Never generate a definition or borrow another work's notes.
const supplemental = [
  {term:'무량대복', meaning:'끝을 헤아리기 어려울 만큼 큰 복.', url:'https://www.gasa.go.kr/GDATA/pdf/V00004976.pdf', source:'한국가사문학관 · 상사곡 주석 95'},
  {term:'송덕', meaning:'남의 덕행이나 공덕을 칭찬하고 기림.', url:'https://www.gasa.go.kr/GDATA/pdf/V00001952.pdf', source:'한국가사문학관 · 권선가 주석 79'},
  {term:'불분동서', meaning:'동쪽·서쪽을 가리지 않음. 이 대목에서는 여기저기 다니는 모습을 나타냄.', url:'https://files-scs.pstatic.net/2023/09/10/2TrWWvelht/황새결송(현대어역)-전문+해설.pdf#page=1', source:'장석규 역주 · 황새결송 1쪽'},
  {term:'유리표박', meaning:'정해진 생업 없이 이곳저곳 떠돌아다님.', url:'https://files-scs.pstatic.net/2023/09/10/2TrWWvelht/황새결송(현대어역)-전문+해설.pdf#page=1', source:'장석규 역주 · 황새결송 1쪽'}
];
const HANJA = /[一-鿿㐀-䶿豈-﫿]/u;
const stripQuotes = s => s.replace(/^[‘’“”'"「」『』\s]+|[‘’“”'"「」『』\s.]+$/g,'');
// Dictionary form of a note term: no hanja gloss, no quotes, no 하다/되다 headword ending.
const baseTerm = s => stripQuotes(s.replace(/\([^)]*\)/g,'')).replace(/(하|되)다$/,'');
const wordChar = c => !!c && /[가-힣A-Za-z0-9一-鿿]/u.test(c);
// A suffix is accepted when it is built only from particles and verb endings (하-/되-/치- stems included), so 좌기되기만·추열치·불원천리하옵고 resolve while 소실점 does not.
const ending = /^(?:은|는|이|가|을|를|의|에|에서|에게|께|도|만|과|와|으로|로|라|나|요|오|온|올|옴|부터|까지|처럼|보다|께서|로서|로써|들|하|되|치|한|된|할|될|함|됨|하는|되는|하던|되던|옵|사오|사옵|사|시|셔|겠|었|였|기|고|여|니|다|며|매|면|되어|리라|리로다|리니|리오|로다|로되|다가|더니|더라|든|든지|지|자|서|야|어|아|게|도록|노라|노니|소서|소이다|나이다|냐|뇨|ㄴ)*$/;

// Body with hanja glosses removed, plus a map back to original offsets, so 차소위락미지액이로다 matches 차소위락미지액(此所謂落眉之厄)이로다.
function cleanBody(body){
  let text='',map=[];
  for(let i=0;i<body.length;i++){
    if(body[i]==='('){const close=body.indexOf(')',i);if(close>i+1&&HANJA.test(body.slice(i+1,close))&&!/[^一-鿿㐀-䶿豈-﫿·,\s]/u.test(body.slice(i+1,close))){i=close;continue;}}
    text+=body[i];map.push(i);
  }
  return {text,map};
}

function findAll(clean,base){
  const out=[];let pos=-1;
  while((pos=clean.text.indexOf(base,pos+1))!==-1)out.push([clean.map[pos],clean.map[pos+base.length-1]+1]);
  return out;
}

export function lookupMeanings(work, highlight) {
  if(!work) return {entries:[], stale:true};
  const body=work.body.map(b=>b.text).join('');
  const {start,end,text}=highlight;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||body.slice(start,end)!==text)
    return {entries:[],stale:true};
  const clean=cleanBody(body);
  const notes=(work.notes||[]).map(([term,meaning])=>({term,meaning,source:(work.collection||'수특')+' 각주 · '+work.source,kind:'교재 각주'}));
  if(work.id==='hwangsae')notes.push(...supplemental.map(n=>({...n,kind:'출처 확인 보충'})));
  const entries=[];
  for(const note of notes){
    if(/~/.test(note.term)){ // "A ~ B" notes explain the whole passage from A to B
      const [head,tail]=note.term.split(/\s*~\s*/).map(baseTerm);
      const a=findAll(clean,head)[0];if(!a)continue;
      const b=tail?findAll(clean,tail).find(([s])=>s>=a[1]):null;
      const span=[a[0],b?b[1]:a[1]];
      if(span[0]<end&&span[1]>start)entries.push({...note});
      continue;
    }
    // "연, 계" lists several headwords; a single-character headword must carry its hanja gloss in the body.
    const variants=note.term.split(/,\s*/).map(v=>({base:baseTerm(v),expected:v.match(/\([^)]*\)/)?.[0]})).filter(v=>v.base&&!/[…]/.test(v.base));
    let hit=false;
    for(const {base,expected} of variants){
      // Phrase notes (차소위락미지액이로다, 조정은 막여작이요 …) explain a passage: any highlight touching it gets the note.
      if(/\s/.test(base)||base.length>=6){hit=findAll(clean,base).some(([pos,tailStart])=>pos<end&&tailStart>start);if(hit)break;continue;}
      const ambiguous=notes.filter(n=>baseTerm(n.term)===base).length>1;
      for(const [pos,tailStart] of findAll(clean,base)){
        if(pos<start||tailStart>end||wordChar(body[pos-1]))continue;
        let tail=tailStart;
        const hanja=body.slice(tail).match(/^\([一-鿿㐀-䶿豈-﫿]+\)/u)?.[0]||'';
        if(base.length<2&&!hanja)continue;
        if((ambiguous&&!expected)||(expected&&hanja&&hanja!==expected)||(ambiguous&&hanja!==expected))continue;
        tail+=hanja.length;
        const suffix=body.slice(tail).match(/^[가-힣A-Za-z0-9一-鿿]*/u)[0];
        if(!ending.test(suffix))continue;
        hit=true;break;
      }
      if(hit)break;
    }
    if(hit)entries.push({...note});
  }
  return {entries,stale:false};
}

export function meaningHTML(work,h,esc){
  const {entries,stale}=lookupMeanings(work,h);
  const content=entries.length?entries.map(n=>`<div class="meaning-entry"><p><strong>${esc(n.term)}</strong> · ${esc(n.meaning)}</p><small>${esc(n.kind)}${n.url?` · <a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.source)}</a>`:` · ${esc(n.source)}`}</small></div>`).join(''):`<p class="meaning-empty">${stale?'본문 위치가 달라 풀이를 연결하지 않았어요. 본문에서 다시 표시해 주세요.':'확인된 풀이가 아직 없어요. 추측한 뜻은 표시하지 않아요.'}</p>`;
  const query=h.text.trim();
  const dictionary=query.length<=40?`<a class="dictionary-link" href="https://ko.dict.naver.com/#/search?query=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">국어사전에서 찾기 ↗</a>`:'';
  return `<div class="highlight-meaning">${entries.length&&query.length>40?'<small>선택한 구절에 포함된 낱말 풀이</small>':''}${content}${dictionary}</div>`;
}

// Rendering for external lookups returned by the `meaning` edge function: {term,matched,dictionary,ai}.
export function externalHTML(r,esc){
  const dict=Array.isArray(r?.dictionary)?r.dictionary:[],ai=r?.ai||null;
  const chosen=ai&&Number.isInteger(ai.sense)?ai.sense:null;
  const parts=[];
  dict.forEach((s,i)=>{
    if(chosen!==null&&i!==chosen)return;
    if(chosen===null&&i>=4)return;
    parts.push(`<div class="meaning-entry dict"><p><strong>${esc(s.word)}</strong>${s.origin?` <span class="origin">${esc(s.origin)}</span>`:''}${s.pos?` <span class="origin">${esc(s.pos)}</span>`:''} · ${esc(s.definition)}</p><small>우리말샘 · 국립국어원${chosen!==null?' · AI가 문맥에 맞게 고른 뜻':dict.length>4?` · 뜻 ${dict.length}개 중 4개`:''} · <a href="https://opendict.korean.go.kr/search/searchResult?query=${encodeURIComponent(s.word)}" target="_blank" rel="noopener noreferrer">사전 보기 ↗</a></small></div>`);
  });
  if(ai&&(ai.context||(!dict.length&&ai.meaning)))
    parts.push(`<div class="meaning-entry ai"><p>${!dict.length&&ai.meaning?`<strong>${esc(ai.meaning)}</strong> · `:''}${esc(ai.context||'')}</p><small>AI 문맥 풀이 · 검토 필요 · ${esc(ai.model||'')}</small></div>`);
  return parts.join('')||'<p class="meaning-empty">사전에서도 찾지 못했어요. 추측한 뜻은 표시하지 않아요.</p>';
}
