// Evidence-only lookup. Never generate a definition or borrow another work's notes.
const supplemental = [
  {term:'무량대복', meaning:'끝을 헤아리기 어려울 만큼 큰 복.', url:'https://www.gasa.go.kr/GDATA/pdf/V00004976.pdf', source:'한국가사문학관 · 상사곡 주석 95'},
  {term:'송덕', meaning:'남의 덕행이나 공덕을 칭찬하고 기림.', url:'https://www.gasa.go.kr/GDATA/pdf/V00001952.pdf', source:'한국가사문학관 · 권선가 주석 79'},
  {term:'불분동서', meaning:'동쪽·서쪽을 가리지 않음. 이 대목에서는 여기저기 다니는 모습을 나타냄.', url:'https://files-scs.pstatic.net/2023/09/10/2TrWWvelht/황새결송(현대어역)-전문+해설.pdf#page=1', source:'장석규 역주 · 황새결송 1쪽'},
  {term:'유리표박', meaning:'정해진 생업 없이 이곳저곳 떠돌아다님.', url:'https://files-scs.pstatic.net/2023/09/10/2TrWWvelht/황새결송(현대어역)-전문+해설.pdf#page=1', source:'장석규 역주 · 황새결송 1쪽'}
];
const baseTerm = s => s.replace(/\([^)]*\)/g,'').trim();
const wordChar = c => !!c && /[가-힣A-Za-z0-9一-鿿]/u.test(c);
const ending = /^(?:은|는|이|가|을|를|의|에|에서|에게|께|도|만|과|와|으로|로|이라|이요|이니|이라니|이라도|라|하고|하여|하니|하다|한|하며|하되|하므로|하면|이오|이오나|이라면|라니|나|이나|부터|까지|처럼|보다|께서|로서|로써)?$/;

export function lookupMeanings(work, highlight) {
  if(!work) return {entries:[], stale:true};
  const body=work.body.map(b=>b.text).join('');
  const {start,end,text}=highlight;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||body.slice(start,end)!==text)
    return {entries:[],stale:true};
  const notes=(work.notes||[]).map(([term,meaning])=>({term,meaning,source:(work.collection||'수특')+' 각주 · '+work.source,kind:'교재 각주'}));
  if(work.id==='hwangsae')notes.push(...supplemental.map(n=>({...n,kind:'출처 확인 보충'})));
  const entries=[];
  for(const note of notes){
    const base=baseTerm(note.term);
    if(base.length<2||/[~…]/.test(base))continue;
    const ambiguous=notes.filter(n=>baseTerm(n.term)===base).length>1;
    let pos=-1;
    while((pos=body.indexOf(base,pos+1))!==-1){
      if(pos<start||pos+base.length>end||wordChar(body[pos-1]))continue;
      let tail=pos+base.length;
      const hanja=body.slice(tail).match(/^\([一-鿿㐀-䶿豈-﫿]+\)/u)?.[0]||'';
      const expected=note.term.match(/\([^)]*\)/)?.[0];
      if((ambiguous&&!expected)||(expected&&hanja&&hanja!==expected)||(ambiguous&&hanja!==expected))continue;
      tail+=hanja.length;
      const suffix=body.slice(tail).match(/^[가-힣A-Za-z0-9一-鿿]*/u)[0];
      if(!ending.test(suffix))continue;
      entries.push({...note});break;
    }
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
