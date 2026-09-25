// Edge function: look a highlighted word up in 우리말샘 (국립국어원 open dictionary) and,
// when GEMINI_API_KEY is set, ask Gemini which sense fits the passage. Results are cached
// per (work, term) in public.reader_meanings so each word is fetched once for everyone.
// Secrets: OPENDICT_KEY (required), GEMINI_API_KEY (optional), SUPABASE_* (provided by Supabase).
import {createClient} from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {...cors, 'Content-Type': 'application/json'}});

const HANJA = /[一-鿿㐀-䶿豈-﫿]/;
const stripGloss = (s: string) => s.replace(/\([^)]*\)/g, '').replace(/[^\p{Script=Hangul}\p{Script=Han}A-Za-z0-9]/gu, '').trim();
// Candidate headwords: the word itself, then with a recognised particle/ending removed (so 명정지하에 → 명정지하 but never 명정), then +하다.
const ENDING = /^(?:은|는|이|가|을|를|의|에|에서|에게|께|도|만|과|와|으로|로|이나|나|이요|이라|라|요|오|들|토록|하고|하여|하니|하매|하며|하되|하면|하다|한|하는|하옵고|하옵나니|하사|하도다|하리라|하니라|치|되|되기만|되어|되니|된|되고)$/;
function candidates(word: string): string[] {
  const base = stripGloss(word);
  const out = new Set<string>([base]);
  for (let cut = 1; cut <= 4 && base.length - cut >= 2; cut++) {
    const suffix = base.slice(base.length - cut);
    if (!ENDING.test(suffix)) continue;
    const c = base.slice(0, base.length - cut);
    out.add(c); out.add(c + '하다');
  }
  return [...out].slice(0, 9);
}

type Sense = {word: string; pos: string; definition: string; origin: string; link: string};
async function opendict(term: string, key: string): Promise<Sense[]> {
  const url = `https://opendict.korean.go.kr/api/search?key=${key}&q=${encodeURIComponent(term)}&req_type=json&part=word&sort=dict&num=10&advanced=y&method=exact`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('opendict ' + res.status);
  const data = await res.json();
  const items = data?.channel?.item ?? [];
  const senses: Sense[] = [];
  for (const item of items) {
    const word = String(item.word ?? '').replace(/[-^]/g, '');
    if (word !== term) continue;
    const list = Array.isArray(item.sense) ? item.sense : item.sense ? [item.sense] : [];
    for (const s of list) {
      senses.push({word, pos: String(s.pos ?? ''), definition: String(s.definition ?? '').trim(), origin: String(item.origin ?? s.origin ?? ''), link: String(s.link ?? '')});
    }
  }
  return senses.slice(0, 8);
}

type AI = {sense: number | null; meaning: string; context: string; model: string; at: string};
async function gemini(term: string, context: string, senses: Sense[], key: string): Promise<AI | null> {
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash-lite';
  const senseList = senses.map((s, i) => `${i + 1}. [${s.pos}${s.origin ? ' · ' + s.origin : ''}] ${s.definition}`).join('\n');
  const prompt = senses.length
    ? `다음은 한국 고전소설 본문의 한 대목과, 그 안에서 학생이 표시한 낱말 "${term}"의 국어사전(우리말샘) 뜻풀이 후보입니다.\n\n본문:\n${context}\n\n뜻풀이 후보:\n${senseList}\n\n이 문맥에 맞는 후보 번호(sense)를 고르고, 학생이 이해하기 쉽게 이 문맥에서 어떤 뜻으로 쓰였는지 한 문장(context)으로 설명하세요. 어느 후보도 맞지 않으면 sense는 null로 두고 meaning에 추정 뜻을 적되 확신이 없으면 "확인 필요"라고 적으세요. JSON만 출력: {"sense": 번호 또는 null, "meaning": "짧은 뜻", "context": "문맥 설명 한 문장"}`
    : `다음은 한국 고전소설 본문의 한 대목입니다. 학생이 표시한 낱말 "${term}"은 국어사전에서 찾지 못했습니다.\n\n본문:\n${context}\n\n한자어 구성이나 문맥으로 미루어 가장 가능성 높은 뜻을 짧게 적고(meaning), 이 문맥에서의 쓰임을 한 문장으로 설명하세요(context). 확신이 낮으면 meaning 앞에 "(추정)"을 붙이세요. 지어내지 말고 모르면 "확인 필요"라고 적으세요. JSON만 출력: {"sense": null, "meaning": "...", "context": "..."}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({contents: [{parts: [{text: prompt}]}], generationConfig: {temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 300}}),
  });
  if (!res.ok) { console.error('gemini', res.status, await res.text()); return null; }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: {text?: string}) => p.text ?? '').join('') ?? '';
  try {
    const parsed = JSON.parse(text);
    const sense = Number.isInteger(parsed.sense) && parsed.sense >= 1 && parsed.sense <= senses.length ? parsed.sense - 1 : null;
    return {sense, meaning: String(parsed.meaning ?? '').slice(0, 200), context: String(parsed.context ?? '').slice(0, 300), model, at: new Date().toISOString()};
  } catch { console.error('gemini parse', text); return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: cors});
  if (req.method !== 'POST') return json({error: 'method'}, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const dictKey = Deno.env.get('OPENDICT_KEY'), geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!dictKey) return json({error: 'OPENDICT_KEY not configured'}, 500);

  // Caller must be a signed-in reader member.
  const auth = req.headers.get('Authorization') ?? '';
  const user = createClient(url, anon, {global: {headers: {Authorization: auth}}});
  const {data: {user: me}} = await user.auth.getUser();
  if (!me) return json({error: 'unauthorized'}, 401);
  const {data: member} = await user.from('reader_members').select('user_id').eq('user_id', me.id).maybeSingle();
  if (!member) return json({error: 'forbidden'}, 403);

  let body: {work?: string; term?: string; context?: string; refresh?: boolean};
  try { body = await req.json(); } catch { return json({error: 'bad json'}, 400); }
  const work = String(body.work ?? '').slice(0, 64), term = String(body.term ?? '').trim().slice(0, 40), context = String(body.context ?? '').slice(0, 600);
  if (!work || term.length < 1 || term.length > 40) return json({error: 'bad input'}, 400);

  const admin = createClient(url, service);
  if (!body.refresh) {
    const {data: cached} = await admin.from('reader_meanings').select('term,matched,dictionary,ai').eq('work', work).eq('term', term).maybeSingle();
    if (cached) return json({...cached, cached: true});
  }

  let matched: string | null = null, dictionary: Sense[] = [];
  for (const c of candidates(term)) {
    try { dictionary = await opendict(c, dictKey); } catch (e) { console.error(e); return json({error: 'dictionary unavailable'}, 502); }
    if (dictionary.length) { matched = c; break; }
  }
  let ai: AI | null = null;
  if (geminiKey && context) ai = await gemini(matched ?? stripGloss(term), context, dictionary, geminiKey);

  const row = {work, term, matched, dictionary, ai, updated_at: new Date().toISOString()};
  const {error} = await admin.from('reader_meanings').upsert(row);
  if (error) console.error(error);
  return json({term, matched, dictionary, ai, cached: false});
});
