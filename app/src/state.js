// state.js —— 逐條轉譯自原型 Component 的 state + renderVals()，
// 差異只有：DEMO_CHART 換成真正排盤結果（adapter.js），並新增大限/流年/流月的
// 選擇邏輯（原型這三個籤原本只是寫死的單一疊加層，沒有可選介面）。
import { BRANCHES, POS44, POS26, THEMES, HOURS } from './constants.js';
import interpretations from './data/interpretations.json';
import {
  buildNatalChart,
  computeDecadalLayer,
  computeYearlyLayer,
  computeMonthlyLayer,
  currentDecadalIndex,
  currentLunarMonth,
} from './adapter.js';
import { fetchAiInterpretation, parseAiSections } from './ai.js';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_LUNAR_MONTH = currentLunarMonth();

function initialState() {
  return {
    view: 'input',
    tab: '本命',
    sel: null,
    shareOpen: false,
    darkOverride: null,
    isMobile: typeof window !== 'undefined' && window.innerWidth < 820,
    form: {
      cal: '國曆', y: '1990', m: '10', d: '26', hour: '未', gender: '男',
    },
    chart: null,
    astrolabe: null,
    decadalIndex: null,
    yearlyYear: CURRENT_YEAR,
    monthlyMonth: CURRENT_LUNAR_MONTH,
    aiPanelOpen: false,
    aiLoading: false,
    aiText: null,
    aiError: null,
    aiCache: {},
  };
}

export function createStore(onChange) {
  const store = {
    state: initialState(),
    setState(patch) {
      const next = typeof patch === 'function' ? patch(store.state) : patch;
      store.state = { ...store.state, ...next };
      onChange(computeVals(store));
    },
  };
  window.addEventListener('resize', () => {
    store.setState({ isMobile: window.innerWidth < 820 });
  });
  onChange(computeVals(store));
  return store;
}

function selectEl(doc, options, cur, onPick, styleCss) {
  const el = doc.createElement('select');
  el.style.cssText = styleCss;
  options.forEach((o) => {
    const opt = doc.createElement('option');
    opt.value = o.v;
    opt.textContent = o.label;
    el.appendChild(opt);
  });
  el.value = cur;
  el.onchange = (e) => onPick(e.target.value);
  return el;
}

function mapStarFactory(layer) {
  return (s) => ({
    name: s.name,
    birthHua: s.hua || '',
    layerHua: (layer && layer.sihua[s.name]) || '',
    layerBg: layer ? layer.color : '',
  });
}

