import Anthropic from '@anthropic-ai/sdk';

const RESPONSE_SCHEMA = `{
  "summary": "string，本年整體運勢總覽，約200-300字",
  "yearOverview": "string，流年四化與命盤結構如何交織影響全年，約200-300字",
  "months": [
    { "month": 1, "weather": "string，該月氣象", "doThings": "string，該做", "avoidThings": "string，該避" }
    // 共 12 筆，month 從 1 到 12（農曆月序）
  ],
  "career": "string，事業運勢分析，約150-250字",
  "love": "string，感情運勢分析，約150-250字",
  "health": "string，健康運勢分析，約150-250字",
  "actions": ["string", "string", "string", "string", "string"]
}`;

function buildPrompt(chart) {
  const { input, center, yearly, monthly, starIndex } = chart;
  const natalSummary = chart.palaces
    .map((p) => {
      const stars = [...p.majors, ...p.minors]
        .map((s) => s.name + (s.hua ? `(${s.hua})` : ''))
        .join('、') || '（無主星）';
      return `${p.name}[${p.ganzhi}]${p.isBodyPalace ? '〈身宮〉' : ''}：${stars}`;
    })
    .join('\n');

  const yearlyMutagenText =
    yearly.mutagen.map((m) => `${m.star}${m.hua}(${m.palace || '未知'})`).join('、') || '無';

  const monthlyTable = monthly
    .map((m) => {
      const mutagenText =
        m.mutagen.map((x) => `${x.star}${x.hua}(${x.palace || '未知'})`).join('、') || '無';
      return `農曆${m.month}月：流月命宮入本命「${m.natalPalaceName}」宮（${m.branch}，${m.ganzhi}）；流月四化：${mutagenText}`;
    })
    .join('\n');

  const starIndexTable = starIndex
    .map((s) => `${s.star} → ${s.palace}宮${s.hua ? `（生年化${s.hua}）` : ''}`)
    .join('\n');

  return `你是一位專業紫微斗數命理師，為客戶撰寫一份${yearly.year}${yearly.ganzhi}年的付費流年運勢報告書。

【客戶本命盤資料】
性別：${center.genderLabel}
生辰：國曆 ${input.date} ${input.hourLabel}
農曆：${center.lunarDisplay}
五行局：${center.bureau}　命主：${center.mingZhu}　身主：${center.shenZhu}
命宮：${center.mingGong.ganzhi}　身宮：${center.shenGong.name}[${center.shenGong.ganzhi}]

十二宮位主星與生年四化：
${natalSummary}

【星曜–宮位對照表（唯一可信來源）】
${starIndexTable}

【${yearly.year}${yearly.ganzhi}年流年資料】
流年干支：${yearly.ganzhi}
流年命宮：落在本命「${yearly.mingGong.natalPalaceName}」宮（${yearly.mingGong.branch}）
流年四化：${yearlyMutagenText}
流年十二宮對應：${yearly.palaceNames.join('、')}

【${yearly.year}${yearly.ganzhi}年十二流月命宮對照表（唯一可信來源，逐月已算好，不必自行推算）】
${monthlyTable}

【撰寫要求】
1. 六大章節內容須緊扣上述命盤與流年四化資料，不可空泛套話。
2. 十二流月（農曆月序1-12）每月三要素：
   - weather（氣象）：當月整體氛圍
   - doThings（該做）：具體可執行的建議
   - avoidThings（該避）：具體該避免的事項
3. actions 為5條全年可執行的具體行動建議，須具體到「做什麼」而非空泛心態語。
4. 語氣專業溫和，不恐嚇、不誇大、不製造焦慮。
5. 嚴禁提供醫療診斷、投資理財、法律等專業建議；健康章節只能談養生作息方向並建議如有不適應諮詢專業醫師；財運相關只談紫微斗數格局分析，不得建議具體投資標的或操作。
6. 只回傳純 JSON，不要任何 markdown 圍欄（不要 \`\`\`）、不要前後說明文字，JSON 結構必須完全符合以下欄位（月份陣列固定12筆）：

${RESPONSE_SCHEMA}

【不可違反的硬性規則】
A. 流月宮位描述：每月內容凡提及流月落宮，必須直接引用上方「十二流月命宮對照表」的宮名，明確寫成「流月入OO宮」或同等明確表述；嚴禁使用「一帶」「接近」「附近」「左右」等模糊字眼帶過宮位歸屬。
B. 星曜位置描述：全文任何提到某顆星曜所在宮位的句子，都只能依照上方「星曜–宮位對照表」「流年資料」流年四化括號內標註、或「十二流月命宮對照表」流月四化括號內標註的宮位陳述，不可依命理知識或本命特性自行推論、杜撰任何表中未列出的星曜位置；同一顆星曜在全文中的宮位描述必須前後一致，不得矛盾。
C. 文字規範：全文必須使用繁體中文（正體字），嚴禁出現任何簡體字。
D. 化曜聚合描述：無論是流年四化或流月四化，每顆化曜實際所在宮位都已在對應括號內標明，只有當兩顆以上化曜標註的宮位確實相同、或化曜宮位與流年命宮／流月命宮相同時，才可以用「齊聚」「交會」「同入」「回落」等聚合語句描述該宮；若化曜分散在不同宮位，只能逐一單獨陳述，例如「今年OO化祿（星在OO宮）遙應」「當月OO化祿（星在OO宮）遙應」，或分開敘述各宮各自受到的四化影響，嚴禁虛構化曜聚集在同一宮位。
E. 月份用語：全文提及流月一律使用「農曆X月」，禁止使用「第X月」「本月第X月」等表述方式。
F. 年份表述：凡提及西元年份加干支紀年時，一律使用「${yearly.year}${yearly.ganzhi}年」這種緊接寫法（例如本報告即為「${yearly.year}${yearly.ganzhi}年」），禁止寫成「${yearly.year}年${yearly.ganzhi}年」這種重複「年」字的寫法。`;
}

