import { resizeCanvas, drawFrame } from './visualizer/Renderer.js';
import { initControls } from './ui/Controls.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize controls
  initControls();
  
  // Set initial canvas size and draw first frame
  resizeCanvas();
  drawFrame();
  
  // Handle window resize dynamically to scale the canvas display
  window.addEventListener('resize', () => {
    resizeCanvas();
    drawFrame();
  });
});
