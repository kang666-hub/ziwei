import 'dotenv/config';
import { buildChart } from './chart.js';
import { generateContent } from './content.js';
import { renderPdf } from './render.js';

const PRICE_PER_MTOK = { input: 3.0, output: 15.0 };

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  const required = ['date', 'time', 'gender', 'year'];
  for (const key of required) {
    if (!args[key]) throw new Error(`缺少必要參數 --${key}`);
  }
  return {
    date: args.date,
    time: args.time,
    gender: args.gender,
    year: Number(args.year),
  };
}

async function main() {
  const input = parseArgs(process.argv.slice(2));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.MODEL_ID;
  if (!apiKey) throw new Error('未設定 ANTHROPIC_API_KEY（請寫入 tools/report/.env）');
  if (!model) throw new Error('未設定 MODEL_ID（請寫入 tools/report/.env）');

  console.log('=== 排盤摘要（供人工核對）===');
  const chart = buildChart(input);
  const { center, yearly } = chart;
  console.log(`生辰：國曆 ${input.date} ${chart.input.hourLabel}　${center.genderLabel}`);
  console.log(`農曆：${center.lunarDisplay}`);
  console.log(`五行局：${center.bureau}　命主：${center.mingZhu}　身主：${center.shenZhu}`);
  console.log(`命宮：${center.mingGong.ganzhi}`);
  console.log(`身宮：${center.shenGong.name}［${center.shenGong.ganzhi}］`);
  const natalMutagen = chart.palaces
    .flatMap((p) => [...p.majors, ...p.minors].filter((s) => s.hua).map((s) => `${p.name}:${s.name}${s.hua}`))
    .join('、');
  console.log(`生年四化：${natalMutagen}`);
  console.log(`${yearly.year}年流年：${yearly.ganzhi}　流年命宮落${yearly.mingGong.natalPalaceName}宮`);
  console.log(`流年四化：${yearly.mutagen.map((m) => `${m.star}${m.hua}`).join('、')}`);

  console.log('\n=== 呼叫 Anthropic API 生成內容 ===');
  const { content, usage } = await generateContent(chart, { apiKey, model });
  const cost =
    (usage.inputTokens / 1_000_000) * PRICE_PER_MTOK.input +
    (usage.outputTokens / 1_000_000) * PRICE_PER_MTOK.output;
  console.log(`Token 用量：input=${usage.inputTokens}　output=${usage.outputTokens}`);
  console.log(`估算成本：US$${cost.toFixed(4)}`);

  console.log('\n=== 產出 PDF ===');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = new URL(`./output/ziwei_report_${yearly.year}_${timestamp}.pdf`, import.meta.url).pathname;
  await renderPdf({ chart, content, outputPath });
  console.log(`PDF 已產出：${outputPath}`);
}

main().catch((err) => {
  console.error('\n流程中止：', err.message);
  process.exit(1);
});
