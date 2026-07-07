/* ===================================================
   BRAT VISUALIZER — app.js
   Modules: State · Renderer · Animator · Recorder
   =================================================== */

'use strict';

// =============================================
// MODULE A: STATE
// =============================================
const state = {
  text:          '',
  style:         'brat',   // brat | deluxe | remix | moment
  ratio:         '1:1',    // 1:1 | 9:16 | 16:9
  fontSize:      84,
  lineHeight:    1.1,
  letterSpacing: 0,
  blur:          0,
  textAlign:     'justify',// left | center | right | justify (global)
  strobeSpeed:   10,
  strobeBg:      '#cc0000',
  strobeText:    '#6666ff',
  momentFont:    'Anton',  // font used in "the moment" style
  recordMode:    'auto',   // auto | live
  typeSpeed:     80,       // ms per char (auto mode)
  isRecording:   false,
  customSize:    false,    // true = fixed size slider, false = auto-scale
  sizeLimit:     true,     // true = stop auto-scale at 84, false = down to 20
};

// Aspect ratios → [w, h] logical canvas dimensions
const RATIOS = {
  '1:1':  [1080, 1080],
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
};

// =============================================
// MODULE B: DOM REFS
// =============================================
const canvas       = document.getElementById('main-canvas');
const ctx          = canvas.getContext('2d');
const canvasWrap   = document.getElementById('canvas-wrap');
const lyricsInput  = document.getElementById('lyrics-input');
const liveInput    = document.getElementById('live-input');

const btnBrat      = document.getElementById('btn-brat');
const btnDeluxe    = document.getElementById('btn-deluxe');
const btnRemix     = document.getElementById('btn-remix');
const btnMoment    = document.getElementById('btn-moment');

const btnSquare    = document.getElementById('btn-square');
const btnVertical  = document.getElementById('btn-vertical');
const btnHorizontal= document.getElementById('btn-horizontal');

const tabAuto      = document.getElementById('tab-auto');
const tabLive      = document.getElementById('tab-live');

const sliderFontSize     = document.getElementById('ctrl-fontsize');
const btnCustomSize      = document.getElementById('btn-custom-size');
const btnSizeLimit       = document.getElementById('btn-size-limit');
const wrapFontsize       = document.getElementById('wrap-fontsize');

const sliderLineHeight   = document.getElementById('ctrl-lineheight');
const sliderLetterSpacing= document.getElementById('ctrl-letterspacing');
const sliderBlur         = document.getElementById('ctrl-blur');
const sliderStrobe       = document.getElementById('ctrl-strobe');
const sliderTypeSpeed    = document.getElementById('ctrl-typespeed');

const valFontSize        = document.getElementById('val-fontsize');
const valLineHeight      = document.getElementById('val-lineheight');
const valLetterSpacing   = document.getElementById('val-letterspacing');
const valBlur            = document.getElementById('val-blur');
const valStrobe          = document.getElementById('val-strobe');
const valTypeSpeed       = document.getElementById('val-typespeed');

const colorStrobeBg      = document.getElementById('strobe-bg-color');
const colorStrobeText    = document.getElementById('strobe-text-color');

const rowStrobeSpeed     = document.getElementById('row-strobe-speed');
const rowStrobeColors    = document.getElementById('row-strobe-colors');
const rowStrobeFont      = document.getElementById('row-strobe-font');
const rowTypeSpeed       = document.getElementById('row-type-speed');

// Alignment buttons
const btnAlignLeft   = document.getElementById('btn-align-left');
const btnAlignCenter = document.getElementById('btn-align-center');
const btnAlignRight  = document.getElementById('btn-align-right');
const alignBtns      = [btnAlignLeft, btnAlignCenter, btnAlignRight];

// Palette swatches
const paletteBtns    = document.querySelectorAll('.palette-swatch');

// Font buttons
const fontBtns       = document.querySelectorAll('.font-btn');

const btnSnapshot  = document.getElementById('btn-snapshot');
const btnRecord    = document.getElementById('btn-record');
const recordLabel  = document.getElementById('record-label');
const recordStatus = document.getElementById('record-status');
const recordTimer  = document.getElementById('record-timer');
const btnStop      = document.getElementById('btn-stop-record');

