// ai.js —— 前端呼叫 Cloudflare Worker 的 AI 解盤代理，唯一知道 worker 網址的地方。
const AI_WORKER_URL = 'https://ziwei-ai-interpret.knight0114-45a.workers.dev/interpret';

export class AiError extends Error {}

/** 呼叫 worker 取得 AI 解盤文字；chart/layer 形狀跟 worker 端 buildUserPrompt 對應。 */
export async function fetchAiInterpretation(chart, layer) {
  let res;
  try {
    res = await fetch(AI_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart, layer: layer || null }),
    });
  } catch (e) {
    throw new AiError('AI 解盤服務暫時無法使用，請稍後再試');
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* ignore */ }

  if (res.status === 429) {
    throw new AiError((data && data.message) || '今日AI解盤次數已用完，明日再來');
  }
  if (!res.ok) {
    throw new AiError((data && data.message) || 'AI 解盤服務暫時無法使用，請稍後再試');
  }
  return (data && data.text) || '';
}

/** 把 AI 回傳的純文字依【段落標題】切成區塊，方便分段渲染。 */
export function parseAiSections(text) {
  const parts = text.split(/(?=【[^】]*】)/g).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return [{ title: '', body: text.trim() }];
  return parts.map((p) => {
    const m = p.match(/^【([^】]*)】([\s\S]*)$/);
    if (m) return { title: m[1], body: m[2].trim() };
    return { title: '', body: p };
  });
}
