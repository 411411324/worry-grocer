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

  // 語音朗讀與聲音設定元素
  const btnReadAloud = document.getElementById('btnReadAloud');
  const readAloudBtnText = document.getElementById('readAloudBtnText');
  const btnHeaderAudio = document.getElementById('btnHeaderAudio');
  const headerAudioText = document.getElementById('headerAudioText');
  const btnVoiceSettings = document.getElementById('btnVoiceSettings');
  const modalVoice = document.getElementById('modalVoice');
  const btnCloseVoice = document.getElementById('btnCloseVoice');
  const btnConfirmVoice = document.getElementById('btnConfirmVoice');
  const voiceSelect = document.getElementById('voiceSelect');
  const btnPreviewVoice = document.getElementById('btnPreviewVoice');
  const chkAmbientBgm = document.getElementById('chkAmbientBgm');
  const sliderSpeed = document.getElementById('sliderSpeed');
  const sliderPitch = document.getElementById('sliderPitch');
  const lblSpeed = document.getElementById('lblSpeed');
  const lblPitch = document.getElementById('lblPitch');
  let isSpeaking = false;
  let userSelectedVoiceURI = localStorage.getItem('wg_voice_uri') || '';

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

  // 4. 快速填入範例（支援多語系）
  btnFillDemo1.addEventListener('click', () => {
    const lang = localStorage.getItem('wg_lang') || 'zh';
    if (lang === 'en') {
      senderNameInput.value = 'Anxious Student';
      letterContentInput.value = 'Dear Shopkeeper:\nMidterm exams, term projects, and assignments are all crashing down this week. Every morning I wake up feeling overwhelmed. Even though I know I need to start, I end up paralyzed staring at my screen, wasting time in anxious loops. I am terrified of failing and letting everyone down... What should I do?';
      selectedTags = ['焦慮內耗', '期中/學業崩潰'];
    } else if (lang === 'ja') {
      senderNameInput.value = '不安な大学生';
      letterContentInput.value = '店長へ：\n最近、期末試験、專題課題、レポートが一度に押し寄せてきて、毎日息苦しいです。やらなきゃと分かっているのに、パソコンの前で呆然として時間だけが過ぎていきます。締め切りに間に合わないのではないか、失敗するのではないかと不安でたまりません...どうすればいいでしょうか？';
      selectedTags = ['焦慮內耗', '期中/學業崩潰'];
    } else {
      senderNameInput.value = '期中焦慮的同學';
      letterContentInput.value = '店長你好：\n最近期中考、專題跟作業全部堆在一起，每天一睜開眼就覺得好喘。明明知道該開始做，卻總是坐在電腦前發呆、焦慮內耗，覺得自己效率好低。好怕交不出來，也怕結果不如預期...我到底該怎麼辦？';
      selectedTags = ['焦慮內耗', '期中/學業崩潰'];
    }
    updateTagUI();
    charCount.textContent = letterContentInput.value.length;
  });

  btnFillDemo2.addEventListener('click', () => {
    const lang = localStorage.getItem('wg_lang') || 'zh';
    if (lang === 'en') {
      senderNameInput.value = 'Lost Wanderer';
      letterContentInput.value = 'Dear Shopkeeper:\nLooking at everyone around me, they seem to have clear goals—internships, awards, confidence. Meanwhile, I feel like I am stumbling in the dark with no direction. I don\'t know what I truly want, and comparing myself to others is tearing me apart...';
      selectedTags = ['迷惘不知去向', '深夜失眠'];
    } else if (lang === 'ja') {
      senderNameInput.value = '夜更かしの旅人';
      letterContentInput.value = '店長へ：\n周りの友人たちがどんどん目標を見つけてインターンや大会で活躍しているのを見て、自分だけが取り残されているような気がします。本当は何がしたいのかも分からず、人と比べては劣等感と将来への恐怖で眠れません...';
      selectedTags = ['迷惘不知去向', '深夜失眠'];
    } else {
      senderNameInput.value = '迷途的夜貓子';
      letterContentInput.value = '店長好：\n看著身邊的同學好像都很有目標，有人實習、有人比賽得獎，只有我好像每天都在混混噩噩。我不知道自己真正想做什麼，常常覺得自己比不上別人，越想越害怕自己的未來...';
      selectedTags = ['迷惘不知去向', '深夜失眠'];
    }
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
      const currentLang = localStorage.getItem('wg_lang') || 'zh';
      let replyData;
      if (currentMode === 'live' && savedApiKey) {
        replyData = await fetchFromGemini(text, sender, currentPersona, selectedTags, savedApiKey, currentLang);
      } else {
        // 體驗模式：模擬 1.5 秒翻信開箱儀式
        await new Promise(r => setTimeout(r, 1500));
        replyData = generateMockReply(text, sender, currentPersona, selectedTags, currentLang);
      }

      displayReply(replyData, sender);

      // 情緒危機轉介檢查 (Crisis Safeguard)
      const crisisKeywords = ['想不開', '想死', '自殺', '自殘', '結束生命', '活不下去', '不想活了', '好想消失', '輕生', '不想活'];
      const hasCrisis = crisisKeywords.some(kw => text.includes(kw));
      const crisisAlertCard = document.getElementById('crisisAlertCard');
      if (crisisAlertCard) {
        if (hasCrisis) {
          crisisAlertCard.classList.remove('hidden');
        } else {
          crisisAlertCard.classList.add('hidden');
        }
      }

      // 星空漂流瓶同步 (Galaxy Drift Bottle)
      const chkShareToGalaxy = document.getElementById('chkShareToGalaxy');
      if (chkShareToGalaxy && chkShareToGalaxy.checked) {
        addDriftBottle({
          author: sender,
          worry: text.substring(0, 85) + (text.length > 85 ? '...' : ''),
          quote: replyData.quote,
          tag: selectedTags[0] || '深夜心事',
          hugs: 1,
          teas: 0
        });
      }
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

    const currentLang = localStorage.getItem('wg_lang') || 'zh';

    replyDate.textContent = dateStr;
    if (currentLang === 'en') {
      replySalutation.textContent = `Dear ${sender},`;
    } else if (currentLang === 'ja') {
      replySalutation.textContent = `親愛なる ${sender} さんへ：`;
    } else {
      replySalutation.textContent = `親愛的 ${sender}：`;
    }

    replyBody.textContent = data.letter;
    replyMoodBadge.textContent = selectedTags.length > 0 ? selectedTags.join(' · ') : (currentLang === 'en' ? 'Emotional Diagnosis' : currentLang === 'ja' ? '感情の診断' : '當前心情診斷');

    // 人格署名（多語系適配）
    const signatures = {
      zh: {
        mumu: '—— 你的解憂店長 溫柔木木 筆 🌿',
        chai: '—— 嘴硬心軟的 毒舌阿柴 筆 ☕',
        grandpa: '—— 坐在庭院喝茶的 哲學爺爺 筆 📜'
      },
      en: {
        mumu: '— Your Shopkeeper, Gentle Mumu 🌿',
        chai: '— Witty Chai (Tough Love) ☕',
        grandpa: '— Philosopher Grandpa 📜'
      },
      ja: {
        mumu: '—— あなたの相談店長 優しいムームー より 🌿',
        chai: '—— 口は悪いが放っておけない 毒舌のチャイ より ☕',
        grandpa: '—— 縁側でお茶をすする 哲学のおじいさん より 📜'
      }
    };
    const sigDict = signatures[currentLang] || signatures.zh;
    replySignature.textContent = sigDict[currentPersona] || '—— 解憂雜貨店 筆';

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

  // 8.5 語音朗讀與治癒背景音樂功能 (Web Audio API & Web Speech API)
  class AmbientSoundtrack {
    constructor() {
      this.ctx = null;
      this.isPlaying = false;
      this.masterGain = null;
      this.timer = null;
      // 暖心大七和弦與五聲音階頻率 (Cmaj7, Am7, Fmaj7, G)
      this.chords = [
        [130.81, 196.00, 246.94, 329.63], // Cmaj7
        [110.00, 164.81, 220.00, 261.63], // Am7
        [87.31, 130.81, 174.61, 220.00],  // Fmaj7
        [98.00, 146.83, 196.00, 246.94]   // G
      ];
      this.chordIdx = 0;
    }
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
    }
    start() {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.isPlaying = true;
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 1.8);
      this.playNextChord();
    }
    playNextChord() {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = this.chords[this.chordIdx % this.chords.length];
      this.chordIdx++;

      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.032, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 5.0);
      });

      this.timer = setTimeout(() => this.playNextChord(), 4500);
    }
    stop() {
      this.isPlaying = false;
      if (this.timer) clearTimeout(this.timer);
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
      }
    }
  }

  const ambientSoundtrack = new AmbientSoundtrack();

  let availableVoices = [];
  function updateVoices() {
    if ('speechSynthesis' in window) {
      availableVoices = window.speechSynthesis.getVoices();
      populateVoiceSelect();
    }
  }

  function populateVoiceSelect() {
    if (!voiceSelect || availableVoices.length === 0) return;
    voiceSelect.innerHTML = '';

    // 優先挑選中文聲音，並標記特色
    const zhVoices = availableVoices.filter(v => 
      v.lang.toLowerCase().includes('zh') || 
      v.lang.toLowerCase().includes('cmn') ||
      v.lang.toLowerCase().includes('taiwan')
    );

    const otherVoices = availableVoices.filter(v => !zhVoices.includes(v));

    function formatVoiceName(v) {
      const name = v.name;
      if (name.includes('HsiaoChen') || name.includes('曉臻')) return `🌸 曉臻 (極致溫柔自然女聲 · 強烈推薦)`;
      if (name.includes('Xiaoxiao') || name.includes('曉曉')) return `🌸 曉曉 (溫暖親切女聲 · 推薦)`;
      if (name.includes('Yunjian') || name.includes('雲健')) return `📜 雲健 (沉穩說書長者男聲 · 推薦)`;
      if (name.includes('Yunxi') || name.includes('雲希')) return `☕ 雲希 (陽光少年男聲)`;
      if (name.includes('Yating') || name.includes('雅婷')) return `✨ 雅婷 (台灣自然女聲)`;
      if (name.includes('Zhiwei') || name.includes('志偉')) return `☕ 志偉 (台灣沉穩男聲)`;
      if (name.includes('Google') && name.includes('國語')) return `✨ Google 國語 (自然流暢)`;
      if (name.includes('Hanhan') || name.includes('涵涵')) return `涵涵 (Windows 預設桌上型語音)`;
      return `${v.name} (${v.lang})`;
    }

    // 加入中文選項
    zhVoices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = formatVoiceName(v);
      if (userSelectedVoiceURI && v.voiceURI === userSelectedVoiceURI) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });

    // 若有自選且未預選，預設選取最佳推薦聲音
    if (!voiceSelect.value && zhVoices.length > 0) {
      const best = zhVoices.find(v => v.name.includes('HsiaoChen') || v.name.includes('Xiaoxiao') || v.name.includes('Natural')) || zhVoices[0];
      if (best) voiceSelect.value = best.voiceURI;
    }
  }

  updateVoices();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }

  // 語音設定 Modal 事件監聽
  if (btnVoiceSettings) {
    btnVoiceSettings.addEventListener('click', () => {
      updateVoices();
      modalVoice.classList.remove('hidden');
    });
  }
  if (btnCloseVoice) {
    btnCloseVoice.addEventListener('click', () => modalVoice.classList.add('hidden'));
  }
  if (btnConfirmVoice) {
    btnConfirmVoice.addEventListener('click', () => {
      userSelectedVoiceURI = voiceSelect.value;
      localStorage.setItem('wg_voice_uri', userSelectedVoiceURI);
      modalVoice.classList.add('hidden');
    });
  }

  // 試聽按鈕
  if (btnPreviewVoice) {
    btnPreviewVoice.addEventListener('click', () => {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const testUtterance = new SpeechSynthesisUtterance('你好呀，這裡是解憂雜貨店。累了就歇會兒，今晚把心事交給我吧。');
      testUtterance.lang = 'zh-TW';
      testUtterance.rate = parseFloat(sliderSpeed.value) || 0.82;
      testUtterance.pitch = parseFloat(sliderPitch.value) || 0.95;

      const chosen = availableVoices.find(v => v.voiceURI === voiceSelect.value);
      if (chosen) testUtterance.voice = chosen;

      window.speechSynthesis.speak(testUtterance);
    });
  }

  // 滾動條即時數值反饋
  if (sliderSpeed && lblSpeed) {
    sliderSpeed.addEventListener('input', () => {
      lblSpeed.textContent = `${sliderSpeed.value}x (${sliderSpeed.value < 0.85 ? '慢條斯理' : '正常步調'})`;
    });
  }
  if (sliderPitch && lblPitch) {
    sliderPitch.addEventListener('input', () => {
      lblPitch.textContent = `${sliderPitch.value}x (${sliderPitch.value < 0.9 ? '低沉溫厚' : '溫潤舒緩'})`;
    });
  }

  function setSpeakingState(speaking) {
    isSpeaking = speaking;
    if (speaking) {
      readAloudBtnText.textContent = '⏹️ 停止朗讀';
      headerAudioText.textContent = '⏹️ 停止';
      btnReadAloud.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-300');
      btnReadAloud.classList.remove('bg-amber-50', 'text-brand-accent');
      btnHeaderAudio.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-300');
      btnHeaderAudio.classList.remove('bg-amber-50', 'text-brand-accent');
    } else {
      readAloudBtnText.textContent = '語音朗讀回信';
      headerAudioText.textContent = '聽店長讀信';
      btnReadAloud.classList.remove('bg-rose-50', 'text-rose-600', 'border-rose-300');
      btnReadAloud.classList.add('bg-amber-50', 'text-brand-accent');
      btnHeaderAudio.classList.remove('bg-rose-50', 'text-rose-600', 'border-rose-300');
      btnHeaderAudio.classList.add('bg-amber-50', 'text-brand-accent');
    }
  }

  function toggleSpeech() {
    if (!('speechSynthesis' in window)) {
      alert('抱歉，您的瀏覽器暫時不支援語音合成功能，建議使用 Chrome 或 Edge 開啟！');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      ambientSoundtrack.stop();
      setSpeakingState(false);
      return;
    }

    // 處理文字，加入自然「呼吸停頓感」
    function makeGentleText(raw) {
      return raw
        .replace(/[!！]/g, '。')
        .replace(/：/g, '…… ')
        .replace(/，/g, '， ')
        .replace(/。/g, '。…… ')
        .replace(/\n+/g, ' ……\n');
    }

    const salutation = makeGentleText(replySalutation.textContent);
    const body = makeGentleText(replyBody.textContent);
    const signature = makeGentleText(replySignature.textContent);
    const quote = makeGentleText(`今日心靈處方：${cardQuote.textContent}`);
    const action = makeGentleText(`今日微任務：${cardAction.textContent}`);

    const readText = `${salutation}\n${body}\n${signature}\n${quote}\n${action}`;
    const utterance = new SpeechSynthesisUtterance(readText);

    const currentLang = localStorage.getItem('wg_lang') || 'zh';
    if (currentLang === 'en') {
      utterance.lang = 'en-US';
    } else if (currentLang === 'ja') {
      utterance.lang = 'ja-JP';
    } else {
      utterance.lang = 'zh-TW';
    }

    // 取得自選或滑桿數值
    const customRate = sliderSpeed ? parseFloat(sliderSpeed.value) : 0.82;
    const customPitch = sliderPitch ? parseFloat(sliderPitch.value) : 0.95;

    if (currentPersona === 'chai') {
      utterance.rate = customRate * 1.25;
      utterance.pitch = customPitch * 1.05;
    } else if (currentPersona === 'grandpa') {
      utterance.rate = customRate * 0.92;
      utterance.pitch = customPitch * 0.80;
    } else {
      utterance.rate = customRate;
      utterance.pitch = customPitch;
    }

    // 優先套用使用者指定或最佳聲音
    let chosenVoice = null;
    if (userSelectedVoiceURI) {
      chosenVoice = availableVoices.find(v => v.voiceURI === userSelectedVoiceURI);
    }

    if (!chosenVoice) {
      if (currentLang === 'en') {
        const enVoices = availableVoices.filter(v => v.lang.toLowerCase().includes('en'));
        if (enVoices.length > 0) {
          if (currentPersona === 'grandpa') {
            chosenVoice = enVoices.find(v => v.name.includes('Guy') || v.name.includes('David') || v.name.includes('Natural')) || enVoices[0];
          } else {
            chosenVoice = enVoices.find(v => v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Zira') || v.name.includes('Google')) || enVoices[0];
          }
        }
      } else if (currentLang === 'ja') {
        const jaVoices = availableVoices.filter(v => v.lang.toLowerCase().includes('ja'));
        if (jaVoices.length > 0) {
          if (currentPersona === 'grandpa') {
            chosenVoice = jaVoices.find(v => v.name.includes('Keita') || v.name.includes('Ichiro')) || jaVoices[0];
          } else {
            chosenVoice = jaVoices.find(v => v.name.includes('Nanami') || v.name.includes('Aoi') || v.name.includes('Google')) || jaVoices[0];
          }
        }
      } else {
        const zhVoices = availableVoices.filter(v => 
          v.lang.toLowerCase().includes('zh') || 
          v.lang.toLowerCase().includes('cmn') ||
          v.lang.toLowerCase().includes('taiwan')
        );
        if (zhVoices.length > 0) {
          if (currentPersona === 'grandpa') {
            chosenVoice = zhVoices.find(v => {
              const n = v.name.toLowerCase();
              return n.includes('yunjian') || n.includes('yunxi') || n.includes('zhiwei') || n.includes('male');
            }) || zhVoices[0];
          } else {
            chosenVoice = zhVoices.find(v => {
              const n = v.name.toLowerCase();
              return n.includes('hsiaochen') || n.includes('xiaoxiao') || n.includes('natural') || n.includes('neural');
            }) || zhVoices.find(v => v.name.includes('Google') || v.lang.includes('TW')) || zhVoices[0];
          }
        }
      }
    }

    if (chosenVoice) utterance.voice = chosenVoice;

    utterance.onstart = () => {
      setSpeakingState(true);
      if (chkAmbientBgm && chkAmbientBgm.checked) {
        ambientSoundtrack.start();
      }
    };
    utterance.onend = () => {
      setSpeakingState(false);
      ambientSoundtrack.stop();
    };
    utterance.onerror = () => {
      setSpeakingState(false);
      ambientSoundtrack.stop();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  if (btnReadAloud) btnReadAloud.addEventListener('click', toggleSpeech);
  if (btnHeaderAudio) btnHeaderAudio.addEventListener('click', toggleSpeech);

  // 9. 再寫一封信
  btnWriteAgain.addEventListener('click', () => {
    resetToHome();
  });

  window.resetToHome = function() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingState(false);
    }
    ambientSoundtrack.stop();
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

  // 11. 智慧備援庫 (Offline Mock Engine - 支援中、英、日三語)
  function generateMockReply(userLetter, sender, persona, tags, lang = 'zh') {
    const isAcademic = tags.includes('期中/學業崩潰') || userLetter.includes('期中') || userLetter.includes('考') || userLetter.includes('專題') || userLetter.includes('作業') || userLetter.toLowerCase().includes('midterm') || userLetter.toLowerCase().includes('exam') || userLetter.includes('試験') || userLetter.includes('課題');

    // 英文版回信庫
    if (lang === 'en') {
      if (persona === 'chai') {
        return {
          letter: `Hey ${sender},\n\nGot your SOS letter. Right now your brain is screaming "everything is falling apart," and you're frozen in your chair doom-scrolling, am I right?\n\nListen closely: Anxiety doesn't happen because you have too much work; it happens because you're trying to solve twenty things in your head all at once! The world isn’t going to end because your term paper isn’t absolute perfection. Everyone feels behind; you're not alone in the chaos.\n\nClose your laptop for five minutes. Drink a full glass of water. Take one tiny, stupidly simple step—even if it's just opening a blank doc and writing the title. Stop letting imaginary disasters ruin your present life. Get moving!`,
          quote: "You're not incapable; you're just exhausted from fighting imaginary monsters.",
          action: "Cut your to-do list in half. Pick the single smallest task, finish it, and go to bed!"
        };
      } else if (persona === 'grandpa') {
        return {
          letter: `To dear ${sender},\n\nThe night is deep, and autumn leaves dance in the quiet wind outside our general store as your letter finds its way to my hands.\n\nIn the grand river of life, we often scrape against a single jagged stone and mistakenly believe the entire voyage is shipwrecked. But water overcomes obstacles by flowing around them with patient grace, not by brute resistance. The confusion you feel right now is not proof that you are lost; it is your soul gently reminding you to slow down and observe where you truly stand.\n\nWater does not compete to reach the end first; it seeks to flow endlessly. Rest your weary heart tonight. Dawn never fails to break.`,
          quote: "Water yields to stone yet carves mountains. What lies behind you is merely prologue.",
          action: "Stand quietly by the window for three minutes, gaze into the quiet night, and remember: everything is a process."
        };
      } else {
        return {
          letter: `Dear ${sender},\n\nReading your words, I can see you standing there, utterly exhausted yet bravely trying to hold everything together. First, let me softly whisper to you: You have worked so hard. Truly, thank you for hanging in there.\n\nYour anxiety about the future only proves how deeply you yearn to live a sincere, meaningful life. That is never a weakness—it is the gentlest proof of your integrity. But remember, you are a human being, not a perpetual-motion machine. It is completely okay to feel weary and to pause.\n\nWhen a seed grows its roots deep into the dark earth, nobody above sees its struggle. Trust your own season. Leave your heavy burdens in this mailbox tonight; I will watch over them for you.`,
          quote: "You don't have to be strong all the time. Rest tonight, and let tomorrow unfold on its own.",
          action: "Brew a cup of warm tea or hot cocoa, take a warm shower, and wrap yourself in your favorite blanket to sleep."
        };
      }
    }

    // 日文版回信庫
    if (lang === 'ja') {
      if (persona === 'chai') {
        return {
          letter: `よお、${sender}。\n\nSOSの手紙、しかと受け取ったぜ。今お前の頭の中は「もう全部終わりだ」でパンクして、スマホを眺めながら一人で無限ループにハマってるんだろ？図星だろ？\n\nいいか、よく聞きな。焦りや不安が湧くのは課題が多いからじゃない。頭の中で全部一度に片付けようとしてるからだ！期末レポートが数ページ足りなかろうが、空が落ちてくるわけじゃない。みんな同じように必死なんだから、一人で悲劇の主人公ぶるな！\n\n今すぐPCの画面を閉じて、冷たい水を一杯飲め。タイトル一行書くだけでも大前進だ。頭の中の妄想怪獣と戦うのはやめて、とっとと寝ちまえ！`,
          quote: "お前は無能なんじゃない。妄想のお化けと戦ってHPを削ってるだけだ。",
          action: "やることリストを半分削れ！今日一番ラクなタスクを一つだけ済ませて、すぐ寝ろ！"
        };
      } else if (persona === 'grandpa') {
        return {
          letter: `遥かな旅路を歩む ${sender} さんへ。\n\n夜も更け、雑貨店の庭先では落ち葉が静かに舞っております。あなたの溜息が、秋風に乗ってわしの手元へと届きました。\n\n人生という長い川の流れにおいて、目の前の岩にぶつかったからといって、川全体が暗礁に閉ざされているわけではありません。水は岩に遭えば緩やかに迂回し、やがて海へと注ぎます。今あなたが感じている迷いや焦りは、道を見失ったのではなく、「少し歩みを緩めなさい」という魂からの合図なのです。\n\n水は先を争わず、ただ途切れずに流れることを競うもの。今夜は心を落ち着かせ、安らかにお眠りなさい。夜の向こうには、必ず朝陽が待っております。`,
          quote: "流水は先を争わず、ただ滔々と流れるのみ。焦る必要はありません。",
          action: "静かな窓辺に立ち、夜空を見上げながら深呼吸を三度。「すべては道半ば」と自分に優しく語りかけてください。"
        };
      } else {
        return {
          letter: `親愛なる ${sender} さんへ。\n\nお手紙を読みながら、重い荷物を抱えて必死に踏ん張ってきたあなたの姿が目に浮かびました。まずはそっと伝えさせてください。「本当に、今日までよく頑張りましたね」。\n\n未来への不安や焦りは、あなたが自分の人生を何よりも大切にしたいと願っている温かい証拠です。決して弱さなんかではありませんよ。でもね、あなたは休みなく動き続ける機械ではありません。疲れて立ち止まり、泣きたくなる夜があってもいいのです。\n\n種が土の中でじっと根を伸ばしている時、地上からはその成長が見えないもの。自分のペースをどうか信じてあげてください。今夜はすべての荷物をこのポストに預けて、ゆっくり休んでくださいね。`,
          quote: "いつも強くある必要はありません。今夜はそっと、花びらを閉じるように休んでいいのです。",
          action: "温かいミルクかハーブティーを淹れて、一番お気に入りの毛布にくるまって目を閉じましょう。"
        };
      }
    }

    // 繁體中文版回信庫 (預設)
    if (persona === 'chai') {
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
    } else if (persona === 'grandpa') {
      return {
        letter: `致 遠道而來的 ${sender}：\n\n夜深了，雜貨店外的楓葉落了滿地，而你的這封信，帶著秋風微涼的嘆息來到我手邊。\n\n人生的長河裡，我們常常因為被眼前的礁石撞痛，就以為整條河流都是暗礁。其實水流之智，在於遇阻則緩、遇折則轉。你所經歷的迷惘與焦急，並不是你走錯了路，而是靈魂在提醒你：你需要放慢腳步，看清楚自己真正駐足的地方。\n\n古人說：「日拱一卒，功不唐捐。」不要總想著一步跨過整座山頭，今天只要走穩腳下這方寸泥土，你便已經在向著遠方靠近了。請安心歇息吧，黑夜的盡頭，朝陽自會如約而至。`,
        quote: '流水不爭先，爭的是滔滔不絕；凡是過往，皆為前序。',
        action: '找一個安靜的窗台靜坐五分鐘，看著夜空或微風，告訴自己：「一切都在過程之中。」'
      };
    } else {
      return {
        letter: `親愛的 ${sender}：\n\n閱讀你的信時，我彷彿看見你疲憊卻依然在咬牙支撐的身影。我想先輕輕對你說一聲：辛苦了，真的辛苦了。\n\n你對未來的焦慮、對現狀的無力，都是因為你心裡有一顆很想把事情做好的心。這不是缺點，而是你溫柔而認真的證明。但請記得，你不是一台不知疲倦的機器，感到累了、想停下來大哭一場，完全是被允許的。\n\n不要怪自己走得慢，當種子深埋在泥土裡努力向下扎根時，地上的人也看不見它生長。給自己一點溫柔與耐心，好嗎？今晚就把所有的責任先暫存在信箱裡，我會替你保管好。`,
        quote: '你不需要總是那麼堅強，累了就先當一朵暫時縮起來的小花。',
        action: '為自己泡一杯熱牛奶或溫水，洗個熱水澡，抱一抱最喜歡的玩偶或枕頭入睡。'
      };
    }
  }

  // 12. 呼叫 Google Gemini API (即時模式 - 支援多語系)
  async function fetchFromGemini(letter, sender, persona, tags, apiKey, lang = 'zh') {
    const langNames = { zh: "繁體中文 (Traditional Chinese)", en: "English", ja: "日本語 (Japanese)" };
    const targetLang = langNames[lang] || langNames.zh;

    const personaPrompts = {
      zh: {
        mumu: "你是一位名為「溫柔木木」的解憂雜貨店長。風格：溫暖治癒、非暴力溝通、深層共情、輕聲撫慰、給予毫無保留的安全感與接納。",
        chai: "你是一位名為「毒舌阿柴」的解憂雜貨店長。風格：嘴硬心軟、幽默毒舌、犀利吐槽內耗行為、講大白話打破焦慮、用幽默拉對方回現實、實則充滿義氣與關心。",
        grandpa: "你是一位名為「哲學爺爺」的解憂雜貨店長。風格：智者、語調蒼勁慈祥、擅長用大自然（水流、四季、林木）為隱喻、提供人生宏觀透徹視角、給人定海神針般的踏實平靜。"
      },
      en: {
        mumu: "You are 'Gentle Mumu', the shopkeeper of Worry Grocer. Style: Deep empathy, warm, comforting, nonviolent communication, unconditional acceptance.",
        chai: "You are 'Witty Chai', the shopkeeper of Worry Grocer. Style: Tough love, witty, candidly cutting through overthinking and paralysis with humor, deeply loyal.",
        grandpa: "You are 'Philosopher Grandpa', the wise elder of Worry Grocer. Style: Stoic, poetic metaphors from nature and time, giving profound peace and perspective."
      },
      ja: {
        mumu: "あなたはナミヤ解憂雑貨店の店長「優しいムームー」です。スタイル：深い共感、温かい癒やし、非暴力コミュニケーション、無条件の受容。",
        chai: "あなたはナミヤ解憂雑貨店の店長「毒舌のチャイ」です。スタイル：口は悪いが愛情深く、ユーモアを交えてクヨクヨ悩む背中をガツンと押す、義理人情に厚い相棒。",
        grandpa: "あなたはナミヤ解憂雑貨店の店長「哲学のおじいさん」です。スタイル：穏やかな長者、自然や川、季節の巡りを比喩にした深い知恵、安心感を与える言葉。"
      }
    };

    const pDict = personaPrompts[lang] || personaPrompts.zh;
    const systemInstruction = `
${pDict[persona] || pDict.mumu}
Target Language: ${targetLang}
Letter Sender Name: ${sender}
Sender Mood Tags: ${tags.join(', ')}
User Letter: ${letter}

Important: Write the response entirely in ${targetLang}.
Strictly return a valid JSON object without markdown fences, with this structure:
{
  "letter": "Full letter reply (approx 150-250 words, rich, distinct persona tone, empathetic and inspiring)",
  "quote": "One punchy, unforgettable healing quote (1-2 sentences, suitable for a polaroid card)",
  "action": "One simple, immediate micro-action or comfort prescription for today (1 sentence)"
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

  // ==========================================
  // 13. 漂流星空共鳴池 (Galaxy Drift Bottle)
  // ==========================================
  const btnGalaxy = document.getElementById('btnGalaxy');
  const modalGalaxy = document.getElementById('modalGalaxy');
  const btnCloseGalaxy = document.getElementById('btnCloseGalaxy');
  const bottleStarsContainer = document.getElementById('bottleStarsContainer');
  const galaxyLetterCard = document.getElementById('galaxyLetterCard');
  const btnCloseLetterCard = document.getElementById('btnCloseLetterCard');
  const starAuthor = document.getElementById('starAuthor');
  const starTag = document.getElementById('starTag');
  const starWorry = document.getElementById('starWorry');
  const starQuote = document.getElementById('starQuote');
  const btnSendHug = document.getElementById('btnSendHug');
  const btnSendTea = document.getElementById('btnSendTea');
  const hugCount = document.getElementById('hugCount');
  const teaCount = document.getElementById('teaCount');

  let activeStarBottle = null;

  const defaultBottles = [
    {
      id: 'b1',
      author: '期中焦慮的大一生',
      worry: '期中考、專題、報告全擠在這一週，每天都覺得進度追不上，好想把頭埋進被子裡逃避世界...',
      quote: '你不是能力不夠，你只是把力氣都拿去跟想像中的怪獸打架了。',
      tag: '期中/學業崩潰',
      hugs: 142,
      teas: 88,
      x: 18,
      y: 28
    },
    {
      id: 'b2',
      author: '初入職場的迷茫菜鳥',
      worry: '看身邊的人好像都適應得很好，只有我每天都在出包，不知道自己到底適合什麼...',
      quote: '別人跑馬拉松，你在自己的小花園散步，各走各的花期，急什麼？',
      tag: '迷惘不知去向',
      hugs: 209,
      teas: 135,
      x: 72,
      y: 35
    },
    {
      id: 'b3',
      author: '深夜失眠的夜貓子',
      worry: '一關燈過去的遺憾和對未來的恐懼就湧上來，翻來覆去到天亮，真的好累...',
      quote: '累了就先躺平一會兒，世界不會因為你休息一晚就停止運轉。',
      tag: '深夜失眠',
      hugs: 326,
      teas: 194,
      x: 42,
      y: 62
    },
    {
      id: 'b4',
      author: '人際心累的小企鵝',
      worry: '總是在迎合別人、怕被討厭，最後發現自己變得好陌生，心好空虛。',
      quote: '你不需要總是那麼懂事，討好全世界之前，請先抱抱你自己。',
      tag: '人際心累',
      hugs: 185,
      teas: 110,
      x: 82,
      y: 72
    }
  ];

  let galaxyBottles = JSON.parse(localStorage.getItem('wg_galaxy_bottles')) || defaultBottles;

  function addDriftBottle(bottle) {
    bottle.id = 'b_' + Date.now();
    bottle.x = Math.floor(15 + Math.random() * 70);
    bottle.y = Math.floor(20 + Math.random() * 55);
    galaxyBottles.unshift(bottle);
    if (galaxyBottles.length > 20) galaxyBottles.pop();
    localStorage.setItem('wg_galaxy_bottles', JSON.stringify(galaxyBottles));
  }

  function renderGalaxyStars() {
    if (!bottleStarsContainer) return;
    bottleStarsContainer.innerHTML = '';

    galaxyBottles.forEach(bottle => {
      const starEl = document.createElement('div');
      starEl.className = 'absolute cursor-pointer flex flex-col items-center group transition-all duration-300 hover:scale-125 z-10';
      starEl.style.left = `${bottle.x}%`;
      starEl.style.top = `${bottle.y}%`;

      starEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-amber-400/25 border border-amber-300/80 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-pulse">
          ⭐
        </div>
        <span class="text-[10px] text-amber-200 mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 px-2 py-0.5 rounded-full border border-slate-700 whitespace-nowrap shadow-md pointer-events-none">
          ${bottle.author}
        </span>
      `;

      starEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openBottleCard(bottle);
      });

      bottleStarsContainer.appendChild(starEl);
    });
  }

  function openBottleCard(bottle) {
    activeStarBottle = bottle;
    starAuthor.textContent = `來自：${bottle.author}`;
    starTag.textContent = bottle.tag;
    starWorry.textContent = bottle.worry;
    starQuote.textContent = `「${bottle.quote}」`;
    hugCount.textContent = bottle.hugs;
    teaCount.textContent = bottle.teas;
    galaxyLetterCard.classList.remove('hidden');
  }

  if (btnGalaxy) {
    btnGalaxy.addEventListener('click', () => {
      renderGalaxyStars();
      modalGalaxy.classList.remove('hidden');
    });
  }
  if (btnCloseGalaxy) {
    btnCloseGalaxy.addEventListener('click', () => {
      modalGalaxy.classList.add('hidden');
      if (galaxyLetterCard) galaxyLetterCard.classList.add('hidden');
    });
  }
  if (btnCloseLetterCard) {
    btnCloseLetterCard.addEventListener('click', () => {
      galaxyLetterCard.classList.add('hidden');
    });
  }

  if (btnSendHug) {
    btnSendHug.addEventListener('click', () => {
      if (activeStarBottle) {
        activeStarBottle.hugs++;
        hugCount.textContent = activeStarBottle.hugs;
        localStorage.setItem('wg_galaxy_bottles', JSON.stringify(galaxyBottles));
        if (window.confetti) {
          confetti({ particleCount: 25, spread: 50, origin: { y: 0.8 }, colors: ['#f43f5e', '#fb7185', '#ffe4e6'] });
        }
      }
    });
  }

  if (btnSendTea) {
    btnSendTea.addEventListener('click', () => {
      if (activeStarBottle) {
        activeStarBottle.teas++;
        teaCount.textContent = activeStarBottle.teas;
        localStorage.setItem('wg_galaxy_bottles', JSON.stringify(galaxyBottles));
        if (window.confetti) {
          confetti({ particleCount: 25, spread: 50, origin: { y: 0.8 }, colors: ['#10b981', '#34d399', '#a7f3d0'] });
        }
      }
    });
  }

  // ==========================================
  // 14. 多語系支援 (i18n: 繁中 / English / 日本語)
  // ==========================================
  const langSelect = document.getElementById('langSelect');
  const i18nData = {
    zh: {
      site_title: '解憂雜貨店',
      site_sub: '把你的煩惱投進信箱，明天太陽依舊升起',
      nav_galaxy: '漂流星空',
      nav_about: '關於本站',
      header_tag: 'AI 情感陪伴與樹洞共創',
      main_title: '今夜，你有什麼心事想投遞嗎？',
      main_desc: '每一封信都會被認真閱讀。挑選一位你今天最想傾訴的店長，把心裡的重量放下吧。',
      step1_title: '選擇今天為你解憂的店長',
      mumu_name: '溫柔木木',
      mumu_tag: '治癒暖心系',
      mumu_desc: '「沒關係的，你已經很努力了。喝杯熱茶，我在這裡溫柔守候你的脆弱。」',
      chai_name: '毒舌阿柴',
      chai_tag: '幽默吐槽系',
      chai_desc: '「天不會塌下來，塌了也是高個頂著。別再半夜內耗了，快給我醒醒！」',
      grandpa_name: '哲學爺爺',
      grandpa_tag: '生活洞察系',
      grandpa_desc: '「葉落自逢秋，水流終歸海。眼前的困局，只是人生畫卷的一抹筆觸。」',
      step2_title: '標記你此刻的心情頻率（可複選）',
      tag_anxiety: '🌪️ 焦慮內耗',
      tag_exam: '📚 期中期末崩潰',
      tag_lost: '🧭 迷惘不知方向',
      tag_social: '👥 人際心累',
      tag_insomnia: '🌙 深夜失眠',
      tag_wake: '⚡ 想被罵醒',
      tag_fruitless: '🌧️ 努力卻沒結果',
      step3_title: '親筆寫下你的心事',
      demo_label: '靈感範例：',
      demo1_btn: '期中專題好焦慮',
      demo2_btn: '覺得比不上別人',
      sender_prompt: '你希望店長怎麼稱呼你？',
      sender_placeholder: '例：熬夜的大學生、迷路的旅人',
      letter_placeholder: '親愛的店長：\n最近常常覺得事情好多、時間好少，不知道自己到底走在對的路上嗎？...',
      chk_galaxy_label: '✨ 同步匿名投遞到「漂流星空」（去識別化，讓這份溫暖照亮其他夜行者）',
      send_btn: '封信投遞到解憂信箱',
      send_tip: '投遞後，店長將親自閱信並開立今日心靈處方箋',
      sending_title: '信件正在穿過夜色送往雜貨店...',
      sending_quote: '店長正在點燃油燈、戴上眼鏡閱讀你的信箋',
      reply_title: '解憂雜貨店 來信回覆',
      stamp_postmark: 'Worry Grocer · 回信投遞',
      diagnosis_label: '心情診斷：',
      polaroid_title: '你的專屬心靈處方拍立得（可下載保存）',
      polaroid_sub: '分享到社群或留給自己',
      quote_label: '今日解憂金句',
      action_label: '今日微處方任務：',
      to_label: '給：',
      stamp_blend: '解憂特調',
      read_aloud: '語音朗讀回信',
      voice_settings: '聲線與音樂',
      download_card: '下載拍立得處方箋 (PNG)',
      copy_reply: '複製回信全文',
      write_again: '再寫一封心事',
      default_sender: '夜行的小狐狸'
    },
    en: {
      site_title: 'Worry Grocer',
      site_sub: 'Cast your worries into the mailbox; tomorrow the sun still rises.',
      nav_galaxy: 'Drift Galaxy',
      nav_about: 'About',
      header_tag: 'AI Emotional Companion & Treehole',
      main_title: 'What is weighing on your mind tonight?',
      main_desc: 'Every letter will be carefully read. Pick your preferred shopkeeper and unload the heaviness in your heart.',
      step1_title: '1. Choose your Shopkeeper (Penpal Persona)',
      mumu_name: 'Gentle Mumu',
      mumu_tag: 'Healing & Empathetic',
      mumu_desc: '“It’s okay, you’ve done your best. Have a cup of tea, I am here to gently hold your vulnerability.”',
      chai_name: 'Witty Chai',
      chai_tag: 'Tough Love & Humor',
      chai_desc: '“The sky won’t fall, and even if it does, taller people will hold it. Stop overthinking at 2 AM, wake up!”',
      grandpa_name: 'Philosopher Grandpa',
      grandpa_tag: 'Life Wisdom & Stoic',
      grandpa_desc: '“Leaves fall when autumn arrives; rivers ultimately reach the ocean. Today’s dilemma is merely a brushstroke in your life’s painting.”',
      step2_title: '2. Tag your emotional frequency (Multi-select)',
      tag_anxiety: '🌪️ Anxiety & Spiraling',
      tag_exam: '📚 Midterm / Academic Crisis',
      tag_lost: '🧭 Lost & Unsure of Direction',
      tag_social: '👥 Social & People Exhaustion',
      tag_insomnia: '🌙 Late-Night Insomnia',
      tag_wake: '⚡ Need a Reality Check',
      tag_fruitless: '🌧️ Hard Work with No Result',
      step3_title: '3. Write your letter from the heart',
      demo_label: 'Quick Inspirations:',
      demo1_btn: 'Midterm Anxiety',
      demo2_btn: 'Feeling Behind',
      sender_prompt: 'How should the shopkeeper address you?',
      sender_placeholder: 'e.g. Sleepless Wanderer, Midnight Student',
      letter_placeholder: 'Dear Shopkeeper:\nLately I feel overwhelmed by so many responsibilities, wondering if I am even on the right path in life...',
      chk_galaxy_label: '✨ Anonymously share to Drift Galaxy (help brighten other wanderers\' nights)',
      send_btn: 'Post Letter to Mailbox',
      send_tip: 'Upon delivery, the shopkeeper will read your letter and issue your daily prescription.',
      sending_title: 'Your letter is flying through the night sky to the grocer...',
      sending_quote: 'The shopkeeper is lighting the oil lamp, putting on glasses to read your note',
      reply_title: 'Worry Grocer Letter Reply',
      stamp_postmark: 'Worry Grocer · Delivered',
      diagnosis_label: 'Emotional Diagnosis:',
      polaroid_title: 'Your Exclusive Polaroid Rx Card (Downloadable)',
      polaroid_sub: 'Share on social media or keep for yourself',
      quote_label: 'Daily Healing Quote',
      action_label: 'Today’s Micro-Action:',
      to_label: 'To:',
      stamp_blend: 'Grocer Blend',
      read_aloud: 'Listen to Letter',
      voice_settings: 'Voice & BGM',
      download_card: 'Download Polaroid Rx (PNG)',
      copy_reply: 'Copy Full Letter',
      write_again: 'Write Another Letter',
      default_sender: 'Sleepless Wanderer'
    },
    ja: {
      site_title: 'ナミヤ解憂雑貨店',
      site_sub: '悩みをポストに投函すれば、明日はきっと太陽が昇る。',
      nav_galaxy: '星空ボトル',
      nav_about: '理念について',
      header_tag: 'AIこころの拠り所・手紙の対話',
      main_title: '今夜、ポストに預けたい悩みはありますか？',
      main_desc: '届いた手紙はすべて大切に読まれます。今日話したい店長を選んで、心の荷物をそっと降ろしてみましょう。',
      step1_title: '1. 今日の相談店長（ペンパル）を選ぶ',
      mumu_name: '優しいムームー',
      mumu_tag: '癒し・共感系',
      mumu_desc: '「大丈夫、あなたはもう十分に頑張っています。温かいお茶を飲んで、ここで心を休めてくださいね。」',
      chai_name: '毒舌のチャイ',
      chai_tag: 'ユーモア・喝入れ系',
      chai_desc: '「空が落ちてくるわけじゃないし、落ちても背の高い奴が支えるさ。真夜中にくよくよ悩むのはやめて、目を覚ましな！」',
      grandpa_name: '哲学のおじいさん',
      grandpa_tag: '人生洞察系',
      grandpa_desc: '「葉は秋に落ち、水は海に帰る。今の苦しみも、長い人生の絵巻のひと筆に過ぎません。」',
      step2_title: '2. 今の感情の周波数をチェック（複数可）',
      tag_anxiety: '🌪️ 不安・考えすぎ',
      tag_exam: '📚 期末・学業崩壊',
      tag_lost: '🧭 進路の迷い・虚無感',
      tag_social: '👥 人間関係の疲れ',
      tag_insomnia: '🌙 深夜の不眠',
      tag_wake: '⚡ 喝を入れてほしい',
      tag_fruitless: '🌧️ 報われない努力',
      step3_title: '3. あなたの悩みを手紙に綴る',
      demo_label: '記入例：',
      demo1_btn: '期末課題の不安',
      demo2_btn: '他人との比較',
      sender_prompt: '店長に何とお呼びしましょうか？',
      sender_placeholder: '例：夜更かしの旅人、迷える学生',
      letter_placeholder: '親愛なる店長へ：\n最近、やることが多すぎて息苦しく、自分は正しい道を進んでいるのか分からなくなりました...',
      chk_galaxy_label: '✨ 匿名の「星空ボトル」にも届ける（他の旅人の夜をそっと照らします）',
      send_btn: 'ポストに投函する',
      send_tip: '投函後、店長が手紙を読み、今日の処方箋をお届けします',
      sending_title: '夜空を渡り、手紙が雑貨店へ届けられています...',
      sending_quote: '店長がランプを灯し、眼鏡をかけてあなたの手紙を読んでいます...',
      reply_title: 'ナミヤ解憂雑貨店 返信のお届け',
      stamp_postmark: 'Worry Grocer · 配達完了',
      diagnosis_label: '心情の診断：',
      polaroid_title: '今日のこころの処方箋ポラロイド（画像保存可能）',
      polaroid_sub: 'SNSでシェア・大切にお手元に保存',
      quote_label: '今日の処方ことば',
      action_label: '今日の小さな処方箋：',
      to_label: '宛先：',
      stamp_blend: '厳選処方',
      read_aloud: '店長の朗読を聴く',
      voice_settings: '声と音楽設定',
      download_card: 'ポラロイド処方箋を保存 (PNG)',
      copy_reply: '手紙をコピー',
      write_again: 'もう一通書く',
      default_sender: '夜更かしのキツネ'
    }
  };

  function updateLanguage(lang) {
    const dict = i18nData[lang] || i18nData.zh;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    if (senderNameInput) {
      if (['夜行的小狐狸', 'Sleepless Wanderer', '夜更かしのキツネ'].includes(senderNameInput.value)) {
        senderNameInput.value = dict.default_sender;
      }
      senderNameInput.placeholder = dict.sender_placeholder;
    }
    if (letterContentInput) {
      letterContentInput.placeholder = dict.letter_placeholder;
    }

    localStorage.setItem('wg_lang', lang);
    updateVoices();
  }

  if (langSelect) {
    const savedLang = localStorage.getItem('wg_lang') || 'zh';
    langSelect.value = savedLang;
    langSelect.addEventListener('change', () => {
      updateLanguage(langSelect.value);
    });
    if (savedLang !== 'zh') updateLanguage(savedLang);
  }

});
