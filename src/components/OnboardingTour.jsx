import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Boxes, ClipboardList, Home, Settings, Sprout, Wallet, X } from 'lucide-react';

const STORAGE_KEY = 'mazao-onboarding-completed';

/**
 * Compact, learn-by-doing onboarding for first-time farmers.
 * The application remains fully visible and usable behind a small bottom
 * sheet; no dark overlay or screenshot-like tour is used on mobile.
 */
export default function OnboardingTour({ farm, onNavigate, onReset }) {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'true');
  const [step, setStep] = useState(0);
  const [examplesReady, setExamplesReady] = useState(false);

  useEffect(() => {
    const showTour = () => {
      setStep(0);
      setExamplesReady(true);
      setOpen(true);
      onNavigate('dashboard');
    };
    window.addEventListener('mazao-show-onboarding', showTour);
    return () => window.removeEventListener('mazao-show-onboarding', showTour);
  }, [onNavigate]);

  if (!open) return null;

  const steps = [
    { title: 'Welcome — let’s learn by doing', body: 'We’ll set up a small example farm and walk through what to tap. The example is temporary and will be removed when you finish.', icon: Sprout, tab: 'dashboard' },
    { title: '1. Add a farm group', body: 'Tap More → Farm groups. Add something you manage, such as “Layer House A”, “My Dairy Cows”, or “Tomato Plot”. This is where your records start.', icon: Home, tab: 'units', action: 'Open Farm groups' },
    { title: '2. Add your stock', body: 'Tap More → Stock. Add things you keep on the farm, such as feed, seed, fertilizer or medicine. Enter what you have now.', icon: Boxes, tab: 'inventory', action: 'Open Stock' },
    { title: '3. Record money you spend', body: 'Tap Expenses. Enter what you paid, what it was for, and optionally which farm group it belongs to. You do not need accounting knowledge.', icon: Wallet, tab: 'expenses', action: 'Open Expenses' },
    { title: '4. Record what happened today', body: 'Tap Log. Choose your farm group and record what you produced, lost, or used. This is your daily farm notebook.', icon: ClipboardList, tab: 'log', action: 'Open Daily Log' },
    { title: '5. See your farm at a glance', body: 'Now look at Home. The example records make the dashboard useful: production, costs, stock and farm alerts have something to show.', icon: Home, tab: 'dashboard', action: 'Show me the dashboard' },
    { title: '6. Understand the bigger picture', body: 'Analytics turns your records into simple trends and comparisons. Reports give you a useful summary you can review or share.', icon: BarChart3, tab: 'analytics', action: 'Show Analytics' },
    { title: '7. Reports', body: 'Reports bring the important numbers together. Think of this as your farm’s printable summary — not an accounting exam.', icon: ClipboardList, tab: 'reports', action: 'Show Reports' },
    { title: '8. Settings & backup', body: 'Settings is where you can back up your records, restore them, and manage important app options. Make a backup regularly.', icon: Settings, tab: 'settings', action: 'Open Settings' },
    { title: 'You’re ready', body: 'The example farm will now be removed. Your real records will not be touched. Start with your first farm group, then record what happens each day.', icon: Sprout, tab: 'dashboard', action: 'Start using Mazaosmart' },
  ];

  const current = steps[step];
  const Icon = current.icon;

  function finish(completed = false) {
    onReset();
    if (completed) localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    onNavigate('dashboard');
  }

  function next() {
    if (step === 0 && !examplesReady) setExamplesReady(true);
    if (step === 0) {
      farm.seedTutorialData();
      setExamplesReady(true);
      setStep(1);
      onNavigate('units');
      return;
    }
    if (step === steps.length - 1) {
      finish(true);
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
    <div className="fixed inset-x-0 bottom-0 z-[100] px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:px-4" role="dialog" aria-modal="false" aria-labelledby="mazao-onboarding-title">
      <section className="mx-auto w-full max-w-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_-8px_35px_rgba(0,0,0,0.14)]" style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--forest-tint)', color: 'var(--forest)' }}><Icon size={19} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--forest)' }}>Getting started · {step + 1}/{steps.length}</div>
              <button type="button" onClick={() => finish(false)} className="p-1.5 rounded-lg shrink-0" aria-label="Close tutorial"><X size={17} /></button>
            </div>
            <h2 id="mazao-onboarding-title" className="font-display text-lg sm:text-xl font-semibold leading-tight mt-0.5">{current.title}</h2>
            <p className="text-xs sm:text-sm leading-5 mt-1" style={{ color: 'var(--ink-soft)' }}>{current.body}</p>
          </div>
        </div>

        {step === 0 && (
          <div className="mt-3 rounded-xl px-3 py-2.5 text-xs" style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}>
            <strong>Tip:</strong> You will see the real app behind this card. Follow the highlighted instruction, then come back here and tap Next.
          </div>
        )}

        {step >= 5 && step <= 7 && (
          <div className="mt-3 flex gap-1.5" aria-label="Example data loaded">
            {['50 layers', '30 trays', 'KSh 5,250 costs', '50 kg stock'].map((item) => <span key={item} className="text-[10px] sm:text-xs px-2 py-1 rounded-full" style={{ background: 'var(--forest-tint)', color: 'var(--forest)' }}>{item}</span>)}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-3">
          <button type="button" onClick={() => finish(false)} className="text-xs sm:text-sm px-1.5 py-2" style={{ color: 'var(--ink-soft)' }}>Skip tour</button>
          <div className="flex items-center gap-1.5">
            {step > 0 && <button type="button" onClick={back} className="btn-ghost rounded-xl px-3 py-2 text-xs sm:text-sm inline-flex items-center gap-1"><ArrowLeft size={14} /> Back</button>}
            <button type="button" onClick={next} className="btn-primary rounded-xl px-3.5 py-2 text-xs sm:text-sm inline-flex items-center gap-1.5">
              {step === 0 ? 'Start the tour' : current.action || 'Next'}
              {step !== steps.length - 1 && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export { STORAGE_KEY };
