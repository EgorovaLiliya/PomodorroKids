// Простые иконки с толстым контуром — в стиле очков персонажей.

const INK = '#263B59';

const wrap = (body, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  timer: wrap('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2"/><path d="M9.5 2.5h5"/><path d="M12 2.5V6"/>'),
  trophy: wrap('<path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 4"/><path d="M17 6h2.5a2.5 2.5 0 0 1-2.6 4"/><path d="M12 14v3.5"/><path d="M8.5 20.5h7l-.8-3h-5.4z"/>'),
  gear: wrap('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="6.6"/>'),
  play: wrap('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
  pause: wrap('<path d="M8.5 5.5v13M15.5 5.5v13"/>'),
  sound: wrap('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  soundOff: wrap('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: wrap('<path d="M15 5l-7 7 7 7"/>'),
  next: wrap('<path d="M9 5l7 7-7 7"/>'),
  check: wrap('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  note: wrap('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/>'),
};

// Значки наград
const badge = (fill, inner) => `
<svg class="badge" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="34" r="26" fill="rgba(38,59,89,.12)"/>
  <circle cx="32" cy="31" r="26" fill="${fill}" stroke="${INK}" stroke-width="3.5"/>
  <circle cx="32" cy="31" r="19.5" fill="none" stroke="#FFF8EE" stroke-width="2" stroke-dasharray="2 5" opacity=".75"/>
  ${inner}
</svg>`;

export const awardIcons = {
  lightning: badge('#F5C84B',
    `<path d="M35.5 13 21 34h10l-3.5 16L43 28H33l2.5-15z" fill="#FFF8EE" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`),
  strong: badge('#F45B45',
    `<path d="M32 15.5l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L32 39.1l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="#FFF8EE" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`),
  marathon: badge('#568B4D',
    `<path d="M22 17h20v8a10 10 0 0 1-20 0z" fill="#F5C84B" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
     <path d="M22 20h-4a4.5 4.5 0 0 0 5 6M42 20h4a4.5 4.5 0 0 1-5 6" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
     <path d="M32 35v5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
     <path d="M25 46h14l-1.5-6h-11z" fill="#FFF8EE" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`),
};
