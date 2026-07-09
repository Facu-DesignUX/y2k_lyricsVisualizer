export const state = {
  text:          '',
  style:         'brat',   // brat | deluxe | moment
  ratio:         '1:1',    // 1:1 | 9:16 | 16:9
  fontSize:      84,
  lineHeight:    1.1,
  letterSpacing: 0,
  blur:          0,
  textAlign:     'justify',// left | center | right | justify (global)
  inverse:       false,    // true = mirror horizontally
  
  // Custom colors for Brat & Deluxe
  customBg:      '#8ace00',

  // Advanced The Moment colors
  momentTextColor: '#6666ff',
  momentBgColors:  ['#cc0000', '#6666ff'], // Array of bg colors
  transitionMode:  'strobe', // strobe | fade | gradient
  strobeSpeed:     10,
  momentFont:      'Anton',
  
  // Recording & Modes
  recordMode:    'auto',   // auto | live
  typeSpeed:     80,       // ms per char (auto mode)
  isRecording:   false,
  
  // Sizes
  customSize:    false,    // true = fixed size slider, false = auto-scale
  sizeLimit:     true,     // true = stop auto-scale at 84, false = down to 20
  
  // Gradient state
  gradientAngle: 0,
  gradientType:  'circular'
};

// Aspect ratios → [w, h] logical canvas dimensions
export const RATIOS = {
  '1:1':  [1080, 1080],
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
};
