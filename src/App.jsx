import { useEffect, useRef, useState } from 'react';
import { TABS } from './constants.js';
import { useFarmData } from './hooks/useFarmData.js';
import { useConfirmDialog } from './hooks/useConfirmDialog.js';
import Header from './layout/Header.jsx';
import MainContent from './layout/MainContent.jsx';
import Toast from './components/Toast.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import OfflineStatus from './components/OfflineStatus.jsx';
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx';
import PWAStatus from './components/PWAStatus.jsx';
import OnboardingTour from './components/OnboardingTour.jsx';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(() => localStorage.getItem('field-ledger-last-saved-at'));
  const toastTimer = useRef(null);
  const showToast = (message) => { setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3800); };
  const { confirm, dialogProps } = useConfirmDialog();
  const farm = useFarmData(showToast, confirm);

  useEffect(() => {
    const onSaved = () => setLastSavedAt(localStorage.getItem('field-ledger-last-saved-at'));
    window.addEventListener('field-ledger-saved', onSaved);
    return () => window.removeEventListener('field-ledger-saved', onSaved);
  }, []);

  return (
    <div className="farm-app min-h-screen pb-16">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:px-3 focus:py-2" style={{ background: 'var(--surface)', color: 'var(--forest)', border: '1px solid var(--line)' }}>Skip to main content</a>
      <Header tabs={TABS} activeTab={tab} onSelectTab={setTab} />
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6 flex flex-wrap justify-end gap-2"><OfflineStatus /><PWAStatus lastSavedAt={lastSavedAt} /></div>
      <MainContent tab={tab} farm={farm} setTab={setTab} />
      <Toast message={toast} />
      <ConfirmDialog {...dialogProps} />
      <PWAInstallPrompt />
      <OnboardingTour farm={farm} activeTab={tab} onNavigate={setTab} onReset={farm.resetTutorialData} />
    </div>
  );
}
