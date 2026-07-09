import { state } from '../../core/State.js';

/** Styles for each mode */
export const STYLE_CONFIG = {
  brat: {
    bg:         () => state.customBg,
    textColor:  () => '#000000',
    font:       (sz) => `${sz}px Arial, sans-serif`,
    uppercase:  false,
  },
  deluxe: {
    bg:         () => state.customBg,
    textColor:  () => '#000000',
    font:       (sz) => `${sz}px Arial, sans-serif`,
    uppercase:  false,
  },
  moment: {
    bg:         null,  // controlled dynamically
    textColor:  null,
    uppercase:  true,
    font:       (sz) => `900 ${sz}px '${state.momentFont}', 'Anton', 'Impact', sans-serif`,
  },
};
