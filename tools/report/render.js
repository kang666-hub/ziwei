import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function monthCardHtml(m) {
  return `
    <div class="month-card">
      <div class="month-num">農曆 ${escapeHtml(m.month)} 月</div>
      <div class="row"><span class="tag">氣象</span><span class="val">${escapeHtml(m.weather)}</span></div>
      <div class="row"><span class="tag">該做</span><span class="val">${escapeHtml(m.doThings)}</span></div>
      <div class="row"><span class="tag">該避</span><span class="val">${escapeHtml(m.avoidThings)}</span></div>
    </div>`;
}

function actionItemHtml(action) {
  return `<li>${escapeHtml(action)}</li>`;
}

function fillTemplate(template, chart, content) {
  const { center, yearly } = chart;
  const natalMutagen = chart.palaces
    .flatMap((p) => [...p.majors, ...p.minors].filter((s) => s.hua).map((s) => `${s.name}${s.hua}`))
    .join('、');
  const yearlyMutagen = yearly.mutagen.map((m) => `${m.star}${m.hua}`).join('、');

  const replacements = {
    YEAR: String(yearly.year),
    YEARLY_GANZHI: yearly.ganzhi,
    CLIENT_GENDER: center.genderLabel,
    CLIENT_BIRTH_SOLAR: center.solarDisplay,
    CLIENT_BIRTH_LUNAR: center.lunarDisplay,
    CLIENT_BUREAU: center.bureau,
    CLIENT_MINGZHU: center.mingZhu,
    CLIENT_SHENZHU: center.shenZhu,
    CLIENT_MINGGONG: center.mingGong.ganzhi,
    CLIENT_SHENGONG: `${center.shenGong.name}［${center.shenGong.ganzhi}］`,
    NATAL_MUTAGEN: natalMutagen,
    YEARLY_MINGGONG: `落${yearly.mingGong.natalPalaceName}宮（${yearly.mingGong.branch}）`,
    YEARLY_MUTAGEN: yearlyMutagen,
    GENERATED_DATE: new Date().toISOString().slice(0, 10),
    SUMMARY: content.summary,
    YEAR_OVERVIEW: content.yearOverview,
    CAREER: content.career,
    LOVE: content.love,
    HEALTH: content.health,
    MONTHS_HTML: content.months.map(monthCardHtml).join('\n'),
    ACTIONS_HTML: content.actions.map(actionItemHtml).join('\n'),
  };

  let html = template;
  for (const [key, value] of Object.entries(replacements)) {
    const escaped = ['MONTHS_HTML', 'ACTIONS_HTML'].includes(key) ? value : escapeHtml(value);
    html = html.replaceAll(`{{${key}}}`, escaped);
  }
  return html;
}

export async function renderPdf({ chart, content, outputPath }) {
  const templatePath = path.join(__dirname, 'template.html');
  const template = await readFile(templatePath, 'utf-8');
  const html = fillTemplate(template, chart, content);

  await mkdir(path.dirname(outputPath), { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
    });
  } finally {
    await browser.close();
  }

  return outputPath;
}
