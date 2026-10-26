# 🏮 解憂雜貨店 (Worry Grocer)

> **把你的煩惱投進信箱，明天太陽依舊升起。**  
> 一個利用生成式 AI 打造的互動式心靈樹洞與處方箋生成器，讓每位帶著疲憊與迷惘的人，收穫專屬的手寫回信與溫暖拍立得。

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-orange?style=flat-square&logo=github)](https://411411324.github.io/worry-grocer/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%20Flash-blue?style=flat-square&logo=google)](https://ai.google.dev/)

---

## 🌟 核心理念 (Why Worry Grocer?)

在快節奏與高壓的校園與現代生活中，焦慮、迷惘與內耗如影隨形。我們往往有很多心事，卻因為「怕給朋友添麻煩」、「擔心被評價」而選擇在深夜獨自消化。

**解憂雜貨店 (Worry Grocer)** 靈感源自東野圭吾的經典小說，旨在提供一個**零門檻、零負擔、充滿儀式感的情感出口**。使用者投遞信件後，能挑選不同風格的「店長」回信，並獲得一張可下載為圖片、隨手分享在社群（如 IG 限動）的**今日心靈處方箋拍立得**。

一個好的點子，應該能夠被溫暖地分享給身邊所有人。

---

## ✨ 產品核心特色

### 1. 🎭 三大解憂店長人格 (Multi-Persona Prompting)
- 🌿 **溫柔木木（治癒暖心系）**：深層傾聽、接納情緒、非暴力溝通風格，適合需要被溫柔包容的脆弱時刻。
- ☕ **毒舌阿柴（幽默吐槽系）**：嘴硬心軟、犀利戳破無效內耗、幽默打破盲點，適合想被幽默「罵醒」的朋友。
- 📜 **哲學爺爺（生活洞察系）**：宏觀視角、以大自然與時間為隱喻，提供如定海神針般的寧靜與超脫。

### 2. 🏷️ 情緒頻率標籤
支援多重標籤勾選（如：焦慮內耗、期中/期末考崩潰、迷惘不知去向、人際心累、深夜失眠等），使 AI 在理解煩惱情境時更具脈絡感。

### 3. 📸 今日心靈處方箋（拍立得卡片）
- 獨一無二的專屬編號與復古郵戳。
- 直擊心靈的治癒金句與具體微行動（Micro-Action）。
- **一鍵下載高解析度 PNG 圖片**（使用 `html2canvas` 渲染），適合收藏或發佈到社群限時動態。

### 4. ⚡ 雙模運作機制 (Double Mode)
- **✨ 體驗模式 (免金鑰)**：內建智慧備援文本庫，完全不需要 API Key，即開即玩，適合即時分享給朋友或在無網路/限流時穩定展示。
- **⚡ 即時 AI 模式**：支援填入使用者專屬的 Google Gemini API Key，在前端即時進行結構化 JSON 生成（金鑰僅存放於本機 LocalStorage，隱私零外洩）。

---

## 🛠️ 技術架構

- **前端核心**：純純原生的 HTML5 / CSS3 / ES6+ JavaScript，無須繁瑣編譯打包。
- **UI 框架**：Tailwind CSS (CDN) + Google Fonts (Noto Serif TC, Zen Maru Gothic)。
- **動效與圖標**：Lucide Icons、Canvas Confetti、CSS 手寫信紙動效。
- **圖片匯出**：html2canvas，在客戶端直接將 DOM 元素無損轉成拍立得圖片。
- **AI 整合**：Google Gemini 1.5 Flash API（結構化 JSON 輸出模式）。
- **託管方案**：GitHub Pages 免費靜態託管。

---

## 🚀 快速開始與本地運行

無需安裝 Node.js 或複雜套件，直接透過瀏覽器開啟即可：

1. **Clone 本專案**：
   ```bash
   git clone https://github.com/411411324/worry-grocer.git
   cd worry-grocer
   ```
2. **開啟體驗**：
   - 雙擊開啟 `index.html` 即可在瀏覽器中運行。
   - 或使用 VS Code 的 `Live Server` 外掛開啟。

---

## 🌐 部署至 GitHub Pages（分享給他人）

1. 將專案推送到你個人的 GitHub Repository（名稱例如 `worry-grocer`，**注意：請勿包含姓名或學號**）。
2. 進入該 Repo 的 **Settings** ➔ **Pages**。
3. 在 **Build and deployment** 下方的 **Branch** 選擇 `main`（或 `master`），資料夾選擇 `/ (root)`，點擊 **Save**。
4. 等待 1~2 分鐘後，即可獲得線上公開分享網址：  
   `https://411411324.github.io/worry-grocer/`

---

## 🔮 未來展望 (Next Steps)

- [ ] **漂流瓶匿名共鳴池**：在寄信人同意下，將無涉隱私的溫暖回信投遞至公開星空，其他使用者可點擊給予「擁抱」。
- [ ] **語音朗讀（TTS）**：結合文字轉語音技術，讓溫柔木木或哲學爺爺以語音親口將信讀給使用者聽。
- [ ] **多語言支援**：拓展英文、日文等多語系，分享給更多跨文化的社群朋友。

---

## 📄 授權條款

本專案採用 [MIT License](LICENSE) 授權。歡迎自由 Fork、改進與分享！
