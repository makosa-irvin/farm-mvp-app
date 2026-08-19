import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Boxes, ClipboardList, Home, Settings, Sprout, Wallet, X } from 'lucide-react';

const STORAGE_KEY = 'mazao-onboarding-completed';

const steps = [
  { title: 'Welcome — let’s learn by doing', body: 'We’ll use a small example farm so you can see what Mazaosmart does. The example is temporary and will be removed when you finish.', icon: Sprout, tab: 'dashboard', target: null, mode: 'next' },
  { title: 'Start with a farm group', body: 'Tap More in the bottom menu. Then choose Farm groups. Farm groups are things you manage, like a layer house, dairy cows or a tomato plot.', icon: Home, tab: 'dashboard', target: 'nav-more', mode: 'tap', targetLabel: 'Tap More' },
  { title: 'Choose Farm groups', body: 'Now tap Farm groups in the menu that opened. We will show you an example group so you can see where your farm groups are managed.', icon: Home, tab: 'units', target: 'more-units', mode: 'tap', targetLabel: 'Tap Farm groups' },
  { title: 'Add your stock', body: 'Tap Stock in the bottom menu. Stock is what you have on the farm — for example feed, seed, fertilizer or medicine.', icon: Boxes, tab: 'inventory', target: 'nav-inventory', mode: 'tap', targetLabel: 'Tap Stock' },
  { title: 'Record money you spend', body: 'Tap Expenses. Enter what you paid and what it was for. You can also link the expense to a farm group or stock item.', icon: Wallet, tab: 'expenses', target: 'nav-expenses', mode: 'tap', targetLabel: 'Tap Expenses' },
  { title: 'Record what happened today', body: 'Tap Log. This is your daily farm notebook — record what you produced, lost or used today.', icon: ClipboardList, tab: 'log', target: 'nav-log', mode: 'tap', targetLabel: 'Tap Log' },
  { title: 'See your farm at a glance', body: 'You are already on Home. Look at the example cards below to see how the records you entered become a simple farm overview.', icon: Home, tab: 'dashboard', target: 'nav-dashboard', mode: 'next', targetLabel: 'Next' },
  { title: 'Understand your trends', body: 'Tap More, then Analytics. This turns your records into simple trends and comparisons so you can see how the farm is doing.', icon: BarChart3, tab: 'analytics', target: 'nav-more', mode: 'tap', targetLabel: 'Tap More' },
  { title: 'Open Analytics', body: 'Choose Analytics from the menu. The example data is already populated so you can see what this page is for.', icon: BarChart3, tab: 'analytics', target: 'more-analytics', mode: 'tap', targetLabel: 'Tap Analytics' },
  { title: 'View your reports', body: 'Now tap More again, then Reports. Reports bring the important farm numbers together in one place.', icon: ClipboardList, tab: 'reports', target: 'nav-more', mode: 'tap', targetLabel: 'Tap More' },
  { title: 'Open Reports', body: 'Choose Reports from the menu. The example gives the report something useful to show.', icon: ClipboardList, tab: 'reports', target: 'more-reports', mode: 'tap', targetLabel: 'Tap Reports' },
  { title: 'Settings & backup', body: 'Finally, tap More and open Settings. This is where you can back up and restore your farm records.', icon: Settings, tab: 'settings', target: 'nav-more', mode: 'tap', targetLabel: 'Tap More' },
  { title: 'Open Settings', body: 'Choose Settings. Make a backup regularly so your farm records are safe.', icon: Settings, tab: 'settings', target: 'more-settings', mode: 'tap', targetLabel: 'Tap Settings' },
  { title: 'You’re ready', body: 'The example farm will now be removed. Your real records will not be touched. Start with your first farm group and record what happens each day.', icon: Sprout, tab: 'dashboard', target: null, mode: 'finish', targetLabel: 'Start using Mazaosmart' },
];

/** Mobile-first learn-by-doing onboarding. The bottom sheet sits above the
 * persistent mobile navigation, while the current navigation target receives
 * a visible focus treatment instead of dimming the application. */
