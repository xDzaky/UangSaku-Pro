import { SHORTCUTS } from './constants.js';

const typingTags = new Set(['INPUT', 'TEXTAREA']);
let lastKey = null;
let lastTime = 0;

export function initKeyboardShortcuts({ focusSearch, openTransactionModal } = {}) {
  document.addEventListener('keydown', event => {
    const targetTag = event.target.tagName;
    const isTyping = typingTags.has(targetTag) || event.target.isContentEditable;

    if (event.key === '/' && !isTyping) {
      event.preventDefault();
      focusSearch?.();
      return;
    }

    if (event.key.toLowerCase() === 'n' && !isTyping) {
      openTransactionModal?.();
      return;
    }

    const now = Date.now();
    if (event.key.toLowerCase() === 'g' && !isTyping) {
      lastKey = 'g';
      lastTime = now;
      return;
    }

    if (lastKey === 'g' && now - lastTime < 1500 && !isTyping) {
      const combo = `g ${event.key.toLowerCase()}`;
      const destination = SHORTCUTS[combo];
      if (destination) {
        window.location.assign(destination);
        lastKey = null;
      }
    }
  });
}

export function applyDyslexiaMode(enabled) {
  document.body.classList.toggle('dyslexia-mode', Boolean(enabled));
}

export function applyReducedMotion(enabled) {
  document.body.classList.toggle('reduced-motion', Boolean(enabled));
}