// =============================================
// MODULE C: CANVAS SIZING
// =============================================

/** Sets logical canvas resolution and CSS display size to preserve ratio */
function resizeCanvas() {
  const [lw, lh] = RATIOS[state.ratio];
  canvas.width  = lw;
  canvas.height = lh;

  const areaW = canvasWrap.parentElement.clientWidth  - 48;
  const areaH = canvasWrap.parentElement.clientHeight - 48;
  const scale = Math.min(areaW / lw, areaH / lh);

  const dispW = Math.floor(lw * scale);
  const dispH = Math.floor(lh * scale);

  canvasWrap.style.width  = dispW + 'px';
  canvasWrap.style.height = dispH + 'px';
}

// =============================================
// MODULE D: TEXT RENDERER (Static Frame)
// =============================================

/**
 * Wraps text into lines that fit within maxWidth.
 * Respects newline characters in source text.
 */
function wrapText(text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let current = '';

    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

/** Styles for each mode */
const STYLE_CONFIG = {
  brat: {
    bg:         '#8ace00',
    textColor:  '#000000',
    font:       (sz) => `${sz}px Arial, sans-serif`,
    transform:  null,
    uppercase:  false,
  },
  deluxe: {
    bg:         '#ffffff',
    textColor:  '#000000',
    font:       (sz) => `${sz}px Arial, sans-serif`,
    transform:  null,
    uppercase:  false,
  },
  remix: {
    bg:         '#8ace00',
    textColor:  '#000000',
    font:       (sz) => `${sz}px Arial, sans-serif`,
    transform:  'mirror',
    uppercase:  false,
  },
  moment: {
    bg:         null,  // controlled by strobe
    textColor:  null,
    transform:  null,
    uppercase:  true,
    // font is dynamic: uses state.momentFont
    font:       (sz) => `900 ${sz}px '${state.momentFont}', 'Anton', 'Impact', sans-serif`,
  },
};

/**
 * Draws the current state to the canvas.
 * Called on every input change and on each animation frame (strobe mode).
 * @param {string} [overrideText] - if provided, use this instead of state.text (typewriter)
 * @param {string} [overrideBg]   - strobe bg override
 * @param {string} [overrideFg]   - strobe fg override
 */
function drawFrame(overrideText, overrideBg, overrideFg) {
  const cw = canvas.width;
  const ch = canvas.height;
  const cfg = STYLE_CONFIG[state.style];
  const text = (overrideText !== undefined) ? overrideText : state.text;

  // --- Background ---
  const bg = overrideBg || (state.style === 'moment' ? state.strobeBg : cfg.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);

  if (!text.trim()) return;

  // --- Font + blur ---
  ctx.save();
  if (state.blur > 0) {
    ctx.filter = `blur(${state.blur}px)`;
  } else {
    ctx.filter = 'none';
  }

  // Letter spacing via custom tracking
  const useCustomSpacing = state.letterSpacing !== 0;

  // Text color
  const fg = overrideFg || (state.style === 'moment' ? state.strobeText : cfg.textColor);
  ctx.fillStyle = fg;

  const padX = Math.round(cw * 0.06);
  const padY = Math.round(ch * 0.08);
  const maxWidth = cw - padX * 2;
  const maxHeight = ch - padY * 2;

  const displayText = cfg.uppercase ? text.toUpperCase() : text.toLowerCase();
  
  // --- Dynamic Font Scaling ---
  let lines = [];
  let lineH = 0;
  let startY = 0;
  
  if (state.customSize) {
    // Fixed size from slider
    ctx.font = cfg.font(state.fontSize);
    lines = wrapText(displayText, maxWidth);
    lineH = Math.round(state.fontSize * state.lineHeight);
    const totalH = lines.length * lineH;
    startY = Math.max(padY + state.fontSize, Math.round((ch - totalH) / 2) + state.fontSize);
  } else {
    // Auto-scale mode
    const maxDynamicSize = 240;
    const minDynamicSize = state.sizeLimit ? 84 : 20;
    let trySize = maxDynamicSize;

    while (trySize >= minDynamicSize) {
      ctx.font = cfg.font(trySize);
      lines = wrapText(displayText, maxWidth);
      lineH = Math.round(trySize * state.lineHeight);
      const totalH = lines.length * lineH;

      let isTooWide = false;
      for (const line of lines) {
         let wWidth = ctx.measureText(line).width;
         if (useCustomSpacing) wWidth += Math.max(0, line.length - 1) * state.letterSpacing;
         if (wWidth > maxWidth) {
             isTooWide = true;
             break;
         }
      }

      if (totalH <= maxHeight && !isTooWide) {
        startY = Math.max(padY + trySize, Math.round((ch - totalH) / 2) + trySize);
        break; 
      }
      trySize -= 2;
    }

    if (trySize < minDynamicSize) {
       trySize = minDynamicSize;
       ctx.font = cfg.font(trySize);
       lines = wrapText(displayText, maxWidth);
       lineH = Math.round(trySize * state.lineHeight);
       const totalH = lines.length * lineH;
       startY = Math.max(padY + trySize, Math.round((ch - totalH) / 2) + trySize);
    }
  }

  // For mirror style, flip the canvas context horizontally
  if (cfg.transform === 'mirror') {
    ctx.setTransform(-1, 0, 0, 1, cw, 0);
  }

  const align = state.textAlign;
  const isJustify = align === 'justify';

  // Base canvas alignment for non-justify
  const alignX = align === 'right'   ? cw - padX :
                 align === 'center'  ? cw / 2    :
                                       padX;

  if (!isJustify) {
    ctx.textAlign = align === 'right'   ? 'right' :
                    align === 'center'  ? 'center' :
                                          'left';
  }

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineH;
    const line = lines[i];
    
    if (!line) continue;

    if (isJustify) {
      ctx.textAlign = 'left';
      const words = line.split(' ');

      // Rule: If the entire text is 1 line, or this specific line has 1 word -> Left Aligned.
      // Otherwise -> Fully Justified.
      if (lines.length === 1 || words.length === 1) {
        if (!useCustomSpacing) {
          ctx.fillText(line, padX, y);
        } else {
          let x = padX;
          for (const char of line) {
            ctx.fillText(char, x, y);
            x += ctx.measureText(char).width + state.letterSpacing;
          }
        }
      } else {
        // >1 word -> ALWAYS Justified
        let totalWordsWidth = 0;
        let charSpacingPerWord = [];
        
        for (const w of words) {
          let wWidth = ctx.measureText(w).width;
          if (useCustomSpacing) wWidth += (w.length - 1) * state.letterSpacing;
          totalWordsWidth += wWidth;
          charSpacingPerWord.push(wWidth);
        }

        const remainingSpace = maxWidth - totalWordsWidth;
        const spaceToAdd = Math.max(0, remainingSpace / (words.length - 1));

        let currentX = padX;
        for (let j = 0; j < words.length; j++) {
          const w = words[j];
          if (!useCustomSpacing) {
            ctx.fillText(w, currentX, y);
            currentX += ctx.measureText(w).width + spaceToAdd;
          } else {
            let wx = currentX;
            for (const char of w) {
              ctx.fillText(char, wx, y);
              wx += ctx.measureText(char).width + state.letterSpacing;
            }
            currentX += charSpacingPerWord[j] + spaceToAdd;
          }
        }
      }
    } else {
      // Normal alignment
      if (!useCustomSpacing) {
        ctx.fillText(line, alignX, y);
      } else {
        // Draw character by character to simulate letter-spacing
        let x = alignX;
        if (align === 'center') {
          // Calculate total width to center
          let totalW = 0;
          for (const ch of line) totalW += ctx.measureText(ch).width + state.letterSpacing;
          x = alignX - totalW / 2;
        } else if (align === 'right') {
          let totalW = 0;
          for (const ch of line) totalW += ctx.measureText(ch).width + state.letterSpacing;
          x = alignX - totalW;
        }
        for (const char of line) {
          ctx.fillText(char, x, y);
          x += ctx.measureText(char).width + state.letterSpacing;
        }
      }
    }
  }

  ctx.restore();
}

