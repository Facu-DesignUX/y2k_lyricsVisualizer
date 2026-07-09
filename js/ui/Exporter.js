import { state } from '../core/State.js';
import { canvas } from '../visualizer/Renderer.js';
import { stopTypewriter } from '../visualizer/Animator.js';

const btnRecord    = document.getElementById('btn-record');
const recordLabel  = document.getElementById('record-label');
const recordStatus = document.getElementById('record-status');
const recordTimer  = document.getElementById('record-timer');
const lyricsInput  = document.getElementById('lyrics-input');

let mediaRecorder = null;
let recordChunks  = [];
let recordInterval = null;
let recordSeconds  = 0;

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export function startRecording() {
  recordChunks = [];
  recordSeconds = 0;
  recordTimer.textContent = '00:00';

  const stream = canvas.captureStream(30);
  const mimeType = 'video/webm;codecs=vp9';
  
  // Handling browser support safely
  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream); // fallback
  }

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

  mediaRecorder.start(100);
  state.isRecording = true;

  recordInterval = setInterval(() => {
    recordSeconds++;
    recordTimer.textContent = formatTime(recordSeconds);
  }, 1000);

  btnRecord.classList.add('recording');
  recordLabel.textContent = 'recording...';
  recordStatus.classList.remove('hidden');
}

export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  clearInterval(recordInterval);
  state.isRecording = false;

  btnRecord.classList.remove('recording');
  recordLabel.textContent = 'rec webm';
  recordStatus.classList.add('hidden');

  lyricsInput.disabled = false;
  lyricsInput.classList.remove('locked');

  stopTypewriter();
}

export function exportPNG() {
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href     = dataURL;
  a.download = `brat-${state.style}-${Date.now()}.png`;
  a.click();
}
