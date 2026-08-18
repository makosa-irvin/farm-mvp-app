// Shared Tailwind class + inline style pair applied to every text/number/
// select/date input and textarea across the app's forms, so they stay
// visually consistent without repeating the same classes everywhere.
//
// text-base (16px) rather than text-sm (14px) is deliberate: below 16px,
// iOS Safari auto-zooms the page on focus, which is disorienting — and
// larger text matters more here than usual, for outdoor/sunlight use and
// for a persona that isn't assumed to be comfortable with small UI text.
export const inputClass = 'w-full rounded-xl px-3 py-3 text-base bg-white transition-colors';
export const inputStyle = { border: '1.5px solid var(--line)', color: 'var(--ink)' };
