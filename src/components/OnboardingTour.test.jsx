import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import OnboardingTour, { STORAGE_KEY, steps } from './OnboardingTour.jsx';

const farm = {
  seedTutorialData: vi.fn(),
  resetTutorialData: vi.fn(),
};

beforeEach(() => {
  localStorage.clear();
  farm.seedTutorialData.mockClear();
  farm.resetTutorialData.mockClear();
});

describe('OnboardingTour', () => {
  it('shows the tour for a first-time visitor and starts on the dashboard', () => {
    const onNavigate = vi.fn();
    render(<OnboardingTour farm={farm} onNavigate={onNavigate} onReset={farm.resetTutorialData} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Welcome — let’s learn by doing')).toBeInTheDocument();
    expect(screen.getByText(`Getting started · 1/${steps.length}`)).toBeInTheDocument();
  });

  it('does not render after onboarding has been completed', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    render(<OnboardingTour farm={farm} onNavigate={vi.fn()} onReset={farm.resetTutorialData} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('seeds examples when the farmer starts the tour', () => {
    render(<OnboardingTour farm={farm} onNavigate={vi.fn()} onReset={farm.resetTutorialData} />);

    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }));

    expect(farm.seedTutorialData).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Start with a farm group')).toBeInTheDocument();
  });

  it('uses a tap instruction instead of an enabled CTA for navigation steps', () => {
    const onNavigate = vi.fn();
    render(<OnboardingTour farm={farm} onNavigate={onNavigate} onReset={farm.resetTutorialData} />);
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }));

    const cta = screen.getByRole('button', { name: /tap more/i });
    expect(cta).toBeDisabled();
    expect(screen.getByText('Start with a farm group')).toBeInTheDocument();
  });

  it('advances when the highlighted navigation target is clicked', () => {
    const onNavigate = vi.fn();
    const { container } = render(<OnboardingTour farm={farm} onNavigate={onNavigate} onReset={farm.resetTutorialData} />);
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }));

    const target = document.createElement('button');
    target.setAttribute('data-tour', 'nav-more');
    target.textContent = 'More';
    container.appendChild(target);

    // The effect needs a render after the target exists; dispatch the event after
    // the target is available to emulate the real navbar.
    fireEvent.click(target);

    expect(onNavigate).toHaveBeenCalledWith('units');
  });

  it('skip removes tutorial data without marking onboarding complete', () => {
    render(<OnboardingTour farm={farm} onNavigate={vi.fn()} onReset={farm.resetTutorialData} />);

    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(farm.resetTutorialData).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('finishing removes tutorial data and records completion', () => {
    const onNavigate = vi.fn();
    render(<OnboardingTour farm={farm} onNavigate={onNavigate} onReset={farm.resetTutorialData} />);

    // Move to the final step without depending on every intermediate UI detail.
    for (let i = 0; i < steps.length - 1; i += 1) {
      const buttons = screen.getAllByRole('button');
      const next = buttons.find((button) => button.textContent?.includes('Next') || button.textContent?.includes('Start the tour'));
      if (next && !next.disabled) fireEvent.click(next);
      else break;
    }

    expect(screen.getByText(/Start using Mazaosmart|You’re ready/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start using mazaosmart/i }));

    expect(farm.resetTutorialData).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(onNavigate).toHaveBeenLastCalledWith('dashboard');
  });
});
