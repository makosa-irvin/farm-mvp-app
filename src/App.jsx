import { useRef, useState } from 'react';
import { TABS } from './constants.js';
import { useFarmData } from './hooks/useFarmData.js';
import { useConfirmDialog } from './hooks/useConfirmDialog.js';
import Header from './layout/Header.jsx';
import MainContent from './layout/MainContent.jsx';
import Toast from './components/Toast.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';

// App root: owns the state everything else hangs off — which tab is
// active, the current toast message, and the confirm-dialog request —
// plus the useFarmData() hook, the single source of truth for all farm
// data. Actual layout and rendering is delegated to Header, MainContent,
// Toast, and ConfirmDialog; App.jsx itself is just composition and state.
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
      <Toast message={toast} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