export default function OnboardingTour({ farm, onNavigate, onReset }) {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'true');
  const [step, setStep] = useState(0);
  const [examplesReady, setExamplesReady] = useState(false);

  useEffect(() => {
    const showTour = () => { setStep(0); setExamplesReady(false); setOpen(true); onNavigate('dashboard'); };
    window.addEventListener('mazao-show-onboarding', showTour);
    return () => window.removeEventListener('mazao-show-onboarding', showTour);
  }, [onNavigate]);

  useEffect(() => {
    if (!open || !steps[step].target) return undefined;
    const target = document.querySelector(`[data-tour="${steps[step].target}"]`);
    if (!target) return undefined;
    const previous = { boxShadow: target.style.boxShadow, position: target.style.position, zIndex: target.style.zIndex };
    target.classList.add('mazao-tour-target');
    target.style.boxShadow = '0 0 0 3px var(--forest), 0 0 0 7px color-mix(in srgb, var(--forest) 18%, transparent)';
    target.style.position = 'relative';
    target.style.zIndex = '110';
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    const onClick = () => {
      if (steps[step].mode !== 'tap') return;
      window.setTimeout(() => {
        const nextStep = step + 1;
        if (nextStep < steps.length) { setStep(nextStep); onNavigate(steps[nextStep].tab); }
      }, 120);
    };
    target.addEventListener('click', onClick);
    return () => {
      target.classList.remove('mazao-tour-target');
      target.style.boxShadow = previous.boxShadow;
      target.style.position = previous.position;
      target.style.zIndex = previous.zIndex;
      target.removeEventListener('click', onClick);
    };
  }, [open, step, onNavigate]);

  if (!open) return null;
  const current = steps[step];
  const Icon = current.icon;
  const menuStep = current.target?.startsWith('more-');

  function finish(completed = false) {
    onReset();
    if (completed) localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    onNavigate('dashboard');
  }

  function next() {
    if (step === 0) { farm.seedTutorialData(); setExamplesReady(true); }
    if (step === steps.length - 1) { finish(true); return; }
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
    <div className={`fixed inset-x-0 z-[100] px-2 sm:px-4 ${menuStep ? 'top-20 sm:top-auto sm:bottom-4' : 'bottom-[calc(4.7rem+env(safe-area-inset-bottom))] sm:bottom-4'}`} role="dialog" aria-modal="false" aria-labelledby="mazao-onboarding-title">
      <section className="mx-auto w-full max-w-2xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_-8px_35px_rgba(0,0,0,0.14)]" style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--forest-tint)', color: 'var(--forest)' }}><Icon size={18} /></div>
          <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><div className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--forest)' }}>Getting started · {step + 1}/{steps.length}</div><button type="button" onClick={() => finish(false)} className="p-1 rounded-lg shrink-0" aria-label="Close tutorial"><X size={17} /></button></div><h2 id="mazao-onboarding-title" className="font-display text-base sm:text-xl font-semibold leading-tight mt-0.5">{current.title}</h2><p className="text-[11px] sm:text-sm leading-4 sm:leading-5 mt-1" style={{ color: 'var(--ink-soft)' }}>{current.body}</p></div>
        </div>
        {examplesReady && step >= 6 && step <= 10 && <div className="mt-2.5 flex gap-1.5 overflow-x-auto" aria-label="Example data loaded">{['50 layers', '30 trays', 'KSh 5,250 costs', '50 kg stock'].map((item) => <span key={item} className="text-[9px] sm:text-xs px-2 py-1 rounded-full whitespace-nowrap" style={{ background: 'var(--forest-tint)', color: 'var(--forest)' }}>{item}</span>)}</div>}
        <div className="flex items-center justify-between gap-2 mt-2.5"><button type="button" onClick={() => finish(false)} className="text-[11px] sm:text-sm px-1 py-2" style={{ color: 'var(--ink-soft)' }}>Skip</button><div className="flex items-center gap-1.5">{step > 0 && <button type="button" onClick={back} className="btn-ghost rounded-xl px-2.5 py-2 text-[11px] sm:text-sm inline-flex items-center gap-1"><ArrowLeft size={14} /> Back</button>}<button type="button" onClick={next} disabled={current.mode === 'tap'} className="btn-primary rounded-xl px-3.5 py-2 text-[11px] sm:text-sm inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-default">{current.mode === 'tap' ? current.targetLabel : current.mode === 'finish' ? current.targetLabel : step === 0 ? 'Start the tour' : 'Next'}{current.mode !== 'finish' && <ArrowRight size={14} />}</button></div></div>
      </section>
    </div>
  );
}

export { STORAGE_KEY };
