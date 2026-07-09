# 視覺比對：轉譯版 vs 凍結原型

比對對象：
- `ref-*.png`：原型 `reference/ziweionline.dc.html`（DEMO_CHART 假資料）
- `mine-*.png`：新版 `app/`（真實 iztro 排盤，輸入 1990/10/26 14:30 男）

比對結果：light-desktop / dark-desktop / yearly-desktop 三組，版面、字級、間距、配色、
四化圓標、命宮標紅、身宮徽章、大限/流年疊層框線與籤條樣式均一致。刻意變動的文字只有：
- 頂部右上角徽章："示意資料" → "iztro 排盤"（因為已非示意資料）
- 中宮姓名：demo 的 "林曉暉" → 無姓名輸入欄位所以顯示 "本命盤主"
- 底部提示文字最後一句："非真實排盤" → "接入真實排盤"
- 新增：流年籤下方的「‹ 西元 2026 年 ›」切換列（原型沒有，屬本次新增功能）

`mobile-2x6` 這組：兩個檔案都在，但截圖工具（無論是 puppeteer 或瀏覽器擴充套件）在窄螢幕
+ 中文 Google Fonts 動態載入的情況下會有已知的算圖失真問題（見專案記憶
`feedback_mobile_responsive_pitfalls`：headless Chrome 截圖寬度不可靠），文字看起來
偏淡。已用 `getComputedStyle` 直接查證過 `app/` 在 390px 寬度下的實際樣式
（grid-template-columns / grid-area / color / opacity）跟原型的 POS26 排法逐項比對一致，
只是截圖本身沒能忠實呈現，不是程式的問題。建議之後有機會用手機或真的瀏覽器視窗核對一次。
