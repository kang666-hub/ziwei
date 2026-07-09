# 紫微斗數・新中式排盤

用 [iztro](https://github.com/SylarLong/iztro) 排盤引擎接上凍結版 UI 的純前端靜態網站。

- 上線網址：https://kang666-hub.github.io/ziwei/
- `app/`：Vite + iztro 專案原始碼（`npm install && npm run dev` 開發，`npm run build` 產出靜態檔）
- `reference/ziweionline.dc.html`：UI 原型（凍結版，Claude Design 匯出格式，僅供比對）
- `compare/`：轉譯版與原型的畫面比對截圖
- 根目錄的 `index.html` / `assets/`：`app/` 建置後的靜態產物，GitHub Pages 直接從這裡發布

## 架構

- `app/src/adapter.js`：唯一的資料轉換層，iztro 排盤結果 → UI 既有的 JSON 契約
- `app/src/state.js`：畫面狀態與互動邏輯（本命/大限/流年/流月切換、大限12選1、流年流月選擇）
- `app/src/render.js`：把契約資料畫成 DOM（逐條轉譯自原型模板，vanilla JS 不依賴 React）
- `app/src/data/interpretations.json`：14主星×12宮的簡釋文案

## 更新部署

```
cd app
npm run build
cp -r dist/* ..
cd ..
git add index.html assets
git commit -m "..."
git push
```
