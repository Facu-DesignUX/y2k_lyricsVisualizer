import { state, RATIOS } from '../core/State.js';
import { STYLE_CONFIG } from './templates/StyleConfig.js';

export const canvas = document.getElementById('main-canvas');
export const ctx = canvas.getContext('2d');
export const canvasWrap = document.getElementById('canvas-wrap');

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

export function resizeCanvas() {
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

export function wrapText(text, maxWidth) {
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

export function doesTextFit(testText, minAllowedSize) {
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

export function drawFrame(overrideText, overrideBg, overrideFg) {
  const cw = canvas.width;
  const ch = canvas.height;
  const cfg = STYLE_CONFIG[state.style];
  const text = (overrideText !== undefined) ? overrideText : state.text;

  // Global Inverse (Mirror) Transform
  ctx.save();
  if (state.inverse) {
    ctx.setTransform(-1, 0, 0, 1, cw, 0);
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // --- Background ---
  if (state.style === 'moment' && state.transitionMode === 'gradient') {
    const colors = state.momentBgColors;
    let grad;
    if (state.gradientType === 'radial-pulse') {
        const cx = cw/2, cy = ch/2;
        const maxR = Math.sqrt(cx*cx + cy*cy);
        const pulse = (Math.sin(state.gradientAngle * Math.PI / 180) + 1) / 2;
        grad = ctx.createRadialGradient(cx, cy, maxR * 0.1 * pulse, cx, cy, maxR);
    } else if (state.gradientType === 'linear-v') {
        grad = ctx.createLinearGradient(0, 0, 0, ch);
    } else if (state.gradientType === 'linear-h') {
        grad = ctx.createLinearGradient(0, 0, cw, 0);
    } else {
        const angle = state.gradientAngle * (Math.PI / 180);
        const diag = Math.sqrt(cw*cw + ch*ch) / 2;
        const cx = cw/2, cy = ch/2;
        grad = ctx.createLinearGradient(
            cx - Math.cos(angle) * diag, cy - Math.sin(angle) * diag,
            cx + Math.cos(angle) * diag, cy + Math.sin(angle) * diag
        );
    }

    const cLen = colors.length;
    if (cLen === 0) {
        grad.addColorStop(0, '#000000');
        grad.addColorStop(1, '#000000');
    } else if (cLen === 1 || state.gradientType === 'circular') {
        if (cLen === 1) {
            grad.addColorStop(0, colors[0]);
            grad.addColorStop(1, colors[0]);
        } else {
            for (let i = 0; i < cLen; i++) {
                grad.addColorStop(i / (cLen - 1), colors[i]);
            }
        }
    } else {
        // Perfect seamless sliding logic
        const offset = (state.gradientAngle % 360) / 360; 
        let rawStops = [];
        for (let i = -cLen; i <= cLen * 2; i++) {
            const color = colors[(i % cLen + cLen) % cLen];
            const pos = (i / cLen) + offset;
            rawStops.push({ pos, color });
        }
        
        let finalStops = [];
        // Add 0.0
        for (let i = 0; i < rawStops.length - 1; i++) {
            const s1 = rawStops[i];
            const s2 = rawStops[i+1];
            if (s1.pos <= 0 && s2.pos >= 0) {
                if (s1.pos === 0) finalStops.push({pos: 0, color: s1.color});
                else {
                    const t = (0 - s1.pos) / (s2.pos - s1.pos);
                    finalStops.push({pos: 0, color: lerpColor(s1.color, s2.color, t)});
                }
                break;
            }
        }
        // Add internal
        for (const s of rawStops) {
            if (s.pos > 0 && s.pos < 1) finalStops.push({pos: s.pos, color: s.color});
        }
        // Add 1.0
        for (let i = 0; i < rawStops.length - 1; i++) {
            const s1 = rawStops[i];
            const s2 = rawStops[i+1];
            if (s1.pos <= 1 && s2.pos >= 1) {
                if (s2.pos === 1) finalStops.push({pos: 1, color: s2.color});
                else {
                    const t = (1 - s1.pos) / (s2.pos - s1.pos);
                    finalStops.push({pos: 1, color: lerpColor(s1.color, s2.color, t)});
                }
                break;
            }
        }
        
        finalStops.forEach(s => grad.addColorStop(s.pos, s.color));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);
  } else {
    // Solid background
    let bg = overrideBg;
    if (!bg) {
      bg = (state.style === 'moment') ? (state.momentBgColors[0] || '#000') : cfg.bg();
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);
  }

  if (!text.trim()) {
    ctx.restore();
    return;
  }

  // --- Font + blur ---
  ctx.save();
  if (state.blur > 0) {
    ctx.filter = `blur(${state.blur}px)`;
  } else {
    ctx.filter = 'none';
  }

  const useCustomSpacing = state.letterSpacing !== 0;

  // Text color
  const fg = overrideFg || (state.style === 'moment' ? state.momentTextColor : cfg.textColor());
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
    ctx.font = cfg.font(state.fontSize);
    lines = wrapText(displayText, maxWidth);
    lineH = Math.round(state.fontSize * state.lineHeight);
    const totalH = lines.length * lineH;
    startY = Math.max(padY + state.fontSize, Math.round((ch - totalH) / 2) + state.fontSize);
  } else {
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

  const align = state.textAlign;
  const isJustify = align === 'justify';

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
      if (!useCustomSpacing) {
        ctx.fillText(line, alignX, y);
      } else {
        let x = alignX;
        if (align === 'center') {
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

  // --- Force Frame for Constant Frame Rate Recording ---
  // If the canvas is perfectly static, MediaRecorder drops frames causing variable framerate (VFR).
  // VFR crashes the duration calculation in editors like Clipchamp. 
  // We draw a tiny 1x1 alternating pixel to force true 30 FPS.
  if (state.isRecording) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.fillStyle = (performance.now() % 2 < 1) ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)';
    ctx.fillRect(cw - 1, ch - 1, 1, 1);
    ctx.restore();
  }

  ctx.restore();
  ctx.restore(); // Restore global inverse transform
}
