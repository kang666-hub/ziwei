// adapter.js —— 唯一的轉換層：iztro astrolabe 輸出 → UI 凍結時的 JSON 契約。
// 所有欄位對應寫在這一個檔案，其餘程式碼一律只讀契約，不直接碰 iztro。
import { astro } from 'iztro';
import { lunar2solar, solar2lunar } from 'lunar-lite';
import { HOURS } from './constants.js';

// iztro zh-TW 的宮位命名跟原型凍結資料的用字有一處不同（僕役 vs 交友），
// 兩者是同一個宮位的不同慣用叫法，這裡只是換標籤，不影響排盤邏輯。
const PALACE_NAME_MAP = { 僕役: '交友' };

const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);

const MUTAGEN_ORDER = ['祿', '權', '科', '忌'];

function mapPalaceName(name) {
  return PALACE_NAME_MAP[name] || name;
}

function mapStar(s) {
  return {
    name: s.name,
    hua: s.mutagen || undefined,
    sha: s.type === 'tough' || undefined,
  };
}

function buildPalaces(astrolabe) {
  return astrolabe.palaces.map((p) => ({
    name: mapPalaceName(p.name),
    branch: p.earthlyBranch,
    ganzhi: p.heavenlyStem + p.earthlyBranch,
    daxian: `${p.decadal.range[0]}-${p.decadal.range[1]}`,
    majors: p.majorStars.map(mapStar),
    minors: p.minorStars.map(mapStar),
    shen: p.isBodyPalace || undefined,
  }));
}

function buildDecadals(astrolabe) {
  return astrolabe.palaces.map((p, index) => ({
    index,
    range: p.decadal.range,
    label: `${p.decadal.range[0]}-${p.decadal.range[1]}歲`,
    heavenlyStem: p.decadal.heavenlyStem,
    earthlyBranch: p.decadal.earthlyBranch,
  }));
}

function mutagenMap(mutagenArr) {
  const map = {};
  (mutagenArr || []).forEach((starName, i) => {
    if (starName) map[starName] = MUTAGEN_ORDER[i];
  });
  return map;
}

function buildPillars(astrolabe) {
  const [y, m, d, h] = astrolabe.chineseDate.split(' ');
  return [
    { label: '年柱', gz: y },
    { label: '月柱', gz: m },
    { label: '日柱', gz: d },
    { label: '時柱', gz: h },
  ];
}

function yinYangGender(astrolabe) {
  const yearStem = astrolabe.rawDates.chineseDate.yearly[0];
  const yy = YANG_STEMS.has(yearStem) ? '陽' : '陰';
  return yy + astrolabe.gender;
}

function hourMetaByBranchToken(v) {
  return HOURS.find((h) => h.v === v);
}

/**
 * 依表單輸入排出本命盤，回傳 { chart, astrolabe }。
 * astrolabe 保留供 layer（大限/流年/流月）計算時取用 horoscope()。
 */
export function buildNatalChart(form) {
  const hourMeta = hourMetaByBranchToken(form.hour);
  const timeIndex = hourMeta.timeIndex;

  let astrolabe;
  if (form.cal === '國曆') {
    astrolabe = astro.bySolar(`${form.y}-${form.m}-${form.d}`, timeIndex, form.gender, true, 'zh-TW');
  } else {
    astrolabe = astro.byLunar(`${form.y}-${form.m}-${form.d}`, timeIndex, form.gender, form.isLeapMonth || false, true, 'zh-TW');
  }

  const chart = {
    center: {
      name: '本命盤主',
      gender: yinYangGender(astrolabe),
      birth: {
        cal: form.cal,
        y: form.y, m: form.m, d: form.d,
        solar: astrolabe.solarDate.replace(/-/g, '/') + '　' + astrolabe.timeRange.split('~')[0],
        lunar: astrolabe.lunarDate + ' ' + astrolabe.time,
        hour: form.hour,
        hourLabel: hourMeta.label,
        sex: form.gender,
      },
      pillars: buildPillars(astrolabe),
      bureau: astrolabe.fiveElementsClass,
      mingZhu: astrolabe.soul,
      shenZhu: astrolabe.body,
    },
    palaces: buildPalaces(astrolabe),
    layers: {
      大限: null,
      流年: null,
      流月: null,
    },
    decadals: buildDecadals(astrolabe),
  };

  return { chart, astrolabe };
}

const LAYER_META = {
  大限: { tagPrefix: '大限命', color: '#8A6A2F', legendPrefix: '疊加：大限四化（金銅標）＋大限命宮（金框）' },
  流年: { tagPrefix: '流年命', color: '#3E4E7A', legendPrefix: '疊加：流年四化（靛藍標）＋流年命宮（金框）' },
  流月: { tagPrefix: '流月命', color: '#44685A', legendPrefix: '疊加：流月四化（黛綠標）＋流月命宮（金框）' },
};

function buildLayer(kind, astrolabe, chart, item) {
  const meta = LAYER_META[kind];
  return {
    tag: meta.tagPrefix,
    ming: chart.palaces[item.index].branch,
    color: meta.color,
    legend: meta.legendPrefix,
    sihua: mutagenMap(item.mutagen),
  };
}

/** 取得指定大限（decadalIndex 對應 chart.decadals 的索引）的疊加層資料 */
export function computeDecadalLayer(astrolabe, chart, decadalIndex) {
  const d = chart.decadals[decadalIndex];
  const birthYear = Number(astrolabe.solarDate.split('-')[0]);
  const sampleDate = `${birthYear + d.range[0]}-06-01`;
  const h = astrolabe.horoscope(sampleDate);
  return buildLayer('大限', astrolabe, chart, h.decadal);
}

/** 取得指定西元流年的疊加層資料 */
export function computeYearlyLayer(astrolabe, chart, year) {
  const h = astrolabe.horoscope(`${year}-06-01`);
  return buildLayer('流年', astrolabe, chart, h.yearly);
}

/** 取得指定西元流年 + 農曆月份(1~12) 的流月疊加層資料 */
export function computeMonthlyLayer(astrolabe, chart, year, lunarMonth) {
  const solar = lunar2solar(`${year}-${lunarMonth}-15`);
  const dateStr = `${solar.solarYear}-${solar.solarMonth}-${solar.solarDay}`;
  const h = astrolabe.horoscope(dateStr);
  return buildLayer('流月', astrolabe, chart, h.monthly);
}

/** 取得「目前年齡」所在大限在 chart.decadals 裡的索引，供預設選取 */
export function currentDecadalIndex(astrolabe) {
  const h = astrolabe.horoscope();
  return h.decadal.index;
}

/** 今天所在的農曆月份，供流月籤預設選取 */
export function currentLunarMonth() {
  return solar2lunar(new Date()).lunarMonth;
}
