// render.js —— 逐條轉譯自原型 template（{{mustache}} / <sc-if> / <sc-for>）的畫面結構，
// 用 h()/svg() 建真正的 DOM，取代原本 Claude Design 內部框架的字串模板引擎。
// 版面、間距、字級、配色全部照抄，只是換一種寫法。
import { h, svg } from './h.js';

function seg(list) {
  return list.map((b) => h('button', {
    onclick: b.onClick,
    style: `flex:1; padding:9px 0; border:none; cursor:pointer; font-size:14px; letter-spacing:4px; background:${b.bg}; color:${b.color}; transition:background .2s;`,
  }, b.label));
}

function hua(text, bg, size) {
  if (!text) return null;
  return h('span', {
    style: `min-width:${size}px; height:${size}px; padding:0 2px; border-radius:50%; background:${bg}; color:#FBF7EC; font-size:${size - 6}px; line-height:${size}px; text-align:center; font-weight:700;`,
  }, text);
}

function starRow(s, big) {
  return h('span', { style: 'display:inline-flex; align-items:flex-start; gap:3px;' }, [
    h('span', { style: big
      ? "font-family:'Noto Serif TC',serif; font-size:18px; font-weight:700; letter-spacing:1px; line-height:1.25;"
      : 'font-size:12px; letter-spacing:.5px; line-height:1.4;' }, s.name),
    hua(s.birthHua, s.T ? s.T.cinnabar : '#B8402F', big ? 16 : 14),
    hua(s.layerHua, s.layerBg, big ? 16 : 14),
  ]);
}

function inputScreen(vals) {
  const { T } = vals;
  return h('section', { style: 'flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px 64px;' }, [
    h('p', { style: `font-family:'Noto Serif TC',serif; font-size:15px; letter-spacing:6px; color:${T.faint}; margin:0 0 22px;` }, '觀星起盤・先定生時'),
    h('div', { style: `width:min(460px, 100%); background:${T.card}; border:1px solid ${T.line}; box-shadow:${T.chartShadow}; padding:30px 28px 26px; animation:riseIn .5s ease both;` }, [
      h('div', { style: `display:flex; gap:0; border:1px solid ${T.line}; border-radius:2px; overflow:hidden; margin-bottom:20px;` }, seg(vals.calBtns)),
      h('div', { style: 'display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:10px; margin-bottom:14px;' }, [
        h('label', { style: `display:flex; flex-direction:column; gap:6px; font-size:12px; letter-spacing:2px; color:${T.faint};` }, ['年', vals.makeYSelect(document)]),
        h('label', { style: `display:flex; flex-direction:column; gap:6px; font-size:12px; letter-spacing:2px; color:${T.faint};` }, ['月', vals.makeMSelect(document)]),
        h('label', { style: `display:flex; flex-direction:column; gap:6px; font-size:12px; letter-spacing:2px; color:${T.faint};` }, ['日', vals.makeDSelect(document)]),
      ]),
      h('label', { style: `display:flex; flex-direction:column; gap:6px; font-size:12px; letter-spacing:2px; color:${T.faint}; margin-bottom:16px;` }, ['時辰', vals.makeHSelect(document)]),
      h('div', { style: `display:flex; gap:0; border:1px solid ${T.line}; border-radius:2px; overflow:hidden; margin-bottom:24px;` }, seg(vals.genderBtns)),
      h('button', {
        onclick: vals.doChart,
        style: `width:100%; padding:14px 0; background:${T.cinnabar}; color:#FBF7EC; border:none; cursor:pointer; font-family:'Noto Serif TC',serif; font-size:18px; font-weight:700; letter-spacing:12px; text-indent:12px; border-radius:2px; box-shadow:0 3px 0 ${T.cinnaDeep}; transition:transform .12s;`,
      }, '排　盤'),
      h('p', { style: `margin:16px 0 0; font-size:11px; color:${T.ghost}; letter-spacing:1px; text-align:center;` }, '時辰以出生地當地時間為準・晚上 23:00 後屬翌日子時'),
    ]),
  ]);
}

