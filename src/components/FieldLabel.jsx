// Form field label used throughout the app. Note: this renders a bare
// <label> with no `for`/`id` link to the input it sits next to (they're
// just visual siblings in a wrapping <div>) — screen readers won't
// associate them, and neither will testing-library's getByLabelText() or
// Playwright's getByLabel(). See tests/e2e/helpers.js for the workaround
// used in end-to-end tests. Wiring up real htmlFor/id pairs would fix both
// issues; tracked as a known gap rather than done, since it touches every
// form in the app.
export default function FieldLabel({ children }) {
  return (
    <label
      className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: 'var(--ink-soft)', letterSpacing: '0.05em' }}
    >
      {children}
    </label>
  );
}
