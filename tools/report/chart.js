import { astro } from 'iztro';
import { lunar2solar } from 'lunar-lite';

// 與網站 app/src/constants.js 的 HOURS 表一致（早子/晚子分開兩個時辰）。
const HOURS = [
  { v: '早子', timeIndex: 0, label: '早子時 00:00–01:00' },
  { v: '丑', timeIndex: 1, label: '丑時 01:00–03:00' },
  { v: '寅', timeIndex: 2, label: '寅時 03:00–05:00' },
  { v: '卯', timeIndex: 3, label: '卯時 05:00–07:00' },
  { v: '辰', timeIndex: 4, label: '辰時 07:00–09:00' },
  { v: '巳', timeIndex: 5, label: '巳時 09:00–11:00' },
  { v: '午', timeIndex: 6, label: '午時 11:00–13:00' },
  { v: '未', timeIndex: 7, label: '未時 13:00–15:00' },
  { v: '申', timeIndex: 8, label: '申時 15:00–17:00' },
  { v: '酉', timeIndex: 9, label: '酉時 17:00–19:00' },
  { v: '戌', timeIndex: 10, label: '戌時 19:00–21:00' },
  { v: '亥', timeIndex: 11, label: '亥時 21:00–23:00' },
  { v: '晚子', timeIndex: 12, label: '晚子時 23:00–00:00' },
];

const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);
const MUTAGEN_ORDER = ['祿', '權', '科', '忌'];
const GENDER_ZH = { male: '男', female: '女' };

function resolveHour(timeStr) {
  const [hh] = timeStr.split(':').map(Number);
  if (hh === 23) return HOURS[12]; // 晚子時
  if (hh === 0) return HOURS[0]; // 早子時
  return HOURS[Math.floor((hh - 1) / 2) + 1];
}

function mapStar(s) {
  return {
    name: s.name,
    hua: s.mutagen || null,
    sha: s.type === 'tough',
  };
}

function buildPalaces(astrolabe) {
  return astrolabe.palaces.map((p) => ({
    index: p.index,
    name: p.name,
    ganzhi: p.heavenlyStem + p.earthlyBranch,
    branch: p.earthlyBranch,
    isBodyPalace: p.isBodyPalace,
    daxian: `${p.decadal.range[0]}-${p.decadal.range[1]}歲`,
    majors: p.majorStars.map(mapStar),
    minors: p.minorStars.map(mapStar),
  }));
}

/** 星曜名稱 → 本命宮位名稱的查表，供化曜補宮位用（避免模型自行猜測化曜聚合）。 */
function buildStarPalaceMap(palaces) {
  const map = new Map();
  for (const p of palaces) {
    for (const s of [...p.majors, ...p.minors]) {
      map.set(s.name, p.name);
    }
  }
  return map;
}

/** 與 mutagenList 相同，但每個化曜額外標註該星實際所在的本命宮位。 */
function mutagenListWithPalace(mutagenArr, starPalaceMap) {
  return (mutagenArr || [])
    .map((starName, i) =>
      starName
        ? { star: starName, hua: MUTAGEN_ORDER[i], palace: starPalaceMap.get(starName) || null }
        : null,
    )
    .filter(Boolean);
}

function yinYangGender(astrolabe) {
  const yearStem = astrolabe.rawDates.chineseDate.yearly[0];
  return (YANG_STEMS.has(yearStem) ? '陽' : '陰') + astrolabe.gender;
}

/** 攤平十二宮的星曜清單，做為 prompt 唯一可信的星曜–宮位對照表，防止模型自行推論星曜位置。 */
function buildStarIndex(palaces) {
  return palaces.flatMap((p) =>
    [...p.majors, ...p.minors].map((s) => ({
      star: s.name,
      palace: p.name,
      branch: p.branch,
      hua: s.hua,
    })),
  );
}

/**
 * 用 lunar-lite 把西元流年的農曆 1~12 月各取月中一天，逐月呼叫 horoscope() 取得流月命宮落宮，
 * 避免模型憑空猜測流月宮位；每月四化額外標註化曜實際所在的本命宮位，
 * 避免模型誤以為當月四化星都聚在流月命宮而虛構「齊聚／交會」。
 */
function buildMonthlyLayers(astrolabe, palaces, year, starPalaceMap) {
  const months = [];
  for (let lunarMonth = 1; lunarMonth <= 12; lunarMonth++) {
    const solar = lunar2solar(`${year}-${lunarMonth}-15`);
    const dateStr = `${solar.solarYear}-${solar.solarMonth}-${solar.solarDay}`;
    const h = astrolabe.horoscope(dateStr);
    const monthlyIndex = h.monthly.index;
    const monthlyPalace = palaces[monthlyIndex];
    months.push({
      month: lunarMonth,
      index: monthlyIndex,
      natalPalaceName: monthlyPalace.name,
      branch: monthlyPalace.branch,
      ganzhi: h.monthly.heavenlyStem + h.monthly.earthlyBranch,
      mutagen: mutagenListWithPalace(h.monthly.mutagen, starPalaceMap),
    });
  }
  return months;
}

/**
 * 用網站同款設定排本命盤（bySolar + fixLeap=true + zh-TW），
 * 並附上指定西元流年的四化與流年宮位資料。
 */
export function buildChart({ date, time, gender, year }) {
  const hourMeta = resolveHour(time);
  const genderZh = GENDER_ZH[gender];
  if (!genderZh) throw new Error(`不支援的性別參數：${gender}（僅接受 male / female）`);

  const astrolabe = astro.bySolar(date, hourMeta.timeIndex, genderZh, true, 'zh-TW');
  const palaces = buildPalaces(astrolabe);
  const mingPalace = palaces.find((p) => p.name === '命宮');
  const shenPalace = palaces.find((p) => p.isBodyPalace);

  const starPalaceMap = buildStarPalaceMap(palaces);
  const h = astrolabe.horoscope(`${year}-06-01`);
  const yearlyIndex = h.yearly.index;
  const yearlyPalace = palaces[yearlyIndex];
  const monthly = buildMonthlyLayers(astrolabe, palaces, year, starPalaceMap);
  const starIndex = buildStarIndex(palaces);

  return {
    input: { date, time, hourLabel: hourMeta.label, gender, genderZh, year },
    center: {
      genderLabel: yinYangGender(astrolabe),
      solarDisplay: astrolabe.solarDate.replace(/-/g, '/') + ' ' + time,
      lunarDisplay: astrolabe.lunarDate + ' ' + astrolabe.time,
      sign: astrolabe.sign,
      zodiac: astrolabe.zodiac,
      bureau: astrolabe.fiveElementsClass,
      mingZhu: astrolabe.soul,
      shenZhu: astrolabe.body,
      mingGong: { branch: mingPalace.branch, ganzhi: mingPalace.ganzhi },
      shenGong: { name: shenPalace.name, branch: shenPalace.branch, ganzhi: shenPalace.ganzhi },
    },
    palaces,
    starIndex,
    yearly: {
      year,
      heavenlyStem: h.yearly.heavenlyStem,
      earthlyBranch: h.yearly.earthlyBranch,
      ganzhi: h.yearly.heavenlyStem + h.yearly.earthlyBranch,
      mingGong: { index: yearlyIndex, natalPalaceName: yearlyPalace.name, branch: yearlyPalace.branch },
      mutagen: mutagenListWithPalace(h.yearly.mutagen, starPalaceMap),
      palaceNames: h.yearly.palaceNames,
    },
    monthly,
  };
}