function pillarRow(pillars, T, big) {
  return h('div', { style: 'display:flex; gap:6px;' }, pillars.map((pc) => h('span', {
    style: `flex:1; display:flex; flex-direction:column; align-items:center; gap:${big ? 3 : 2}px; border:1px solid ${T.line}; background:${T.card}; padding:${big ? 6 : 5}px 2px;`,
  }, [
    h('span', { style: `font-size:10px; color:${T.ghost}; letter-spacing:2px;` }, pc.label),
    h('span', { style: `font-family:'Noto Serif TC',serif; font-size:${big ? 16 : 15}px; font-weight:700; letter-spacing:2px;` }, pc.gz),
  ])));
}

function bureauRow(center, T) {
  return h('div', { style: 'display:flex; gap:14px; font-size:12px; letter-spacing:1px; flex-wrap:wrap;', style2: null }, [
    h('span', { style: `color:${T.mid};` }, ['五行局', h('span', { style: `font-family:'Noto Serif TC',serif; font-weight:700; color:${T.ink}; margin-left:6px;` }, center.bureau)]),
    h('span', { style: `color:${T.mid};` }, ['命主', h('span', { style: `font-family:'Noto Serif TC',serif; font-weight:700; color:${T.ink}; margin-left:6px;` }, center.mingZhu)]),
    h('span', { style: `color:${T.mid};` }, ['身主', h('span', { style: `font-family:'Noto Serif TC',serif; font-weight:700; color:${T.ink}; margin-left:6px;` }, center.shenZhu)]),
  ]);
}

function shenBadge(T) {
  return h('span', {
    style: `margin-left:5px; font-size:9px; letter-spacing:1px; color:${T.tagText}; background:${T.lineStrong}; border-radius:2px; padding:0 4px; vertical-align:2px;`,
  }, '身');
}

function palaceCell(p, T) {
  const cell = h('div', {
    onclick: p.onClick,
    style: `grid-column:${p.col}; grid-row:${p.row}; background:${p.bg}; box-shadow:${p.glow}; position:relative; display:flex; flex-direction:column; padding:9px 9px 7px; cursor:pointer; min-height:0; min-width:0; overflow:hidden; transition:background .25s, box-shadow .25s;`,
  }, []);

  if (p.layerMark) {
    cell.appendChild(h('div', { style: `position:absolute; inset:3px; border:1.5px solid ${T.lineStrong}; pointer-events:none;` }));
    cell.appendChild(h('div', { style: `position:absolute; top:0; right:0; background:${T.lineStrong}; color:${T.tagText}; font-size:10px; letter-spacing:1px; padding:2px 6px; pointer-events:none;` }, p.layerTag));
  }

  const majorsRow = h('div', { style: 'display:flex; flex-wrap:wrap; gap:4px 10px; align-items:flex-start;' },
    p.majors.map((st) => starRow({ ...st, T }, true)));
  const minorsRow = h('div', { style: 'display:flex; flex-wrap:wrap; gap:2px 8px; margin-top:3px;' },
    p.minors.map((st) => h('span', { style: 'display:inline-flex; align-items:flex-start; gap:2px;' }, [
      h('span', { style: `font-size:12px; letter-spacing:.5px; color:${st.color}; line-height:1.4;` }, st.name),
      hua(st.birthHua, T.cinnabar, 14),
      hua(st.layerHua, st.layerBg, 14),
    ])));

  const nameLabel = h('span', {
    style: `font-family:'Noto Serif TC',serif; font-size:13px; font-weight:700; letter-spacing:2px; color:${p.nameColor}; border-bottom:2px solid ${p.nameLine}; padding-bottom:1px;`,
  }, p.name);
  if (p.shen) nameLabel.appendChild(shenBadge(T));

  cell.appendChild(majorsRow);
  cell.appendChild(minorsRow);
  cell.appendChild(h('div', { style: 'flex:1; min-height:14px;' }));
  cell.appendChild(h('div', { style: 'display:flex; align-items:flex-end; justify-content:space-between; gap:6px;' }, [
    nameLabel,
    h('span', { style: 'display:flex; flex-direction:column; align-items:flex-end; gap:1px;' }, [
      h('span', { style: `font-family:'Noto Serif TC',serif; font-size:12px; font-weight:600; color:${T.gold}; letter-spacing:2px;` }, p.ganzhi),
      h('span', { style: `font-size:10px; color:${T.ghost}; letter-spacing:.5px; font-variant-numeric:tabular-nums;` }, p.daxian),
    ]),
  ]));
  return cell;
}