export function computeVals(store) {
  const s = store.state;
  const dark = s.darkOverride ?? false;
  const T = dark ? THEMES.dark : THEMES.light;
  const view = s.view;

  const vals = {
    T,
    darkLabel: dark ? '☀ 回到晝色' : '☾ 夜觀星象',
    toggleDark: () => store.setState({ darkOverride: !dark }),
    showInput: view === 'input',
    showChart: view === 'chart',
  };

  // ── 輸入卡 ──
  const setForm = (k, v) => store.setState((st) => ({ form: { ...st.form, [k]: v } }));
  vals.calBtns = ['國曆', '農曆'].map((label) => ({
    label,
    bg: s.form.cal === label ? T.tabOnBg : 'transparent',
    color: s.form.cal === label ? T.tabOnText : T.mid,
    onClick: () => setForm('cal', label),
  }));
  vals.genderBtns = ['男', '女'].map((label) => ({
    label,
    bg: s.form.gender === label ? T.tabOnBg : 'transparent',
    color: s.form.gender === label ? T.tabOnText : T.mid,
    onClick: () => setForm('gender', label),
  }));
  const selStyle = `padding:9px 8px; border:1px solid ${T.line}; background:${T.input}; color:${T.ink}; font-size:14px; border-radius:2px; width:100%;`;
  vals.makeYSelect = (doc) => selectEl(doc, Array.from({ length: 86 }, (_, i) => { const v = String(1940 + i); return { v, label: v }; }), s.form.y, (v) => setForm('y', v), selStyle);
  vals.makeMSelect = (doc) => selectEl(doc, Array.from({ length: 12 }, (_, i) => { const v = String(i + 1); return { v, label: v }; }), s.form.m, (v) => setForm('m', v), selStyle);
  vals.makeDSelect = (doc) => selectEl(doc, Array.from({ length: 31 }, (_, i) => { const v = String(i + 1); return { v, label: v }; }), s.form.d, (v) => setForm('d', v), selStyle);
  vals.makeHSelect = (doc) => selectEl(doc, HOURS.map((h) => ({ v: h.v, label: h.label })), s.form.hour, (v) => setForm('hour', v), selStyle);

  vals.doChart = () => {
    const { chart, astrolabe } = buildNatalChart(store.state.form);
    const decadalIndex = currentDecadalIndex(astrolabe);
    store.setState({
      view: 'chart', sel: null, chart, astrolabe, decadalIndex,
      yearlyYear: CURRENT_YEAR, monthlyMonth: CURRENT_LUNAR_MONTH,
    });
  };
  vals.backToInput = () => store.setState({ view: 'input', sel: null });

  if (view !== 'chart' || !s.chart) return vals;

  const { chart, astrolabe } = s;
  const { tab, sel, isMobile, shareOpen } = s;

  let layer = null;
  if (tab === '大限') layer = computeDecadalLayer(astrolabe, chart, s.decadalIndex);
  else if (tab === '流年') layer = computeYearlyLayer(astrolabe, chart, s.yearlyYear);
  else if (tab === '流月') layer = computeMonthlyLayer(astrolabe, chart, s.yearlyYear, s.monthlyMonth);

  const layoutPref = '2×6 重排';
  const narrow = isMobile && layoutPref === '2×6 重排';
  const POS = narrow ? POS26 : POS44;

  // ── 三方四正 ──
  const selPalace = sel != null ? chart.palaces[sel] : null;
  let relatedBranches = [];
  if (selPalace) {
    const i = BRANCHES.indexOf(selPalace.branch);
    relatedBranches = [BRANCHES[(i + 6) % 12], BRANCHES[(i + 4) % 12], BRANCHES[(i + 8) % 12]];
  }

  const mapStar = mapStarFactory(layer);

  const palaces = chart.palaces.map((p, idx) => {
    const [col, row] = POS[p.branch];
    const isSel = sel === idx;
    const isRel = relatedBranches.includes(p.branch);
    return {
      col, row,
      name: p.name, ganzhi: p.ganzhi, daxian: p.daxian, shen: !!p.shen,
      majors: p.majors.map(mapStar),
      minors: p.minors.map((st) => ({ ...mapStar(st), color: st.sha ? T.shaColor : T.mid })),
      bg: isSel ? T.selBg : isRel ? T.relBg : T.card,
      glow: isSel ? `inset 0 0 0 2px ${T.cinnabar}` : isRel ? `inset 0 0 0 1.5px ${T.line}` : 'none',
      nameColor: p.name === '命宮' ? T.cinnabar : T.soft,
      nameLine: isSel ? T.cinnabar : 'transparent',
      layerMark: !!(layer && layer.ming === p.branch),
      layerTag: layer ? layer.tag : '',
      onClick: () => store.setState({ sel: isSel ? null : idx }),
    };
  });

  const cellCenter = (br) => { const [c, r] = POS[br]; return [(c - 0.5) * 100, (r - 0.5) * 100]; };
  let lines = []; let nodes = [];
  if (selPalace) {
    const [sx, sy] = cellCenter(selPalace.branch);
    lines = relatedBranches.map((br, k) => {
      const [x2, y2] = cellCenter(br);
      return { x1: sx, y1: sy, x2, y2, dash: k === 0 ? 'none' : '7 5' };
    });
    nodes = [{ x: sx, y: sy, fill: T.cinnabar }].concat(
      relatedBranches.map((br) => { const [x, y] = cellCenter(br); return { x, y, fill: T.lineStrong }; }),
    );
  }

  const findByBranch = (br) => chart.palaces.find((p) => p.branch === br);
  let panel = {};
  if (selPalace) {
    const [opp, h1, h2] = relatedBranches.map(findByBranch);
    panel = {
      panelName: selPalace.name,
      panelGanzhi: selPalace.ganzhi + '宮',
      panelDaxian: selPalace.daxian,
      panelStars: selPalace.majors.map((st) => ({
        ...mapStar(st),
        text: (interpretations[st.name] && interpretations[st.name][selPalace.name]) || '此星示意文案由解盤引擎輸出。',
      })),
      panelMinors: selPalace.minors.map((st) => st.name + (st.hua ? '（化' + st.hua + '）' : '')).join('、') || '無',
      panelSanfang: `對宮 ${opp.name}（${opp.branch}）・三合 ${h1.name}（${h1.branch}）、${h2.name}（${h2.branch}）`,
    };
  }

  const mingPalace = chart.palaces.find((p) => p.name === '命宮');
  const shareCells = chart.palaces.map((p) => {
    const [col, row] = POS44[p.branch];
    const isMing = p.name === '命宮';
    return {
      col, row, name: p.name,
      star: p.majors.map((st) => st.name).join(' '),
      bg: isMing ? T.selBg : T.card,
      starColor: isMing ? T.cinnabar : T.ink,
    };
  });

  const birth = chart.center.birth;

  // ── 新增：AI 綜合解盤（呼叫 Cloudflare Worker 代理，同一張盤+同一運限選擇快取）──
  const aiCacheKey = `${tab}|${s.decadalIndex}|${s.yearlyYear}|${s.monthlyMonth}`;
  const openAiPanel = () => {
    const cached = s.aiCache[aiCacheKey];
    if (cached) {
      store.setState({ aiPanelOpen: true, aiLoading: false, aiError: null, aiText: cached });
      return;
    }
    store.setState({ aiPanelOpen: true, aiLoading: true, aiError: null, aiText: null });
    fetchAiInterpretation(chart, layer).then((text) => {
      store.setState((st) => ({ aiLoading: false, aiText: text, aiCache: { ...st.aiCache, [aiCacheKey]: text } }));
    }).catch((err) => {
      store.setState({ aiLoading: false, aiError: { message: err.message || 'AI 解盤服務暫時無法使用，請稍後再試' } });
    });
  };
  const closeAiPanel = () => store.setState({ aiPanelOpen: false });
  const aiSections = s.aiText ? parseAiSections(s.aiText) : [];

  Object.assign(vals, {
    center: chart.center,
    pillars: chart.center.pillars,
    summary: `${birth.cal} ${birth.y}/${birth.m}/${birth.d}・${birth.hourLabel}・${birth.sex}`,

    tabs: ['本命', '大限', '流年', '流月'].map((label) => ({
      label,
      bg: tab === label ? T.tabOnBg : 'transparent',
      color: tab === label ? T.tabOnText : T.soft,
      border: tab === label ? T.tabOnBg : T.line,
      onClick: () => store.setState({ tab: label }),
    })),
    legend: layer ? layer.legend : '',

    // ── 新增：大限 12 選 1（籤啟用時出現選擇列，預設帶入目前年齡所在限）──
    decadalPicker: tab === '大限' ? chart.decadals.map((d) => ({
      label: d.label,
      active: d.index === s.decadalIndex,
      bg: d.index === s.decadalIndex ? T.tabOnBg : 'transparent',
      color: d.index === s.decadalIndex ? T.tabOnText : T.soft,
      border: d.index === s.decadalIndex ? T.tabOnBg : T.line,
      onClick: () => store.setState({ decadalIndex: d.index }),
    })) : null,

    // ── 新增：流年前後年切換 ──
    yearlyStepper: tab === '流年' ? {
      year: s.yearlyYear,
      prev: () => store.setState({ yearlyYear: s.yearlyYear - 1 }),
      next: () => store.setState({ yearlyYear: s.yearlyYear + 1 }),
    } : null,

    // ── 新增：流月 12 個月可選，跟隨所選流年 ──
    monthlyPicker: tab === '流月' ? Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => ({
      label: `${mo}月`,
      active: mo === s.monthlyMonth,
      bg: mo === s.monthlyMonth ? T.tabOnBg : 'transparent',
      color: mo === s.monthlyMonth ? T.tabOnText : T.soft,
      border: mo === s.monthlyMonth ? T.tabOnBg : T.line,
      onClick: () => store.setState({ monthlyMonth: mo }),
    })) : null,

    palaces, lines, nodes,
    narrow,
    showCenterGrid: !narrow,
    vb: narrow ? '0 0 200 600' : '0 0 400 400',
    gridCols: narrow ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
    gridRows: narrow ? 'repeat(6,minmax(118px,auto))' : 'repeat(4,1fr)',
    gridAspect: narrow ? 'auto' : '1/1',
    chartW: narrow ? '100%' : isMobile ? '640px' : 'min(100%, 720px)',
    chartWrapStyle: (isMobile && !narrow)
      ? 'overflow-x:auto; margin:0 -16px; padding:0 16px 8px; flex:1 1 auto; -webkit-overflow-scrolling:touch;'
      : 'flex:1 1 auto; min-width:0;',

    panelOpen: sel != null,
    ...panel,
    closePanel: () => store.setState({ sel: null }),
    panelStyle: isMobile
      ? `position:fixed; left:0; right:0; bottom:0; max-height:58vh; overflow-y:auto; background:${T.card}; border-top:2px solid ${T.cinnabar}; box-shadow:0 -10px 34px rgba(0,0,0,.3); padding:18px 20px 24px; z-index:60; animation:sheetUp .3s ease both;`
      : `flex:0 0 320px; width:320px; background:${T.card}; border:1px solid ${T.line}; box-shadow:${T.chartShadow}; padding:20px; align-self:flex-start; animation:slideRight .3s ease both;`,

    shareOpen,
    shareMing: mingPalace.majors.map((st) => st.name).join('　'),
    shareCells,
    openShare: () => store.setState({ shareOpen: true }),
    closeShare: () => store.setState({ shareOpen: false }),
    stopClick: (e) => e.stopPropagation(),

    openAiPanel,
    closeAiPanel,
    aiPanelOpen: s.aiPanelOpen,
    aiLoading: s.aiLoading,
    aiError: s.aiError,
    aiSections,
  });

  return vals;
}
