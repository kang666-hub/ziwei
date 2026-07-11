// sharecard.js —— 分享圖卡的全部邏輯：隱藏卡框、生成、隱私切換、分享／下載出口。
// 用 html-to-image 截現有命盤 DOM，不用 Canvas 重畫，維持 render.js 是唯一的畫面真相來源。
import { toPng } from 'html-to-image';
import './sharecard.css';

const CARD_W = 540;
const CARD_H = 720;
const SITE_URL = 'kang666-hub.github.io/ziwei';

let showFullBirth = false;

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'style') el.style.cssText = v;
    else if (k === 'className') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el[k.toLowerCase()] = v;
    else el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

// html-to-image 內建的 getFontEmbedCSS() 會讀 index.html 那個 Google Fonts <link>
// 涵蓋的「全 CJK 字集」樣式表，兩個字族六種字重全內嵌下來高達數十 MB、要好幾秒——
// 不但拖慢生成，還會把 click 事件到 navigator.share() 之間的延遲拉到超過瀏覽器
// 判定「使用者手勢」的有效期限（見 shareOrDownload 的 NotAllowedError）。
// 改用 Google Fonts CSS2 API 的 text= 參數，只拿卡片實際會顯示的字元對應的字型檔，
// 檔案小很多、內嵌也快很多；再手動 fetch 每個字型檔轉 base64（toPng 匯出的 SVG
// 若保留遠端 url() 會讓 canvas 被標記為 tainted，toDataURL 會丟 SecurityError，
// 所以一定要內嵌成 data: URI，不能只是換成 crossorigin 連結）。
async function buildScopedFontEmbedCSS(text) {
  const chars = Array.from(new Set(Array.from(text.replace(/\s/g, '')))).join('');
  if (!chars) return '';
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;600;700&family=Noto+Serif+TC:wght@600;700;900&text=${encodeURIComponent(chars)}&display=swap`;
  let cssText;
  try {
    cssText = await fetch(url).then((res) => res.text());
  } catch {
    return '';
  }
  const fontUrls = Array.from(new Set(Array.from(cssText.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g), (m) => m[1])));
  const entries = await Promise.all(fontUrls.map(async (fontUrl) => {
    try {
      const buf = await fetch(fontUrl).then((res) => res.arrayBuffer());
      let binary = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return [fontUrl, `data:font/woff2;base64,${btoa(binary)}`];
    } catch {
      return null;
    }
  }));
  let embedded = cssText;
  for (const entry of entries) {
    if (!entry) continue;
    const [fontUrl, dataUrl] = entry;
    embedded = embedded.split(fontUrl).join(dataUrl);
  }
  return embedded;
}

function lunarMonthLabel(birth) {
  const m = birth.lunar.match(/年([^年]+?)月/);
  return m ? `${m[1]}月` : birth.lunar;
}

function hourLabel(birth) {
  return (birth.hourLabel || '').split(' ')[0] || birth.hourLabel;
}

function buildBirthLine(center) {
  const birth = center.birth;
  if (showFullBirth) {
    return `${birth.cal} ${birth.solar}　${center.gender}`;
  }
  return `農曆${lunarMonthLabel(birth)}・${hourLabel(birth)}・${center.gender}`;
}

function ensureCardRoot() {
  let root = document.getElementById('share-card-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'share-card-root';
    root.style.cssText = 'position:fixed; left:-9999px; top:0; z-index:-1;';
    document.body.appendChild(root);
  }
  return root;
}

// 不能用原始 style 字串子字串比對——瀏覽器序列化 style 屬性時會重排空白
//（例如 "grid-template-columns:1fr" 存回 DOM 會變成 "grid-template-columns: 1fr"），
// 子字串比對因此完全比對不到。改用 computed style 篩選：命盤格會設 aspect-ratio，
// 且不在任何 position:fixed 的祖先內（分享卡自己的隱藏容器、彈窗預覽都是 fixed）。
function findLiveGrid() {
  const candidates = document.querySelectorAll('div[style*="grid-template-columns"]');
  for (const el of candidates) {
    if (getComputedStyle(el).aspectRatio === 'auto') continue;
    let node = el;
    let insideFixed = false;
    while (node && node !== document.body) {
      if (getComputedStyle(node).position === 'fixed') { insideFixed = true; break; }
      node = node.parentElement;
    }
    if (!insideFixed) return el;
  }
  return null;
}

function buildCard(vals) {
  const { T, center } = vals;
  const root = ensureCardRoot();
  root.innerHTML = '';

  const card = h('div', { className: 'share-card', style: `background:${T.card}; color:${T.ink};` });

  card.appendChild(h('div', { className: 'share-card__header' }, [
    h('div', { className: 'share-card__logo', style: `background:${T.cinnabar}; color:#FBF7EC;` }, '紫微'),
    h('div', { className: 'share-card__titles' }, [
      h('span', { className: 'share-card__title' }, '紫微斗數'),
      h('span', { className: 'share-card__subtitle', style: `color:${T.faint};` }, '新中式排盤・解盤'),
    ]),
  ]));

  card.appendChild(h('div', { className: 'share-card__birth', style: `color:${T.soft};` }, buildBirthLine(center)));
  card.appendChild(h('div', { className: 'share-card__divider', style: `background:linear-gradient(90deg, transparent, ${T.line}, transparent);` }));

  const chartWrap = h('div', { className: 'share-card__chart-wrap' });
  const liveGrid = findLiveGrid();
  if (liveGrid) {
    const clone = liveGrid.cloneNode(true);
    const naturalW = liveGrid.offsetWidth || CARD_W;
    const naturalH = liveGrid.offsetHeight || naturalW;
    const available = CARD_W - 60;
    const scale = Math.min(available / naturalW, (CARD_H * 0.6) / naturalH, 1);
    const inner = h('div', {
      className: 'share-card__chart-inner',
      style: `width:${naturalW}px; height:${naturalH}px; transform:scale(${scale});`,
    }, clone);
    chartWrap.appendChild(inner);
  }
  card.appendChild(chartWrap);

  card.appendChild(h('div', { className: 'share-card__divider', style: `background:linear-gradient(90deg, transparent, ${T.line}, transparent);` }));
  card.appendChild(h('div', { className: 'share-card__footer', style: `color:${T.ghost};` }, SITE_URL));

  root.appendChild(card);
  return card;
}