function centerBox(vals, mobile) {
  const { T, center } = vals;
  if (mobile) {
    return h('div', { style: `background:${T.centerBg}; border:1.5px solid ${T.lineStrong}; padding:16px; margin-bottom:10px; display:flex; flex-direction:column; gap:10px;` }, [
      h('div', { style: 'display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;' }, [
        h('span', { style: "font-family:'Noto Serif TC',serif; font-size:20px; font-weight:900; letter-spacing:4px;" }, center.name),
        h('span', { style: `font-size:12px; color:${T.cinnabar}; border:1px solid ${T.cinnabar}; padding:1px 7px; letter-spacing:2px;` }, center.gender),
      ]),
      h('div', { style: `display:flex; flex-direction:column; gap:3px; font-size:12.5px; color:${T.mid}; letter-spacing:.5px;` }, [
        h('span', {}, [h('span', { style: `color:${T.ghost}; margin-right:8px;` }, '國曆'), center.birth.solar]),
        h('span', {}, [h('span', { style: `color:${T.ghost}; margin-right:8px;` }, '農曆'), center.birth.lunar]),
      ]),
      pillarRow(vals.pillars, T, false),
      bureauRow(center, T),
    ]);
  }
  return h('div', { style: `grid-column:2 / span 2; grid-row:2 / span 2; background:${T.centerBg}; position:relative; display:flex; flex-direction:column; justify-content:center; gap:12px; padding:26px;` }, [
    h('div', { style: `position:absolute; inset:7px; border:1px solid ${T.line}; pointer-events:none;` }),
    h('div', { style: 'display:flex; align-items:baseline; gap:10px;' }, [
      h('span', { style: "font-family:'Noto Serif TC',serif; font-size:24px; font-weight:900; letter-spacing:4px;" }, center.name),
      h('span', { style: `font-size:12px; color:${T.cinnabar}; border:1px solid ${T.cinnabar}; padding:1px 7px; letter-spacing:2px;` }, center.gender),
    ]),
    h('div', { style: `display:flex; flex-direction:column; gap:4px; font-size:12.5px; color:${T.mid}; letter-spacing:.5px;` }, [
      h('span', {}, [h('span', { style: `color:${T.ghost}; margin-right:8px;` }, '國曆'), center.birth.solar]),
      h('span', {}, [h('span', { style: `color:${T.ghost}; margin-right:8px;` }, '農曆'), center.birth.lunar]),
    ]),
    pillarRow(vals.pillars, T, true),
    bureauRow(center, T),
  ]);
}

function pickerRow(items, T) {
  if (!items) return null;
  return h('div', { style: 'display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:10px;' },
    items.map((it) => h('button', {
      onclick: it.onClick,
      style: `padding:5px 12px; font-size:12px; letter-spacing:1px; cursor:pointer; border-radius:2px; border:1px solid ${it.border}; background:${it.bg}; color:${it.color}; transition:all .2s;`,
    }, it.label)));
}

function yearlyStepperRow(stepper, T) {
  if (!stepper) return null;
  return h('div', { style: 'display:flex; align-items:center; gap:10px; margin-bottom:10px;' }, [
    h('button', { onclick: stepper.prev, style: `padding:4px 12px; border:1px solid ${T.line}; background:transparent; color:${T.mid}; cursor:pointer; border-radius:2px; font-size:13px;` }, '‹'),
    h('span', { style: `font-family:'Noto Serif TC',serif; font-size:15px; font-weight:700; letter-spacing:2px; color:${T.ink};` }, `西元 ${stepper.year} 年`),
    h('button', { onclick: stepper.next, style: `padding:4px 12px; border:1px solid ${T.line}; background:transparent; color:${T.mid}; cursor:pointer; border-radius:2px; font-size:13px;` }, '›'),
  ]);
}