// 常見簡體字（且與繁體字形不同）集合，用於攔截模型意外輸出簡體字。
// 不含「台」等兩岸共用字形，避免誤判；命盤星曜／宮位／干支用字皆已核對過不在此表中。
const SIMPLIFIED_CHARS = new Set([
  '农', '历', '后', '发', '风', '这', '国', '学', '会', '说', '语', '义', '应', '关', '观',
  '现', '实', '达', '华', '时', '间', '门', '问', '无', '与', '为', '长', '万', '点', '号',
  '车', '东', '图', '书', '电', '动', '儿', '习', '传', '优', '众', '从', '价', '处', '务',
  '导', '将', '归', '当', '录', '总', '断', '准', '选', '择', '换', '简', '单', '难', '题',
  '进', '过', '还', '连', '让', '给', '边', '视', '觉', '听', '产', '业', '资', '经', '济',
  '营', '销', '费', '账', '负', '责', '员', '师', '压', '张', '轻', '较', '构', '织', '统',
  '细', '级', '纯', '纸', '线', '继', '绝', '综', '维', '两', '严', '专', '丰', '临', '举',
  '乐', '亲', '仅', '们', '伟', '伤', '仪', '亿', '买', '乱', '争', '亚', '云', '飞',
  '写', '认', '识', '苏', '医', '药', '疗', '证', '检', '验', '错', '误',
]);

export function findSimplifiedChars(text) {
  const found = new Set();
  for (const ch of text) {
    if (SIMPLIFIED_CHARS.has(ch)) found.add(ch);
  }
  return [...found];
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

function validateContent(content) {
  const required = ['summary', 'yearOverview', 'months', 'career', 'love', 'health', 'actions'];
  for (const key of required) {
    if (!(key in content)) throw new Error(`API 回傳缺少欄位：${key}`);
  }
  if (!Array.isArray(content.months) || content.months.length !== 12) {
    throw new Error(`months 應為12筆陣列，實際：${Array.isArray(content.months) ? content.months.length : typeof content.months}`);
  }
  for (const m of content.months) {
    for (const key of ['month', 'weather', 'doThings', 'avoidThings']) {
      if (!(key in m)) throw new Error(`月份資料缺少欄位：${key}（month=${m.month}）`);
    }
  }
  if (!Array.isArray(content.actions) || content.actions.length !== 5) {
    throw new Error(`actions 應恰為5條，實際：${Array.isArray(content.actions) ? content.actions.length : typeof content.actions}`);
  }
  return content;
}

export async function generateContent(chart, { apiKey, model }) {
  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(chart);

  const message = await client.messages.create({
    model,
    max_tokens: 8000,
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let content;
  try {
    content = JSON.parse(stripCodeFence(rawText));
  } catch (err) {
    throw new Error(`API 回傳非合法 JSON：${err.message}`);
  }
  validateContent(content);

  const badChars = findSimplifiedChars(JSON.stringify(content));
  if (badChars.length > 0) {
    throw new Error(`偵測到簡體字，禁止產出報告：${badChars.join('、')}`);
  }

  return {
    content,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}
