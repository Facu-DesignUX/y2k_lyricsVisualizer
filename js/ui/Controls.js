import { state } from '../core/State.js';
import { resizeCanvas, drawFrame, doesTextFit } from '../visualizer/Renderer.js';
import { startMomentAnim, stopMomentAnim, runTypewriter } from '../visualizer/Animator.js';
import { startRecording, stopRecording, exportPNG } from './Exporter.js';

export function initControls() {
  const lyricsInput  = document.getElementById('lyrics-input');

  const btnBrat      = document.getElementById('btn-brat');
  const btnDeluxe    = document.getElementById('btn-deluxe');
  const btnMoment    = document.getElementById('btn-moment');

  const btnSquare    = document.getElementById('btn-square');
  const btnVertical  = document.getElementById('btn-vertical');
  const btnHorizontal= document.getElementById('btn-horizontal');

  const tabAuto      = document.getElementById('tab-auto');
  const tabLive      = document.getElementById('tab-live');

  const sliderFontSize     = document.getElementById('ctrl-fontsize');
  const btnCustomSize      = document.getElementById('btn-custom-size');
  const btnSizeLimit       = document.getElementById('btn-size-limit');
  const btnInverse         = document.getElementById('btn-inverse');
  const wrapFontsize       = document.getElementById('wrap-fontsize');

  const ctrlCustomBg       = document.getElementById('ctrl-custom-bg');
  const rowCustomBg        = document.getElementById('row-custom-bg');

  const panelMomentFx      = document.getElementById('panel-moment-fx');
  const momentTextColor    = document.getElementById('moment-text-color');
  const momentBgList       = document.getElementById('moment-bg-list');
  const btnAddColor        = document.getElementById('btn-add-color');
  const ctrlTransition     = document.getElementById('ctrl-transition');
  
  const rowGradientType    = document.getElementById('row-gradient-type');
  const ctrlGradientType   = document.getElementById('ctrl-gradient-type');

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

  const rowStrobeSpeed     = document.getElementById('row-strobe-speed');
  const rowStrobeFont      = document.getElementById('row-strobe-font');
  const rowTypeSpeed       = document.getElementById('row-type-speed');

  const alignBtns      = [
    document.getElementById('btn-align-left'),
    document.getElementById('btn-align-center'),
    document.getElementById('btn-align-right')
  ];
  const fontBtns       = document.querySelectorAll('.font-btn');

  const btnSnapshot  = document.getElementById('btn-snapshot');
  const btnRecord    = document.getElementById('btn-record');
  const btnStop      = document.getElementById('btn-stop-record');

  function renderMomentColorPickers() {
    momentBgList.innerHTML = '';
    state.momentBgColors.forEach((color, index) => {
      const item = document.createElement('div');
      item.className = 'bg-color-item';
      
      const input = document.createElement('input');
      input.type = 'color';
      input.value = color;
      input.addEventListener('input', (e) => {
        state.momentBgColors[index] = e.target.value;
      });

      item.appendChild(input);

      if (state.momentBgColors.length > 1) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove-color';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove color';
        removeBtn.addEventListener('click', () => {
          state.momentBgColors.splice(index, 1);
          renderMomentColorPickers();
        });
        item.appendChild(removeBtn);
      }
      
      momentBgList.appendChild(item);
    });
  }

  btnAddColor.addEventListener('click', () => {
    if (state.momentBgColors.length < 8) {
      state.momentBgColors.push('#000000');
      renderMomentColorPickers();
    }
  });

  ctrlTransition.addEventListener('change', (e) => {
    state.transitionMode = e.target.value;
    rowGradientType.style.display = (state.transitionMode === 'gradient') ? 'flex' : 'none';
  });

  ctrlGradientType.addEventListener('change', (e) => {
    state.gradientType = e.target.value;
  });

  momentTextColor.addEventListener('input', (e) => {
    state.momentTextColor = e.target.value;
  });

  // Init pickers
  renderMomentColorPickers();
  
  // Set default initial style so that advanced panels are hidden correctly
  setStyle('brat');

  function setStyle(newStyle) {
    state.style = newStyle;

    if (newStyle === 'moment') {
      startMomentAnim();
      rowStrobeSpeed.style.display  = 'flex';
      rowStrobeFont.style.display   = 'flex';
      panelMomentFx.style.display   = 'block';
      rowCustomBg.style.display     = 'none';
    } else {
      stopMomentAnim();
      rowStrobeSpeed.style.display  = 'none';
      rowStrobeFont.style.display   = 'none';
      panelMomentFx.style.display   = 'none';
      rowCustomBg.style.display     = 'flex';
      
      if (newStyle === 'deluxe') {
        ctrlCustomBg.value = '#ffffff';
        state.customBg = '#ffffff';
      } else if (newStyle === 'brat') {
        ctrlCustomBg.value = '#8ace00';
        state.customBg = '#8ace00';
      }

      drawFrame();
    }

    [btnBrat, btnDeluxe, btnMoment].forEach(b => b.classList.remove('active'));
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
    if (mode === 'live') {
      rowTypeSpeed.style.display = 'none';
      lyricsInput.placeholder = 'press rec, then start typing live...';
    } else {
      rowTypeSpeed.style.display = '';
      lyricsInput.placeholder = 'type or paste your lyrics here...';
    }
    [tabAuto, tabLive].forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + mode).classList.add('active');
  }

  lyricsInput.addEventListener('input', () => {
    if (!state.customSize && state.sizeLimit) {
      if (!doesTextFit(lyricsInput.value, 84)) {
        lyricsInput.value = state.text;
        return;
      }
    }
    state.text = lyricsInput.value;
    if (state.style !== 'moment') drawFrame();
  });

  btnBrat.addEventListener('click',    () => setStyle('brat'));
  btnDeluxe.addEventListener('click',  () => setStyle('deluxe'));
  btnMoment.addEventListener('click',  () => setStyle('moment'));

  btnSquare.addEventListener('click',     () => setRatio('1:1'));
  btnVertical.addEventListener('click',   () => setRatio('9:16'));
  btnHorizontal.addEventListener('click', () => setRatio('16:9'));

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
    if (state.style !== 'moment') drawFrame();
  });

  btnInverse.addEventListener('click', () => {
    state.inverse = !state.inverse;
    btnInverse.classList.toggle('active', state.inverse);
    if (state.style !== 'moment') drawFrame();
  });

  ctrlCustomBg.addEventListener('input', (e) => {
    state.customBg = e.target.value;
    if (state.style !== 'moment') drawFrame();
  });

  alignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) {
        state.textAlign = 'justify';
        btn.classList.remove('active');
      } else {
        state.textAlign = btn.dataset.align;
        alignBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      if (state.style !== 'moment') drawFrame();
    });
  });

  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.momentFont = btn.dataset.font;
      fontBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  tabAuto.addEventListener('click', () => setRecordMode('auto'));
  tabLive.addEventListener('click', () => setRecordMode('live'));

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

  btnSnapshot.addEventListener('click', exportPNG);

  btnRecord.addEventListener('click', () => {
    if (state.isRecording) return;
    if (state.recordMode === 'auto') {
      lyricsInput.disabled = true;
      lyricsInput.classList.add('locked');
      startRecording();
      runTypewriter(state.text, () => {
        setTimeout(() => stopRecording(), 800);
      });
    } else {
      lyricsInput.value = '';
      state.text = '';
      drawFrame('');
      lyricsInput.disabled = false;
      startRecording();
      setTimeout(() => lyricsInput.focus(), 50);
    }
  });

  btnStop.addEventListener('click', stopRecording);
}
