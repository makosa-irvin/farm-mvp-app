import { useRef, useState } from 'react';
import { TABS } from './constants.js';
import { useFarmData } from './hooks/useFarmData.js';
import Header from './layout/Header.jsx';
import MainContent from './layout/MainContent.jsx';
import Toast from './components/Toast.jsx';

// App root: owns the two pieces of state everything else hangs off —
// which tab is active, and the current toast message — plus the
// useFarmData() hook, which is the single source of truth for all farm
// data. Actual layout and rendering is delegated to Header, MainContent,
// and Toast; App.jsx itself is just composition and the two bits of state
// above.
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

  const farm = useFarmData(showToast);

  return (
    <div className="farm-app min-h-screen pb-16">
      <Header tabs={TABS} activeTab={tab} onSelectTab={setTab} />
      <MainContent tab={tab} farm={farm} setTab={setTab} />
      <Toast message={toast} />
    </div>
  );
}
