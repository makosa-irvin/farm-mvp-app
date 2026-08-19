import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Sprout, Wallet, WifiOff, X } from 'lucide-react';
import { todayISO } from '../lib/helpers.js';

const STORAGE_KEY = 'mazao-onboarding-completed';
const TUTORIAL_UNIT_ID = 'tutorial_unit_mazao';
const TUTORIAL_LOG_ID = 'tutorial_log_mazao';

/**
 * Small, local-first onboarding tour designed for first-time farmers.
 * It uses the real app navigation and a clearly marked temporary example
 * record instead of screenshots or a remote tutorial service.
 */
export default function OnboardingTour({ farm, onNavigate, onReset }) {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'true');
  const [step, setStep] = useState(0);
  const [exampleAdded, setExampleAdded] = useState(() => Boolean(farm.units.some((unit) => unit.tutorial)));

  useEffect(() => {
    const showTour = () => {
      setStep(0);
      setExampleAdded(false);
      setOpen(true);
      onNavigate('dashboard');
    };
    window.addEventListener('mazao-show-onboarding', showTour);
    return () => window.removeEventListener('mazao-show-onboarding', showTour);
  }, [onNavigate]);

  useEffect(() => {
    if (farm.units.some((unit) => unit.tutorial)) setExampleAdded(true);
  }, [farm.units]);

  if (!open) return null;

  const steps = [
    {
      title: 'Welcome to Mazaosmart',
      body: 'Think of Mazaosmart as your farm notebook. We will show you the important parts in a few simple steps.',
      icon: Sprout,
      tab: 'dashboard',
    },
    {
      title: 'Start with the Dashboard',
      body: 'This is your farm at a glance. You can see what you produced, what you spent, and what needs your attention.',
      icon: Sprout,
      tab: 'dashboard',
    },
    {
      title: 'See how it works',
      body: exampleAdded
        ? 'We added a small example farm record. Look at the dashboard — the numbers changed because something was recorded.'
        : 'Tap the button below and we will add a temporary example. It is not your real farm data and will be removed when you finish.',
      icon: CheckCircle2,
      tab: 'dashboard',
    },
    {
      title: 'Record what happens today',
      body: 'Use Daily log when you collect eggs, harvest crops, milk cows, or record losses. You do not need accounting knowledge.',
      icon: ClipboardList,
      tab: 'log',
    },
    {
      title: 'Keep track of money and stock',
      body: 'Expenses records money you spend. Stock tells you what you have left. Use them when you buy feed, fertilizer, medicine or other supplies.',
      icon: Wallet,
      tab: 'expenses',
    },
    {
      title: 'You can use it without internet',
      body: 'Mazaosmart is designed to keep working when the connection is poor. Your records are saved on this device. You can back them up from Settings.',
      icon: WifiOff,
      tab: 'settings',
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  function closeTutorial(completed = false) {
    if (exampleAdded) onReset();
    if (completed) localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  }

  function next() {
    if (step === 2 && !exampleAdded) {
      const unit = {
        id: TUTORIAL_UNIT_ID,
        name: 'Example tomato plot',
        type: 'crop',
        initialCount: 1,
        producePrice: 150,
        startDate: todayISO(),
        createdAt: Date.now(),
        tutorial: true,
      };
      farm.addUnit(unit);
      farm.addLog({
        id: TUTORIAL_LOG_ID,
        unitId: unit.id,
        date: todayISO(),
        produced: 20,
        grades: null,
        loss: 0,
        feedKg: 0,
        feedQuantity: 0,
        feedItemId: null,
        mortality: 0,
        notes: 'Temporary Mazaosmart tutorial example.',
        createdAt: Date.now(),
        tutorial: true,
      }, unit);
      setExampleAdded(true);
      onNavigate('dashboard');
      return;
    }

    if (step === steps.length - 1) {
      closeTutorial(true);
      return;
    }

    const nextStep = step + 1;
    setStep(nextStep);
    onNavigate(steps[nextStep].tab);
  }

  function back() {
    if (step === 0) return;
    const previous = step - 1;
    setStep(previous);
    onNavigate(steps[previous].tab);
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="mazao-onboarding-title">
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-x-4 bottom-4 sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[min(32rem,calc(100%-2rem))] sm:-translate-x-1/2">
        <section className="rounded-3xl p-5 sm:p-6 shadow-2xl" style={{ background: 'var(--surface)', color: 'var(--ink)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--forest-tint)', color: 'var(--forest)' }}>
              <Icon size={22} />
            </div>
            <button type="button" onClick={() => closeTutorial(false)} className="p-2 rounded-xl" aria-label="Close tutorial">
              <X size={19} />
            </button>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--forest)' }}>
              Step {step + 1} of {steps.length}
            </div>
            <h2 id="mazao-onboarding-title" className="font-display text-2xl font-semibold mt-1">{current.title}</h2>
            <p className="text-sm leading-6 mt-2" style={{ color: 'var(--ink-soft)' }}>{current.body}</p>
          </div>

          {step === 2 && exampleAdded && (
            <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: 'var(--forest-tint)', border: '1px solid var(--line)' }}>
              <strong>Example:</strong> 20 kg of tomatoes were recorded at KSh 150 per kg. The example is temporary and will not remain in your farm records.
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-6">
            <button type="button" onClick={() => closeTutorial(false)} className="text-sm px-2 py-2" style={{ color: 'var(--ink-soft)' }}>
              Skip
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" onClick={back} className="btn-ghost rounded-xl px-3.5 py-2.5 inline-flex items-center gap-1.5 text-sm">
                  <ArrowLeft size={15} /> Back
                </button>
              )}
              <button type="button" onClick={next} className="btn-primary rounded-xl px-4 py-2.5 inline-flex items-center gap-1.5 text-sm">
                {step === 2 && !exampleAdded ? 'Show me an example' : step === steps.length - 1 ? 'Start using Mazaosmart' : 'Next'}
                {step !== 2 && step !== steps.length - 1 && <ArrowRight size={15} />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export { STORAGE_KEY, TUTORIAL_UNIT_ID, TUTORIAL_LOG_ID };