/** 在 container（render.js 提供的掛載點）內畫「顯示完整生辰」勾選框。 */
export function mountControls(container) {
  container.innerHTML = '';
  const checkbox = h('input', { type: 'checkbox' });
  checkbox.checked = showFullBirth;
  checkbox.onchange = (e) => { showFullBirth = e.target.checked; };
  const label = h('label', { className: 'share-card__controls' }, [
    checkbox,
    document.createTextNode('顯示完整生辰'),
  ]);
  container.appendChild(label);
}

async function toPngWithRetry(node, options) {
  // iOS Safari 首次呼叫偶發白圖的已知 workaround：呼叫兩次，取第二次結果。
  await toPng(node, options);
  return toPng(node, options);
}

async function shareOrDownload(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], 'ziwei_命盤.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '紫微斗數命盤' });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return; // 使用者自己在分享面板取消，尊重選擇不強制下載
      // 其餘失敗（例如生成太久、使用者手勢已逾時）退回下載，確保功能不會整個失敗
    }
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'ziwei_命盤.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** 分享圖卡按鈕的入口：生成 1080×1440 PNG，手機走原生分享，桌機下載。 */
export async function generateAndShare(vals, buttonEl) {
  if (!buttonEl || buttonEl.dataset.busy === '1') return;
  buttonEl.dataset.busy = '1';
  const originalText = buttonEl.textContent;
  buttonEl.disabled = true;
  buttonEl.textContent = '觀星繪製中…';

  try {
    const card = buildCard(vals);
    const fontEmbedCSS = await buildScopedFontEmbedCSS(card.textContent);
    const options = {
      width: CARD_W,
      height: CARD_H,
      pixelRatio: 2,
      backgroundColor: vals.T.card,
      fontEmbedCSS,
    };
    const dataUrl = await toPngWithRetry(card, options);
    await shareOrDownload(dataUrl);
  } catch (err) {
    console.error('分享圖卡產生失敗', err);
  } finally {
    buttonEl.textContent = originalText;
    buttonEl.disabled = false;
    delete buttonEl.dataset.busy;
  }
}