// =============================================
// MODULE E: STROBE ANIMATION
// =============================================
let strobeRAF  = null;
let strobeState = false;  // alternates bg/fg
let lastStrobeTime = 0;

function startStrobe() {
  if (strobeRAF) return;
  lastStrobeTime = 0;

  function tick(ts) {
    const interval = 1000 / state.strobeSpeed;
    if (ts - lastStrobeTime >= interval) {
      strobeState = !strobeState;
      lastStrobeTime = ts;
      const bg = strobeState ? state.strobeBg : state.strobeText;
      const fg = strobeState ? state.strobeText : state.strobeBg;
      drawFrame(undefined, bg, fg);
    }
    strobeRAF = requestAnimationFrame(tick);
  }

  strobeRAF = requestAnimationFrame(tick);
}

function stopStrobe() {
  if (strobeRAF) {
    cancelAnimationFrame(strobeRAF);
    strobeRAF = null;
  }
}

// =============================================
// MODULE F: TYPEWRITER ANIMATION
// =============================================
let typewriterTimer = null;

function stopTypewriter() {
  if (typewriterTimer) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }
}

function runTypewriter(fullText, onDone) {
  stopTypewriter();
  let i = 0;

  function next() {
    if (i > fullText.length) {
      if (onDone) onDone();
      return;
    }
    const partial = fullText.slice(0, i);
    if (state.style === 'moment') {
      // strobe still runs; just update the text
      drawFrame(partial);
    } else {
      drawFrame(partial);
    }
    i++;
    typewriterTimer = setTimeout(next, state.typeSpeed);
  }

  next();
}

