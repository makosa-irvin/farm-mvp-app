import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement Element.prototype.scrollIntoView at all —
// calling it throws "is not a function", crashing any component that
// uses it (OnboardingTour.jsx does, to bring a highlighted tour target
// into view). A no-op stub is all tests need, since jsdom has no real
// layout/scrolling to verify against anyway.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
