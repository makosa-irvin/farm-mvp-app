import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import OnboardingTour, { STORAGE_KEY, steps } from '../../src/components/OnboardingTour.jsx';

const farm = {
  seedTutorialData: vi.fn(),
  resetTutorialData: vi.fn(),
};

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  farm.seedTutorialData.mockClear();
  farm.resetTutorialData.mockClear();
});

describe('OnboardingTour', () => {
  it('shows the tour for a first-time visitor', () => {
    render(<OnboardingTour farm={farm} onNavigate={vi.fn()} onReset={farm.resetTutorialData} />);
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

  it('uses a disabled CTA for steps where the farmer must tap a highlighted app control', () => {
    render(<OnboardingTour farm={farm} onNavigate={vi.fn()} onReset={farm.resetTutorialData} />);
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }));
    expect(screen.getByRole('button', { name: /tap more/i })).toBeDisabled();
  });

  it('highlights the More control and advances when it is tapped', async () => {
    const onNavigate = vi.fn();
    const target = document.createElement('button');
    target.setAttribute('data-tour', 'nav-more');
    target.textContent = 'More';
    document.body.appendChild(target);

    render(<OnboardingTour farm={farm} onNavigate={onNavigate} onReset={farm.resetTutorialData} />);
    fireEvent.click(screen.getByRole('button', { name: /start the tour/i }));

    expect(target).toHaveClass('mazao-tour-target');
    expect(target.style.zIndex).toBe('110');

    fireEvent.click(target);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(onNavigate).toHaveBeenCalledWith('units');
  });

  it('skip removes tutorial data without marking onboarding complete', () => {
    render(<OnboardingTour farm={farm} onNavigate={vi.fn()} onReset={farm.resetTutorialData} />);
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(farm.resetTutorialData).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('can be replayed through the onboarding event', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const onNavigate = vi.fn();
    render(<OnboardingTour farm={farm} onNavigate={onNavigate} onReset={farm.resetTutorialData} />);
    act(() => {
      window.dispatchEvent(new Event('mazao-show-onboarding'));
    });
    expect(screen.getByText('Welcome — let’s learn by doing')).toBeInTheDocument();
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('finishes by cleaning tutorial data, recording completion, and returning home', async () => {
    const onNavigate = vi.fn();

    // Every unique `target` used by a 'tap'-mode step needs a stand-in
    // element in the DOM, since OnboardingTour attaches its click
    // listener directly to document.querySelector(`[data-tour="..."]`)
    // — in the real app those elements live in Header/NavTabs, not in
    // this component, so a render of OnboardingTour alone has nothing
    // for a 'tap' step to actually click.
    const targetNames = [...new Set(steps.map((s) => s.target).filter(Boolean))];
    for (const name of targetNames) {
      const el = document.createElement('button');
      el.setAttribute('data-tour', name);
      el.textContent = name;
      document.body.appendChild(el);
    }

    render(<OnboardingTour farm={farm} onNavigate={onNavigate} onReset={farm.resetTutorialData} />);

    for (let i = 0; i < steps.length - 1; i += 1) {
      if (i === 0) {
        fireEvent.click(screen.getByRole('button', { name: /start the tour/i }));
        continue;
      }
      const currentStep = steps[i];
      if (currentStep.mode === 'tap') {
        // The "Next"-equivalent button is genuinely disabled for a tap
        // step — advancing means clicking the highlighted target itself,
        // then waiting out the 120ms delay OnboardingTour applies before
        // actually moving to the next step (see the component's onClick
        // handler).
        fireEvent.click(document.querySelector(`[data-tour="${currentStep.target}"]`));
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 150));
      } else {
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
      }
    }

    expect(screen.getByText('You’re ready')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start using mazaosmart/i }));
    expect(farm.resetTutorialData).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(onNavigate).toHaveBeenLastCalledWith('dashboard');
  });
});