// =============================================
// MODULE G: RECORDING (WebM)
// =============================================
let mediaRecorder = null;
let recordChunks  = [];
let recordInterval = null;
let recordSeconds  = 0;

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function startRecording() {
  recordChunks = [];
  recordSeconds = 0;
  recordTimer.textContent = '00:00';

  const stream = canvas.captureStream(30);
  const mimeType = 'video/webm;codecs=vp9';
  mediaRecorder = new MediaRecorder(stream, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordChunks, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `brat-${state.style}-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  mediaRecorder.start(100);  // collect data every 100ms
  state.isRecording = true;

  // Timer
  recordInterval = setInterval(() => {
    recordSeconds++;
    recordTimer.textContent = formatTime(recordSeconds);
  }, 1000);

  // UI update
  btnRecord.classList.add('recording');
  recordLabel.textContent = 'recording...';
  recordStatus.classList.remove('hidden');
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  clearInterval(recordInterval);
  state.isRecording = false;

  btnRecord.classList.remove('recording');
  recordLabel.textContent = 'rec webm';
  recordStatus.classList.add('hidden');

  // Always unlock the lyrics input when recording stops
  lyricsInput.disabled = false;
  lyricsInput.classList.remove('locked');

  // Stop typewriter if auto mode
  stopTypewriter();
}

// =============================================
// MODULE H: EXPORT (PNG)
// =============================================
function exportPNG() {
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href     = dataURL;
  a.download = `brat-${state.style}-${Date.now()}.png`;
  a.click();
}

// =============================================
// MODULE I: UI — SYNC STATE → UI
// =============================================

function setStyle(newStyle) {
  state.style = newStyle;

  // Toggle strobe animation and moment-specific controls
  if (newStyle === 'moment') {
    startStrobe();
    rowStrobeSpeed.style.display  = 'flex';
    rowStrobeColors.style.display = 'flex';
    rowStrobeFont.style.display   = 'flex';
  } else {
    stopStrobe();
    rowStrobeSpeed.style.display  = 'none';
    rowStrobeColors.style.display = 'none';
    rowStrobeFont.style.display   = 'none';
    drawFrame();
  }


  // Active button
  [btnBrat, btnDeluxe, btnRemix, btnMoment].forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + newStyle).classList.add('active');
}

function setRatio(newRatio) {
  state.ratio = newRatio;
  resizeCanvas();
  if (state.style !== 'moment') drawFrame();

  [btnSquare, btnVertical, btnHorizontal].forEach(b => b.classList.remove('active'));
  const map = { '1:1': btnSquare, '9:16': btnVertical, '16:9': btnHorizontal };
  map[newRatio].classList.add('active');
}

function setRecordMode(mode) {
  state.recordMode = mode;

  // lyricsInput is always usable when NOT recording
  // The only difference between modes is what happens when REC is pressed:
  //   auto → typewriter plays the pre-typed text (input locked during playback)
  //   live → input is cleared, focused, and user types live into it
  // The canvas overlay (liveInput) is no longer used.

  if (mode === 'live') {
    rowTypeSpeed.style.display = 'none';
    // Show a hint in the placeholder
    lyricsInput.placeholder = 'press rec, then start typing live...';
  } else {
    rowTypeSpeed.style.display = '';
    lyricsInput.placeholder = 'type or paste your lyrics here...';
  }

  [tabAuto, tabLive].forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + mode).classList.add('active');
}

// =============================================
// MODULE J: EVENT LISTENERS
// =============================================

// Helper to check if text fits in the given size limit
function doesTextFit(testText, minAllowedSize) {
  const [lw, lh] = RATIOS[state.ratio];
  const padX = Math.round(lw * 0.06);
  const padY = Math.round(lh * 0.08);
  const maxW = lw - padX * 2;
  const maxH = lh - padY * 2;
  const cfg = STYLE_CONFIG[state.style];
  
  ctx.save();
  ctx.font = cfg.font(minAllowedSize);
  const displayT = cfg.uppercase ? testText.toUpperCase() : testText.toLowerCase();
  const testLines = wrapText(displayT, maxW);
  const testLineH = Math.round(minAllowedSize * state.lineHeight);
  const totalH = testLines.length * testLineH;
  
  let isTooWide = false;
  const useCustomSpacing = state.letterSpacing !== 0;
  for (const line of testLines) {
     let wWidth = ctx.measureText(line).width;
     if (useCustomSpacing) wWidth += Math.max(0, line.length - 1) * state.letterSpacing;
     if (wWidth > maxW) {
         isTooWide = true;
         break;
     }
  }
  ctx.restore();
  
  return totalH <= maxH && !isTooWide;
}

// — Text input (normal/auto mode) —
lyricsInput.addEventListener('input', (e) => {
  if (!state.customSize && state.sizeLimit) {
    if (!doesTextFit(lyricsInput.value, 84)) {
      // Revert input if it overflows the size limit
      lyricsInput.value = state.text;
      return;
    }
  }
  state.text = lyricsInput.value;
  if (state.style !== 'moment') drawFrame();
});

// — Live input overlay is no longer used; lyricsInput handles both modes —

// — Style buttons —
btnBrat.addEventListener('click',    () => setStyle('brat'));
btnDeluxe.addEventListener('click',  () => setStyle('deluxe'));
btnRemix.addEventListener('click',   () => setStyle('remix'));
btnMoment.addEventListener('click',  () => setStyle('moment'));

// — Aspect ratio —
btnSquare.addEventListener('click',     () => setRatio('1:1'));
btnVertical.addEventListener('click',   () => setRatio('9:16'));
btnHorizontal.addEventListener('click', () => setRatio('16:9'));

// — Size Toggles —
btnCustomSize.addEventListener('click', () => {
  state.customSize = !state.customSize;
  btnCustomSize.classList.toggle('active', state.customSize);
  if (state.customSize) {
    wrapFontsize.style.opacity = '1';
    wrapFontsize.style.pointerEvents = 'auto';
  } else {
    wrapFontsize.style.opacity = '0.3';
    wrapFontsize.style.pointerEvents = 'none';
  }
  if (state.style !== 'moment') drawFrame();
});

btnSizeLimit.addEventListener('click', () => {
  state.sizeLimit = !state.sizeLimit;
  btnSizeLimit.classList.toggle('active', state.sizeLimit);
  // Re-verify current text if limit was just turned ON
  if (state.sizeLimit && !state.customSize) {
    if (!doesTextFit(state.text, 84)) {
      // If it doesn't fit anymore, we should ideally truncate or let the user fix it.
      // But for simplicity, we just let it draw at 84 and overflow visually until they edit.
    }
  }
  if (state.style !== 'moment') drawFrame();
});

// — Text alignment (toggleable) —
alignBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) {
      // Toggle off: revert to default justified
      state.textAlign = 'justify';
      btn.classList.remove('active');
    } else {
      // Select new alignment
      state.textAlign = btn.dataset.align;
      alignBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    if (state.style !== 'moment') drawFrame();
  });
});

// — Palette swatches (the moment) —
paletteBtns.forEach(swatch => {
  swatch.addEventListener('click', () => {
    state.strobeBg   = swatch.dataset.bg;
    state.strobeText = swatch.dataset.fg;
    // Sync color pickers
    colorStrobeBg.value   = state.strobeBg;
    colorStrobeText.value = state.strobeText;
    paletteBtns.forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
  });
});

// — Font selector (the moment) —
fontBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    state.momentFont = btn.dataset.font;
    fontBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// — Record mode tabs —
tabAuto.addEventListener('click', () => setRecordMode('auto'));
tabLive.addEventListener('click', () => setRecordMode('live'));

// — Sliders —
sliderFontSize.addEventListener('input', () => {
  state.fontSize = parseInt(sliderFontSize.value);
  valFontSize.textContent = state.fontSize;
  if (state.style !== 'moment') drawFrame();
});

sliderLineHeight.addEventListener('input', () => {
  state.lineHeight = parseInt(sliderLineHeight.value) / 100;
  valLineHeight.textContent = state.lineHeight.toFixed(1);
  if (state.style !== 'moment') drawFrame();
});

sliderLetterSpacing.addEventListener('input', () => {
  state.letterSpacing = parseInt(sliderLetterSpacing.value);
  valLetterSpacing.textContent = state.letterSpacing;
  if (state.style !== 'moment') drawFrame();
});

sliderBlur.addEventListener('input', () => {
  state.blur = parseFloat(sliderBlur.value);
  valBlur.textContent = state.blur.toFixed(1);
  if (state.style !== 'moment') drawFrame();
});

sliderStrobe.addEventListener('input', () => {
  state.strobeSpeed = parseInt(sliderStrobe.value);
  valStrobe.textContent = state.strobeSpeed;
});

sliderTypeSpeed.addEventListener('input', () => {
  state.typeSpeed = parseInt(sliderTypeSpeed.value);
  valTypeSpeed.textContent = state.typeSpeed + 'ms';
});

// — Strobe color pickers —
colorStrobeBg.addEventListener('input', () => {
  state.strobeBg = colorStrobeBg.value;
});
colorStrobeText.addEventListener('input', () => {
  state.strobeText = colorStrobeText.value;
});

// — Export: PNG snapshot —
btnSnapshot.addEventListener('click', exportPNG);

// — Record / Stop —
btnRecord.addEventListener('click', () => {
  if (state.isRecording) return;

  if (state.recordMode === 'auto') {
    // AUTO mode: lock the input while the typewriter plays
    lyricsInput.disabled = true;
    lyricsInput.classList.add('locked');
    startRecording();
    runTypewriter(state.text, () => {
      // Give a brief pause at the end before stopping
      setTimeout(() => stopRecording(), 800);
    });

  } else {
    // LIVE mode: clear canvas text, focus input, start recording
    // The user types from scratch and the canvas mirrors it in real time
    lyricsInput.value = '';
    state.text = '';
    drawFrame('');
    lyricsInput.disabled = false; // always writable in live mode
    startRecording();
    // Focus after a tick so the UI has settled
    setTimeout(() => lyricsInput.focus(), 50);
  }
});

btnStop.addEventListener('click', stopRecording);

// =============================================
// MODULE K: WINDOW RESIZE
// =============================================
let resizeDebounce = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeDebounce);
  resizeDebounce = setTimeout(() => {
    resizeCanvas();
    if (state.style !== 'moment') drawFrame();
  }, 80);
});

// =============================================
// INIT
// =============================================
(function init() {
  // Hide strobe-specific controls initially
  rowStrobeSpeed.style.display  = 'none';
  rowStrobeColors.style.display = 'none';
  rowStrobeFont.style.display   = 'none';

  resizeCanvas();
  drawFrame();

  // Sync slider display values
  valFontSize.textContent       = sliderFontSize.value;
  valLineHeight.textContent     = (parseInt(sliderLineHeight.value) / 100).toFixed(1);
  valLetterSpacing.textContent  = sliderLetterSpacing.value;
  valBlur.textContent           = sliderBlur.value;
  valStrobe.textContent         = sliderStrobe.value;
  valTypeSpeed.textContent      = sliderTypeSpeed.value + 'ms';
})();
