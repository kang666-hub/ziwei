const ALLOWED_ORIGIN = 'https://kang666-hub.github.io';
const PER_IP_DAILY_LIMIT = 5;
const TOTAL_DAILY_LIMIT = 300;
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1500;
// KV 計數用的過期秒數：留一天緩衝，避免跨時區邊界卡在舊值
const COUNTER_TTL_SECONDS = 172800;

const SYSTEM_PROMPT = `你是一位資深的紫微斗數解盤師，說話溫暖但不誇大、不聳動。使用者會提供一張紫微斗數命盤的完整宮位、星曜、四化資料，請你根據命盤內容撰寫一份解盤文字。

輸出格式規定（務必依序，使用【】標題）：
【整體格局】
【性格特質】
【事業與財帛】
【感情與人際】
【近期大限/流年提示】（只有在使用者提供了大限、流年或流月疊層資料時才寫這一段，否則整段省略，不要留空標題）
【結語】

規定：
- 全文繁體中文，總字數約500-800字
- 每段落2-4句話，盡量扣著使用者提供的實際星曜與宮位，避免空泛套話
- 語氣溫暖、中性、不誇大，避免鐵口直斷的災厄用語
- 禁止給出具體醫療診斷或建議
- 禁止給出具體投資標的或明牌
- 全文最後固定加一句（獨立一行，不要併入結語段落）：「以上解讀僅供參考，人生選擇仍在自己手中。」`;

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (origin === ALLOWED_ORIGIN) headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
  return headers;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildUserPrompt(chart, layer) {
  const c = chart.center;
  const lines = [];
  lines.push(`出生資料：${c.birth.cal} ${c.birth.y}/${c.birth.m}/${c.birth.d}，${c.birth.hourLabel}，${c.gender}`);
  lines.push(`五行局：${c.bureau}，命主：${c.mingZhu}，身主：${c.shenZhu}`);
  lines.push('十二宮位星曜：');
  chart.palaces.forEach((p) => {
    const majors = p.majors.map((s) => s.name + (s.hua ? `化${s.hua}` : '')).join('、') || '（空宮）';
    const minors = p.minors.map((s) => s.name + (s.hua ? `化${s.hua}` : '')).join('、');
    const shen = p.shen ? '（身宮）' : '';
    lines.push(`- ${p.name}${shen}（${p.branch}宮，${p.ganzhi}）：主星 ${majors}${minors ? '；副星 ' + minors : ''}`);
  });
  if (layer) {
    const kind = (layer.tag || '').replace('命', '') || '運限';
    const sihuaText = Object.entries(layer.sihua || {}).map(([star, hua]) => `${star}化${hua}`).join('、');
    lines.push('');
    lines.push(`目前檢視：${kind}`);
    lines.push(`${kind}命宮位於${layer.ming}，${kind}四化：${sihuaText || '無'}`);
  }
  lines.push('');
  lines.push('請依照系統指示的格式撰寫這張命盤的解盤文字。');
  return lines.join('\n');
}

async function getCount(env, key) {
  const v = await env.RATE_LIMIT.get(key);
  return parseInt(v || '0', 10);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: 'origin_not_allowed', message: '不允許的來源' }, 403, origin);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/interpret' || request.method !== 'POST') {
      return json({ error: 'not_found', message: '找不到這個路徑' }, 404, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'bad_request', message: '請求格式錯誤' }, 400, origin);
    }

    const chart = body && body.chart;
    const layer = (body && body.layer) || null;
    if (!chart || !chart.center || !Array.isArray(chart.palaces)) {
      return json({ error: 'bad_request', message: '缺少命盤資料' }, 400, origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const today = todayKey();
    const totalKey = `total:${today}`;
    const ipKey = `ip:${ip}:${today}`;

    const [totalCount, ipCount] = await Promise.all([getCount(env, totalKey), getCount(env, ipKey)]);

    if (ipCount >= PER_IP_DAILY_LIMIT) {
      return json({ error: 'rate_limit_ip', message: '今日AI解盤次數已用完，明日再來' }, 429, origin);
    }
    if (totalCount >= TOTAL_DAILY_LIMIT) {
      return json({ error: 'rate_limit_total', message: '今日AI解盤次數已用完，明日再來' }, 429, origin);
    }

    let aiRes;
    try {
      aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserPrompt(chart, layer) }],
        }),
      });
    } catch (e) {
      return json({ error: 'upstream_error', message: 'AI 解盤服務暫時無法使用，請稍後再試' }, 502, origin);
    }

    if (!aiRes.ok) {
      return json({ error: 'upstream_error', message: 'AI 解盤服務暫時無法使用，請稍後再試' }, 502, origin);
    }

    const data = await aiRes.json();
    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const usage = data.usage || {};

    await Promise.all([
      env.RATE_LIMIT.put(ipKey, String(ipCount + 1), { expirationTtl: COUNTER_TTL_SECONDS }),
      env.RATE_LIMIT.put(totalKey, String(totalCount + 1), { expirationTtl: COUNTER_TTL_SECONDS }),
    ]);

    return json({ text, usage }, 200, origin);
  },
};