function chartScreen(vals) {
  const { T } = vals;
  const container = h('section', { style: 'flex:1; display:flex; flex-direction:column; padding:14px 16px 40px; max-width:1180px; width:100%; margin:0 auto;' });

  container.appendChild(h('div', { style: `display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; background:${T.card}; border:1px solid ${T.line}; padding:10px 14px; margin-bottom:12px; animation:fadeIn .4s ease both;` }, [
    h('div', { style: 'display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;' }, [
      h('span', { style: "font-family:'Noto Serif TC',serif; font-size:15px; font-weight:700; letter-spacing:2px;" }, vals.center.name),
      h('span', { style: `font-size:12px; color:${T.faint}; letter-spacing:1px;` }, vals.summary),
    ]),
    h('div', { style: 'display:flex; gap:8px;' }, [
      h('button', { onclick: vals.backToInput, style: `padding:7px 14px; background:transparent; border:1px solid ${T.line}; color:${T.mid}; font-size:12px; letter-spacing:2px; cursor:pointer; border-radius:2px;` }, '重新輸入'),
      h('button', { onclick: vals.openShare, style: `padding:7px 14px; background:${T.tabOnBg}; border:1px solid ${T.tabOnBg}; color:${T.tabOnText}; font-size:12px; letter-spacing:2px; cursor:pointer; border-radius:2px;` }, '分享圖卡'),
    ]),
  ]));

  const tabRow = h('div', { style: 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px;' },
    vals.tabs.map((t) => h('button', {
      onclick: t.onClick,
      style: `padding:7px 18px; font-family:'Noto Serif TC',serif; font-size:14px; font-weight:600; letter-spacing:3px; cursor:pointer; border-radius:2px; border:1px solid ${t.border}; background:${t.bg}; color:${t.color}; transition:all .2s;`,
    }, t.label)));
  if (vals.legend) tabRow.appendChild(h('span', { style: `font-size:11px; color:${T.faint}; letter-spacing:1px; margin-left:4px;` }, vals.legend));
  container.appendChild(tabRow);

  const pr = pickerRow(vals.decadalPicker || vals.monthlyPicker, T);
  if (pr) container.appendChild(pr);
  const ys = yearlyStepperRow(vals.yearlyStepper, T);
  if (ys) container.appendChild(ys);

  const mainRow = h('div', { style: 'display:flex; gap:18px; align-items:stretch;' });
  const chartWrap = h('div', { style: vals.chartWrapStyle });
  const chartInner = h('div', { style: `position:relative; width:${vals.chartW}; margin:0 auto; animation:riseIn .55s ease both;` });

  if (vals.narrow) chartInner.appendChild(centerBox(vals, true));

  const gridWrap = h('div', { style: 'position:relative;' });
  const grid = h('div', {
    style: `display:grid; grid-template-columns:${vals.gridCols}; grid-template-rows:${vals.gridRows}; aspect-ratio:${vals.gridAspect}; gap:1px; background:${T.line}; border:1.5px solid ${T.lineStrong}; box-shadow:${T.chartShadow};`,
  }, vals.palaces.map((p) => palaceCell(p, T)));
  if (vals.showCenterGrid) grid.appendChild(centerBox(vals, false));
  gridWrap.appendChild(grid);

  const svgLines = svg('svg', { viewBox: vals.vb, preserveAspectRatio: 'none', style: 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible;' });
  vals.lines.forEach((l) => svgLines.appendChild(svg('line', {
    x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2,
    style: `stroke:${T.cinnabar}; stroke-width:1.6; stroke-dasharray:${l.dash}; opacity:.75; animation:fadeIn .35s ease both;`,
  })));
  vals.nodes.forEach((n) => svgLines.appendChild(svg('circle', {
    cx: n.x, cy: n.y, r: 4,
    style: `fill:${n.fill}; stroke:${T.card}; stroke-width:1.5; animation:fadeIn .35s ease both;`,
  })));
  gridWrap.appendChild(svgLines);

  chartInner.appendChild(gridWrap);
  chartWrap.appendChild(chartInner);
  mainRow.appendChild(chartWrap);

  if (vals.panelOpen) mainRow.appendChild(panelAside(vals, T));
  container.appendChild(mainRow);
  container.appendChild(h('p', { style: `margin:14px 0 0; font-size:11px; color:${T.ghost}; letter-spacing:1px; text-align:center;` }, '點擊任一宮位，查看三方四正與解盤　·　接入真實排盤'));
  container.appendChild(siteFooter(T));

  return container;
}

function siteFooter(T) {
  return h('div', {
    style: `position:relative; z-index:70; margin:18px 0 0; padding-top:14px; border-top:1px solid ${T.headerLine}; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:12px; color:${T.ghost}; letter-spacing:.5px; text-align:center;`,
  }, [
    h('p', { style: 'margin:0;' }, '本站為免費線上排盤工具，內容僅供娛樂與參考，不構成醫療、法律、投資等專業建議'),
    h('p', { style: 'margin:0;' }, '聯絡信箱：kanglog.ziwei@gmail.com'),
    h('p', { style: 'margin:0;' }, '© 2026 KANG.LOG ・ 排盤引擎 iztro'),
  ]);
}

function panelAside(vals, T) {
  const aside = h('aside', { style: vals.panelStyle });
  aside.appendChild(h('div', { style: 'display:flex; align-items:flex-start; justify-content:space-between; gap:10px;' }, [
    h('div', { style: 'display:flex; flex-direction:column; gap:3px;' }, [
      h('div', { style: 'display:flex; align-items:baseline; gap:10px;' }, [
        h('span', { style: `font-family:'Noto Serif TC',serif; font-size:22px; font-weight:900; letter-spacing:3px; color:${T.cinnabar};` }, vals.panelName),
        h('span', { style: `font-family:'Noto Serif TC',serif; font-size:14px; color:${T.gold}; letter-spacing:2px;` }, vals.panelGanzhi),
      ]),
      h('span', { style: `font-size:11.5px; color:${T.ghost}; letter-spacing:1px;` }, `大限 ${vals.panelDaxian} 歲`),
    ]),
    h('button', { onclick: vals.closePanel, style: `width:28px; height:28px; border:1px solid ${T.line}; background:transparent; color:${T.faint}; cursor:pointer; font-size:14px; line-height:1; border-radius:2px;` }, '✕'),
  ]));
  aside.appendChild(h('div', { style: `height:1px; background:linear-gradient(90deg, ${T.line}, transparent); margin:14px 0;` }));

  const starsCol = h('div', { style: 'display:flex; flex-direction:column; gap:16px;' }, vals.panelStars.map((b) => h('div', { style: 'display:flex; flex-direction:column; gap:6px;' }, [
    h('span', { style: 'display:inline-flex; align-items:center; gap:6px;' }, [
      h('span', { style: "font-family:'Noto Serif TC',serif; font-size:16px; font-weight:700; letter-spacing:2px;" }, b.name),
      hua(b.birthHua, T.cinnabar, 16),
      hua(b.layerHua, b.layerBg, 16),
    ]),
    h('p', { style: `margin:0; font-size:13px; line-height:1.9; color:${T.soft}; letter-spacing:.5px; text-wrap:pretty;` }, b.text),
  ])));
  aside.appendChild(starsCol);

  aside.appendChild(h('div', { style: `height:1px; background:linear-gradient(90deg, ${T.line}, transparent); margin:14px 0;` }));
  aside.appendChild(h('div', { style: `display:flex; flex-direction:column; gap:6px; font-size:12px; color:${T.faint}; letter-spacing:.5px; line-height:1.7;` }, [
    h('span', {}, [h('span', { style: `color:${T.gold};` }, '輔煞'), '　' + vals.panelMinors]),
    h('span', {}, [h('span', { style: `color:${T.gold};` }, '三方四正'), '　' + vals.panelSanfang]),
  ]));
  aside.appendChild(h('p', { style: `margin:16px 0 0; font-size:10.5px; color:${T.ghost2}; letter-spacing:1px;` }, '※ 簡釋文案，供閱讀命盤參考'));
  return aside;
}

function shareModal(vals) {
  const { T } = vals;
  const cardBody = h('div', {
    onclick: vals.stopClick,
    style: `width:min(340px, 92vw); background:${T.card}; border:1px solid ${T.lineStrong}; box-shadow:0 24px 80px rgba(0,0,0,.45); padding:26px 24px 20px; display:flex; flex-direction:column; align-items:center; gap:14px; animation:riseIn .35s ease both;`,
  }, [
    h('div', { style: 'display:flex; flex-direction:column; align-items:center; gap:4px;' }, [
      h('span', { style: `font-size:10px; letter-spacing:5px; color:${T.gold};` }, '紫微斗數・本命盤'),
      h('span', { style: "font-family:'Noto Serif TC',serif; font-size:22px; font-weight:900; letter-spacing:4px;" }, vals.center.name),
      h('span', { style: `font-size:11px; color:${T.faint}; letter-spacing:1px;` }, vals.center.birth.lunar),
    ]),
    h('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
      h('span', { style: `width:24px; height:1px; background:${T.line};` }),
      h('span', { style: `font-family:'Noto Serif TC',serif; font-size:15px; font-weight:700; color:${T.cinnabar}; letter-spacing:3px;` }, `命宮・${vals.shareMing}`),
      h('span', { style: `width:24px; height:1px; background:${T.line};` }),
    ]),
    h('div', { style: `width:230px; display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(4,1fr); aspect-ratio:1/1; gap:1px; background:${T.line}; border:1px solid ${T.lineStrong};` }, [
      ...vals.shareCells.map((c) => h('span', {
        style: `grid-column:${c.col}; grid-row:${c.row}; background:${c.bg}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; overflow:hidden;`,
      }, [
        h('span', { style: `font-family:'Noto Serif TC',serif; font-size:10px; font-weight:700; color:${c.starColor}; letter-spacing:.5px; white-space:nowrap;` }, c.star),
        h('span', { style: `font-size:8px; color:${T.ghost}; letter-spacing:1px;` }, c.name),
      ])),
      h('span', { style: `grid-column:2 / span 2; grid-row:2 / span 2; background:${T.centerBg}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;` }, [
        h('span', { style: `width:26px; height:26px; background:${T.cinnabar}; color:#FBF7EC; display:flex; align-items:center; justify-content:center; font-family:'Noto Serif TC',serif; font-weight:900; font-size:9px; writing-mode:vertical-rl; letter-spacing:1px;` }, '紫微'),
        h('span', { style: `font-size:9px; color:${T.faint}; letter-spacing:1px;` }, vals.center.bureau),
      ]),
    ]),
    h('span', { style: `font-size:9.5px; letter-spacing:3px; color:${T.ghost2};` }, 'ZIWEI.APP　新中式排盤'),
    h('div', { style: 'display:flex; gap:8px; width:100%; margin-top:2px;' }, [
      h('button', { style: `flex:1; padding:10px 0; background:${T.cinnabar}; color:#FBF7EC; border:none; cursor:pointer; font-size:13px; letter-spacing:3px; border-radius:2px;` }, '下載圖卡'),
      h('button', { onclick: vals.closeShare, style: `flex:1; padding:10px 0; background:transparent; color:${T.mid}; border:1px solid ${T.line}; cursor:pointer; font-size:13px; letter-spacing:3px; border-radius:2px;` }, '關　閉'),
    ]),
  ]);

  return h('div', {
    onclick: vals.closeShare,
    style: 'position:fixed; inset:0; background:rgba(14,12,20,.66); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn .25s ease both;',
  }, cardBody);
}

export function renderApp(root, vals) {
  const { T } = vals;
  root.innerHTML = '';
  const page = h('div', {
    style: `min-height:100vh; background:${T.pageBg}; color:${T.ink}; font-family:'Noto Sans TC', sans-serif; display:flex; flex-direction:column; transition:background .35s, color .35s;`,
  });

  page.appendChild(h('header', { style: `display:flex; align-items:center; justify-content:space-between; gap:10px; padding:16px 22px; border-bottom:1px solid ${T.headerLine};` }, [
    h('div', { style: 'display:flex; align-items:center; gap:12px;' }, [
      h('div', { style: `width:36px; height:36px; background:${T.cinnabar}; color:#FBF7EC; display:flex; align-items:center; justify-content:center; font-family:'Noto Serif TC',serif; font-weight:900; font-size:13px; line-height:1.1; letter-spacing:1px; writing-mode:vertical-rl; border-radius:2px;` }, '紫微'),
      h('div', { style: 'display:flex; flex-direction:column; gap:1px;' }, [
        h('span', { style: "font-family:'Noto Serif TC',serif; font-size:19px; font-weight:700; letter-spacing:3px;" }, '紫微斗數'),
        h('span', { style: `font-size:11px; letter-spacing:3px; color:${T.faint};` }, '新中式排盤・解盤'),
      ]),
    ]),
    h('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
      h('button', { onclick: vals.toggleDark, style: `padding:5px 12px; background:transparent; border:1px solid ${T.line}; color:${T.gold}; font-size:11px; letter-spacing:2px; cursor:pointer; border-radius:2px; transition:all .2s;` }, vals.darkLabel),
      h('span', { style: `font-size:11px; letter-spacing:2px; color:${T.gold}; border:1px solid ${T.line}; padding:5px 10px; border-radius:2px;` }, 'iztro 排盤'),
    ]),
  ]));

  if (vals.showInput) page.appendChild(inputScreen(vals));
  if (vals.showChart) page.appendChild(chartScreen(vals));
  if (vals.shareOpen) page.appendChild(shareModal(vals));

  root.appendChild(page);
}
