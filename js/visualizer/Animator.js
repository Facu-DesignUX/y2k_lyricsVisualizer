import { state } from '../core/State.js';
import { drawFrame } from './Renderer.js';

let momentRAF  = null;
let currentColorIndex = 0;
let lastColorChangeTime = 0;

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function lerpColor(c1, c2, factor) {
  const hex1 = hexToRgb(c1);
  const hex2 = hexToRgb(c2);
  const r = Math.round(hex1.r + factor * (hex2.r - hex1.r));
  const g = Math.round(hex1.g + factor * (hex2.g - hex1.g));
  const b = Math.round(hex1.b + factor * (hex2.b - hex1.b));
  return `rgb(${r}, ${g}, ${b})`;
}

export function startMomentAnim() {
  if (momentRAF) return;
  lastColorChangeTime = performance.now();
  currentColorIndex = 0;

  function tick(ts) {
    const colors = state.momentBgColors;
    const interval = 1000 / state.strobeSpeed; // ms per full color cycle

    if (colors.length === 0) {
      drawFrame();
    } else if (state.transitionMode === 'static') {
      drawFrame();
    } else if (state.transitionMode === 'gradient') {
      // Gradient mode animates the angle smoothly based on speed
      const speed = state.strobeSpeed * 0.1;
      state.gradientAngle = (state.gradientAngle + speed) % 360;
      drawFrame();
    } else if (state.transitionMode === 'strobe') {
      let maxIndex = colors.length === 1 ? 2 : colors.length;
      if (currentColorIndex >= maxIndex) currentColorIndex = 0;

      if (ts - lastColorChangeTime >= interval) {
        currentColorIndex = (currentColorIndex + 1) % maxIndex;
        lastColorChangeTime = ts;
      }
      
      if (colors.length === 1) {
        const bg = currentColorIndex === 0 ? colors[0] : state.momentTextColor;
        const fg = currentColorIndex === 0 ? state.momentTextColor : colors[0];
        drawFrame(undefined, bg, fg);
      } else {
        drawFrame(undefined, colors[currentColorIndex], state.momentTextColor);
      }
    } else if (state.transitionMode === 'fade') {
      let maxIndex = colors.length === 1 ? 2 : colors.length;
      if (currentColorIndex >= maxIndex) currentColorIndex = 0;

      const elapsed = ts - lastColorChangeTime;
      let factor = elapsed / interval;
      
      if (factor >= 1) {
        factor = 0;
        currentColorIndex = (currentColorIndex + 1) % maxIndex;
        lastColorChangeTime = ts;
      }
      
      const nextIndex = (currentColorIndex + 1) % maxIndex;
      
      if (colors.length === 1) {
        const cA = currentColorIndex === 0 ? colors[0] : state.momentTextColor;
        const cB = nextIndex === 0 ? colors[0] : state.momentTextColor;
        const fgA = currentColorIndex === 0 ? state.momentTextColor : colors[0];
        const fgB = nextIndex === 0 ? state.momentTextColor : colors[0];
        
        const mixedBg = lerpColor(cA, cB, factor);
        const mixedFg = lerpColor(fgA, fgB, factor);
        drawFrame(undefined, mixedBg, mixedFg);
      } else {
        const mixedBg = lerpColor(colors[currentColorIndex], colors[nextIndex], factor);
        drawFrame(undefined, mixedBg, state.momentTextColor);
      }
    }

    momentRAF = requestAnimationFrame(tick);
  }

  momentRAF = requestAnimationFrame(tick);
}

export function stopMomentAnim() {
  if (momentRAF) {
    cancelAnimationFrame(momentRAF);
    momentRAF = null;
  }
}

let typewriterTimer = null;

export function stopTypewriter() {
  if (typewriterTimer) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }
}

export function runTypewriter(fullText, onDone) {
  stopTypewriter();
  let i = 0;

  function next() {
    if (i > fullText.length) {
      if (onDone) onDone();
      return;
    }
    const partial = fullText.slice(0, i);
    drawFrame(partial);
    i++;
    typewriterTimer = setTimeout(next, state.typeSpeed);
  }

  next();
}
