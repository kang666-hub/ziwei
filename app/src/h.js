// 極簡 hyperscript helper：取代原型的 {{mustache}} 模板，用真正的 JS 建 DOM，
// 好處是 onclick 可以直接傳函式參照，不必再靠字串序列化。
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'style') {
      el.style.cssText = v;
    } else if (k === 'text') {
      el.textContent = v;
    } else if (k === 'ref' && typeof v === 'function') {
      v(el);
    } else if (k.startsWith('on') && typeof v === 'function') {
      el[k.toLowerCase()] = v;
    } else if (k === 'value') {
      el.value = v;
    } else {
      el.setAttribute(k, v);
    }
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
  }
  return el;
}

export function svg(tag, attrs = {}, children = []) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    el.appendChild(c);
  }
  return el;
}
