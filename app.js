/**
 * 解憂雜貨店 Worry Grocer - 核心邏輯
 * 包含：人格切換、標籤選取、AI Prompt 調度、離線備援庫、圖片下載 (html2canvas)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 初始化 Lucide 圖標
  if (window.lucide) {
    lucide.createIcons();
  }

  // 狀態變數
  let currentPersona = 'mumu';
  let selectedTags = ['焦慮內耗'];
  let currentMode = localStorage.getItem('wg_mode') || 'demo'; // 'demo' | 'live'
  let savedApiKey = localStorage.getItem('wg_gemini_key') || '';

  // DOM 元素引用
  const sectionWrite = document.getElementById('sectionWrite');
  const sectionSending = document.getElementById('sectionSending');
  const sectionReply = document.getElementById('sectionReply');

  const personaCards = document.querySelectorAll('.persona-card');
  const moodTagButtons = document.querySelectorAll('.mood-tag');
  const senderNameInput = document.getElementById('senderName');
  const letterContentInput = document.getElementById('letterContent');
  const charCount = document.getElementById('charCount');

  const btnSendLetter = document.getElementById('btnSendLetter');
  const btnDownloadCard = document.getElementById('btnDownloadCard');
  const btnCopyReply = document.getElementById('btnCopyReply');
  const btnWriteAgain = document.getElementById('btnWriteAgain');
  const copyBtnText = document.getElementById('copyBtnText');

  const btnFillDemo1 = document.getElementById('btnFillDemo1');
  const btnFillDemo2 = document.getElementById('btnFillDemo2');

  // Modal 元素
  const btnAbout = document.getElementById('btnAbout');
  const modalAbout = document.getElementById('modalAbout');
  const btnCloseAbout = document.getElementById('btnCloseAbout');
  const btnConfirmAbout = document.getElementById('btnConfirmAbout');

  const btnApiSettings = document.getElementById('btnApiSettings');
  const modalApi = document.getElementById('modalApi');
  const btnCloseApi = document.getElementById('btnCloseApi');
  const btnSaveApi = document.getElementById('btnSaveApi');
  const modeDemoBtn = document.getElementById('modeDemoBtn');
  const modeLiveBtn = document.getElementById('modeLiveBtn');
  const apiKeyInputWrapper = document.getElementById('apiKeyInputWrapper');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const apiStatusText = document.getElementById('apiStatusText');

  // 回信展示元素
  const replyDate = document.getElementById('replyDate');
  const replySalutation = document.getElementById('replySalutation');
  const replyBody = document.getElementById('replyBody');
  const replyMoodBadge = document.getElementById('replyMoodBadge');
  const replySignature = document.getElementById('replySignature');

  const cardRxNumber = document.getElementById('cardRxNumber');
  const cardQuote = document.getElementById('cardQuote');
  const cardAction = document.getElementById('cardAction');
  const cardReceiver = document.getElementById('cardReceiver');

  // 初始化設定標籤與模式狀態
  updateApiUI();
  updateTagUI();

  // 1. 人格切換點擊
  personaCards.forEach(card => {
    card.addEventListener('click', () => {
      personaCards.forEach(c => {
        c.classList.remove('border-2', 'border-brand-accent', 'active');
        c.classList.add('border', 'border-brand-border');
        const check = c.querySelector('.selected-indicator');
        if (check) check.classList.add('hidden');
      });

      card.classList.add('border-2', 'border-brand-accent', 'active');
      card.classList.remove('border-brand-border');
      const check = card.querySelector('.selected-indicator');
      if (check) check.classList.remove('hidden');

      currentPersona = card.dataset.persona;
    });
  });

  // 2. 心情標籤多選點擊
  moodTagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
      } else {
        selectedTags.push(tag);
      }
      updateTagUI();
    });
  });

  function updateTagUI() {
    moodTagButtons.forEach(btn => {
      const tag = btn.dataset.tag;
      if (selectedTags.includes(tag)) {
        btn.classList.add('bg-brand-accent', 'text-white', 'border-brand-accent');
        btn.classList.remove('bg-brand-paper', 'text-brand-ink');
      } else {
        btn.classList.remove('bg-brand-accent', 'text-white', 'border-brand-accent');
        btn.classList.add('bg-brand-paper', 'text-brand-ink');
      }
    });
  }

  // 3. 字數統計與輸入監聽
  letterContentInput.addEventListener('input', () => {
    charCount.textContent = letterContentInput.value.length;
  });

  // 4. 快速填入範例
  btnFillDemo1.addEventListener('click', () => {
    senderNameInput.value = '期中焦慮的同學';
    letterContentInput.value = '店長你好：\n最近期中考、專題跟作業全部堆在一起，每天一睜開眼就覺得好喘。明明知道該開始做，卻總是坐在電腦前發呆、焦慮內耗，覺得自己效率好低。好怕交不出來，也怕結果不如預期...我到底該怎麼辦？';
    selectedTags = ['焦慮內耗', '期中/學業崩潰'];
    updateTagUI();
    charCount.textContent = letterContentInput.value.length;
  });

  btnFillDemo2.addEventListener('click', () => {
    senderNameInput.value = '迷途的夜貓子';
    letterContentInput.value = '店長好：\n看著身邊的同學好像都很有目標，有人實習、有人比賽得獎，只有我好像每天都在混混噩噩。我不知道自己真正想做什麼，常常覺得自己比不上別人，越想越害怕自己的未來...';
    selectedTags = ['迷惘不知去向', '深夜失眠'];
    updateTagUI();
    charCount.textContent = letterContentInput.value.length;
  });

  // 5. 投遞按鈕觸發
  btnSendLetter.addEventListener('click', async () => {
    const text = letterContentInput.value.trim();
    if (!text) {
      alert('請先在信紙上寫下一點點你的心事，店長才能為你回信唷！');
      letterContentInput.focus();
      return;
    }

    const sender = senderNameInput.value.trim() || '無名的朋友';

    // 切換到送信中動畫
    sectionWrite.classList.add('hidden');
    sectionSending.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      let replyData;
      if (currentMode === 'live' && savedApiKey) {
        replyData = await fetchFromGemini(text, sender, currentPersona, selectedTags, savedApiKey);
      } else {
        // 體驗模式：模擬 1.5 秒翻信開箱儀式
        await new Promise(r => setTimeout(r, 1500));
        replyData = generateMockReply(text, sender, currentPersona, selectedTags);
      }

      displayReply(replyData, sender);
    } catch (err) {
      console.warn('AI 生成遇到問題，自動無縫切換到智慧備援庫：', err);
      const fallbackData = generateMockReply(text, sender, currentPersona, selectedTags);
      displayReply(fallbackData, sender);
    }
  });

  // 6. 展示回信內容
  function displayReply(data, sender) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const rxNumber = `No. ${now.getFullYear()}-WG-${Math.floor(100 + Math.random() * 900)}`;

    replyDate.textContent = dateStr;
    replySalutation.textContent = `親愛的 ${sender}：`;
    replyBody.textContent = data.letter;
    replyMoodBadge.textContent = selectedTags.length > 0 ? selectedTags.join(' · ') : '當前心情診斷';

    // 人格署名
    const signatures = {
      mumu: '—— 你的解憂店長 溫柔木木 筆 🌿',
      chai: '—— 嘴硬心軟的 毒舌阿柴 筆 ☕',
      grandpa: '—— 坐在庭院喝茶的 哲學爺爺 筆 📜'
    };
    replySignature.textContent = signatures[currentPersona] || '—— 解憂雜貨店 筆';

    // 拍立得處方箋賦值
    cardRxNumber.textContent = rxNumber;
    cardQuote.textContent = `「${data.quote}」`;
    cardAction.textContent = data.action;
    cardReceiver.textContent = sender;

    // 切換顯示
    sectionSending.classList.add('hidden');
    sectionReply.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 觸發慶祝紙屑動效
    if (window.confetti) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C85A32', '#D97736', '#FAF7F2', '#A83232']
      });
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // 7. 下載處方箋拍立得卡片 (html2canvas)
  btnDownloadCard.addEventListener('click', () => {
    const target = document.getElementById('polaroidCaptureArea');
    const originalText = btnDownloadCard.innerHTML;
    btnDownloadCard.innerHTML = `<span>處理截圖中...</span>`;

    html2canvas(target, {
      scale: 2.5,
      backgroundColor: '#FAF7F2',
      useCORS: true,
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `worry-grocer-rx-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      btnDownloadCard.innerHTML = originalText;
    }).catch(err => {
      console.error(err);
      alert('產生卡片圖片時出錯，請稍後再試');
      btnDownloadCard.innerHTML = originalText;
    });
  });

  // 8. 複製回信文字
  btnCopyReply.addEventListener('click', () => {
    const fullText = `${replySalutation.textContent}\n\n${replyBody.textContent}\n\n${replySignature.textContent}\n\n[今日心靈處方] ${cardQuote.textContent}\n微任務：${cardAction.textContent}`;
    navigator.clipboard.writeText(fullText).then(() => {
      copyBtnText.textContent = '已複製到剪貼簿！';
      setTimeout(() => {
        copyBtnText.textContent = '複製回信全文';
      }, 2500);
    });
  });

  // 9. 再寫一封信
  btnWriteAgain.addEventListener('click', () => {
    resetToHome();
  });

  window.resetToHome = function() {
    sectionReply.classList.add('hidden');
    sectionSending.classList.add('hidden');
    sectionWrite.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 10. Modal 控制
  btnAbout.addEventListener('click', () => modalAbout.classList.remove('hidden'));
  btnCloseAbout.addEventListener('click', () => modalAbout.classList.add('hidden'));
  btnConfirmAbout.addEventListener('click', () => modalAbout.classList.add('hidden'));

  btnApiSettings.addEventListener('click', () => modalApi.classList.remove('hidden'));
  btnCloseApi.addEventListener('click', () => modalApi.classList.add('hidden'));

  modeDemoBtn.addEventListener('click', () => {
    currentMode = 'demo';
    updateApiModalButtons();
  });

  modeLiveBtn.addEventListener('click', () => {
    currentMode = 'live';
    updateApiModalButtons();
  });

  btnSaveApi.addEventListener('click', () => {
    const key = geminiApiKeyInput.value.trim();
    if (currentMode === 'live' && !key) {
      alert('請先輸入有效的 Gemini API Key，或切換回「體驗模式」。');
      return;
    }
    savedApiKey = key;
    localStorage.setItem('wg_mode', currentMode);
    localStorage.setItem('wg_gemini_key', savedApiKey);
    updateApiUI();
    modalApi.classList.add('hidden');
  });

  function updateApiModalButtons() {
    if (currentMode === 'demo') {
      modeDemoBtn.className = 'p-3 rounded-lg border-2 border-brand-accent bg-brand-accent/10 font-bold text-brand-accent text-center text-xs';
      modeLiveBtn.className = 'p-3 rounded-lg border border-brand-border text-brand-muted hover:border-brand-accent/50 font-medium text-center text-xs';
      apiKeyInputWrapper.classList.add('hidden');
    } else {
      modeLiveBtn.className = 'p-3 rounded-lg border-2 border-brand-accent bg-brand-accent/10 font-bold text-brand-accent text-center text-xs';
      modeDemoBtn.className = 'p-3 rounded-lg border border-brand-border text-brand-muted hover:border-brand-accent/50 font-medium text-center text-xs';
      apiKeyInputWrapper.classList.remove('hidden');
    }
  }

  function updateApiUI() {
    geminiApiKeyInput.value = savedApiKey;
    if (currentMode === 'live' && savedApiKey) {
      apiStatusText.textContent = '⚡ Gemini AI 連線中';
    } else {
      currentMode = 'demo';
      apiStatusText.textContent = '體驗模式 (免金鑰)';
    }
    updateApiModalButtons();
  }

  // 11. 智慧備援庫 (Offline Mock Engine)
  function generateMockReply(userLetter, sender, persona, tags) {
    const isAcademic = tags.includes('期中/學業崩潰') || userLetter.includes('期中') || userLetter.includes('考') || userLetter.includes('專題') || userLetter.includes('作業');
    const isOverthinking = tags.includes('焦慮內耗') || tags.includes('迷惘不知去向') || userLetter.includes('比不上') || userLetter.includes('未來');

    if (persona === 'chai') { // 毒舌阿柴
      if (isAcademic) {
        return {
          letter: `嗨 ${sender}，\n\n收到你的求救信了。你現在滿腦子只想著「完了要爆炸了」，然後就癱在椅子上刷手機內耗，我說得沒錯吧？\n\n聽好了：焦慮不是因為事情太多，而是因為你試圖在腦子裡一次把十件事做完！事情本來就是一件一件做完的，世界不會因為你期中報告少寫兩頁就天塌下來。就算真的塌了，也是大家一起考不好，你在那邊單機焦慮什麼呢？\n\n立刻把螢幕關掉五分鐘，喝口水，深呼吸。接著挑最簡單、最白痴的一小步去做，哪怕只是把檔案打開寫上標題都算。別再讓想像中的災難提前折磨你現在的人生了，動起來！`,
          quote: '你不是能力不夠，你只是把力氣都拿去跟想像中的怪獸打架了。',
          action: '把待辦清單砍掉一半，只挑今天最想踩下油門的那一件，做完就睡覺！'
        };
      } else {
        return {
          letter: `喲 ${sender}，\n\n看別人跑得快你就心慌了？人家發在社群上的光鮮亮麗，那是精裝版剪輯片；你看到的自己，是沒加濾鏡的幕後花絮，這拿來比什麼？\n\n迷惘是正常的，誰二十幾歲不迷惘？但坐在路邊感嘆「我怎麼走得比別人慢」完全解決不了問題。你現在需要的不是大刀闊斧的人生規劃，而是停止把自己當成世界的裁判。\n\n今天允許自己普通一天，吃頓好吃的，明天太陽照樣出來，你照樣能慢慢走自己的節奏。別再拿別人的尺丈量你的路了！`,
          quote: '別人跑馬拉松，你在自己的小花園散步，各走各的花期，急什麼？',
          action: '今晚十點後把手機開「請勿打擾」，不再看任何人的 IG 動態，放空一整晚。'
        };
      }
    } else if (persona === 'grandpa') { // 哲學爺爺
      return {
        letter: `致 遠道而來的 ${sender}：\n\n夜深了，雜貨店外的楓葉落了滿地，而你的這封信，帶著秋風微涼的嘆息來到我手邊。\n\n人生的長河裡，我們常常因為被眼前的礁石撞痛，就以為整條河流都是暗礁。其實水流之智，在於遇阻則緩、遇折則轉。你所經歷的迷惘與焦急，並不是你走錯了路，而是靈魂在提醒你：你需要放慢腳步，看清楚自己真正駐足的地方。\n\n古人說：「日拱一卒，功不唐捐。」不要總想著一步跨過整座山頭，今天只要走穩腳下這方寸泥土，你便已經在向著遠方靠近了。請安心歇息吧，黑夜的盡頭，朝陽自會如約而至。`,
        quote: '流水不爭先，爭的是滔滔不絕；凡是過往，皆為前序。',
        action: '找一個安靜的窗台靜坐五分鐘，看著夜空或微風，告訴自己：「一切都在過程之中。」'
      };
    } else { // 溫柔木木 (預設)
      return {
        letter: `親愛的 ${sender}：\n\n閱讀你的信時，我彷彿看見你疲憊卻依然在咬牙支撐的身影。我想先輕輕對你說一聲：辛苦了，真的辛苦了。\n\n你對未來的焦慮、對現狀的無力，都是因為你心裡有一顆很想把事情做好的心。這不是缺點，而是你溫柔而認真的證明。但請記得，你不是一台不知疲倦的機器，感到累了、想停下來大哭一場，完全是被允許的。\n\n不要怪自己走得慢，當種子深埋在泥土裡努力向下扎根時，地上的人也看不見它生長。給自己一點溫柔與耐心，好嗎？今晚就把所有的責任先暫存在信箱裡，我會替你保管好。`,
        quote: '你不需要總是那麼堅強，累了就先當一朵暫時縮起來的小花。',
        action: '為自己泡一杯熱牛奶或溫水，洗個熱水澡，抱一抱最喜歡的玩偶或枕頭入睡。'
      };
    }
  }

  // 12. 呼叫 Google Gemini API (即時模式)
  async function fetchFromGemini(letter, sender, persona, tags, apiKey) {
    const personaPrompts = {
      mumu: "你是一位名為「溫柔木木」的解憂雜貨店長。風格：溫暖治癒、非暴力溝通、深層共情、輕聲撫慰、給予毫無保留的安全感與接納。",
      chai: "你是一位名為「毒舌阿柴」的解憂雜貨店長。風格：嘴硬心軟、幽默毒舌、犀利吐槽內耗行為、講大白話打破焦慮、用幽默拉對方回現實、實則充滿義氣與關心。",
      grandpa: "你是一位名為「哲學爺爺」的解憂雜貨店長。風格：智者、語調蒼勁慈祥、擅長用大自然（水流、四季、林木）為隱喻、提供人生宏觀透徹視角、給人定海神針般的踏實平靜。"
    };

    const systemInstruction = `
${personaPrompts[persona] || personaPrompts.mumu}
來信者稱呼：${sender}
來信者目前心情標籤：${tags.join('、')}
來信內容：${letter}

請嚴格以 JSON 格式回覆，不要包含任何額外 markdown 外殼或標記，JSON 結構如下：
{
  "letter": "給對方的回信全文（約 200~300 字，段落清晰，保持你的鮮明角色口吻，有同理有實質啟發）",
  "quote": "一句精煉且直擊人心的金句（15~30 字，適合印在拍立得上）",
  "action": "一項今天馬上能做的簡單微行動或心靈處方任務（15~35 字）"
}
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [{ text: systemInstruction }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.8
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const resJson = await response.json();
    const rawText = resJson.candidates[0].content.parts[0].text;
    return JSON.parse(rawText);
  }

});
