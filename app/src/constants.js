// 逐字轉譯自原型 ziweionline.dc.html 的 Component 內部常數，數值未作任何更動。

export const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 4×4 慣例排列
export const POS44 = { 子:[3,4], 丑:[2,4], 寅:[1,4], 卯:[1,3], 辰:[1,2], 巳:[1,1], 午:[2,1], 未:[3,1], 申:[4,1], 酉:[4,2], 戌:[4,3], 亥:[4,4] };
// 2×6 手機重排：左欄由上而下 巳辰卯寅丑子（逆行），右欄 午未申酉戌亥（順行）——環狀相對位置不變
export const POS26 = { 巳:[1,1], 辰:[1,2], 卯:[1,3], 寅:[1,4], 丑:[1,5], 子:[1,6], 午:[2,1], 未:[2,2], 申:[2,3], 酉:[2,4], 戌:[2,5], 亥:[2,6] };

// 主題：墨色宣紙（晝）／夜觀星象（深靛＋金）
export const THEMES = {
  light: {
    pageBg: 'linear-gradient(180deg,#F4EFE1 0%,#F2ECDD 60%,#EFE7D4 100%)',
    card: '#FBF7EC', centerBg: '#F7F1E2', input: '#FFFDF6',
    ink: '#2B2620', soft: '#57503F', mid: '#6B6255', faint: '#8A7E6C', ghost: '#A79A85', ghost2: '#B8AD97',
    line: '#C9B48A', lineStrong: '#A5824A', gold: '#A5824A', tagText: '#FBF7EC',
    cinnabar: '#B8402F', cinnaDeep: '#8F2F21', shaColor: '#9A5348',
    selBg: '#F6E4DC', relBg: '#F5EDD8',
    tabOnBg: '#2B2620', tabOnText: '#F5F0E4',
    headerLine: 'rgba(165,130,74,.35)',
    chartShadow: '0 14px 44px rgba(43,38,32,.12)'
  },
  dark: {
    pageBg: 'linear-gradient(180deg,#1B2340 0%,#161C33 55%,#111627 100%)',
    card: '#202946', centerBg: '#26304F', input: '#1A2138',
    ink: '#ECE4CE', soft: '#CEC4A8', mid: '#AFA68B', faint: '#948C72', ghost: '#777A6F', ghost2: '#615F55',
    line: '#4E4A3C', lineStrong: '#C9A35C', gold: '#D8B36A', tagText: '#1B2340',
    cinnabar: '#D05C48', cinnaDeep: '#9E3E2D', shaColor: '#D98A7A',
    selBg: '#3E2B33', relBg: '#37324B',
    tabOnBg: '#C9A35C', tabOnText: '#1B2340',
    headerLine: 'rgba(201,163,92,.35)',
    chartShadow: '0 14px 44px rgba(0,0,0,.45)'
  }
};

export const HOURS = [
  {v:'早子',label:'早子時 00:00–01:00', timeIndex:0},
  {v:'丑',label:'丑時 01:00–03:00', timeIndex:1},
  {v:'寅',label:'寅時 03:00–05:00', timeIndex:2},
  {v:'卯',label:'卯時 05:00–07:00', timeIndex:3},
  {v:'辰',label:'辰時 07:00–09:00', timeIndex:4},
  {v:'巳',label:'巳時 09:00–11:00', timeIndex:5},
  {v:'午',label:'午時 11:00–13:00', timeIndex:6},
  {v:'未',label:'未時 13:00–15:00', timeIndex:7},
  {v:'申',label:'申時 15:00–17:00', timeIndex:8},
  {v:'酉',label:'酉時 17:00–19:00', timeIndex:9},
  {v:'戌',label:'戌時 19:00–21:00', timeIndex:10},
  {v:'亥',label:'亥時 21:00–23:00', timeIndex:11},
  {v:'晚子',label:'晚子時 23:00–00:00', timeIndex:12}
];
