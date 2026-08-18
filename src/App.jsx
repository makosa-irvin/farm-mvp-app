import { useRef, useState } from 'react';
import { TABS } from './constants.js';
import { useFarmData } from './hooks/useFarmData.js';
import { useConfirmDialog } from './hooks/useConfirmDialog.js';
import Header from './layout/Header.jsx';
import MainContent from './layout/MainContent.jsx';
import Toast from './components/Toast.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import MobileQuickActions from './components/MobileQuickActions.jsx';

// App root owns navigation and global feedback state. Mobile-specific
// navigation/actions remain presentation concerns so the farm data model
// stays unchanged.
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message) => {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => setToast(null), 3800);
  };

  const { confirm, dialogProps } = useConfirmDialog();
  const farm = useFarmData(showToast, confirm);

  return (
    <div className="farm-app min-h-screen pb-16">
      <Header tabs={TABS} activeTab={tab} onSelectTab={setTab} />
      <MainContent tab={tab} farm={farm} setTab={setTab} />
      <MobileQuickActions onNavigate={setTab} />
      <Toast message={toast} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
