import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toast from '../../src/components/Toast.jsx';

describe('Toast — accessibility semantics', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(<Toast message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is announced by screen readers via role="status"', () => {
    render(<Toast message="Saved successfully" />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved successfully');
  });

  it('uses aria-live="polite" so the announcement does not interrupt what the user is doing', () => {
    render(<Toast message="Saved successfully" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('hides the decorative icon from assistive tech, so only the message text is announced', () => {
    render(<Toast message="Saved successfully" />);
    const icon = document.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
