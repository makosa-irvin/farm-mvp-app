import { useRef, useState } from 'react';
import AppHeader from './components/AppHeader.jsx';
import AppView from './components/AppView.jsx';
import Toast from './components/Toast.jsx';
import { useFarmData } from './hooks/useFarmData.js';

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
      <AppHeader activeTab={tab} onTabChange={setTab} />

      <main className="mx-auto max-w-3xl px-5 pt-6">
        <AppView tab={tab} farm={farm} onNavigate={setTab} />
      </main>

      <Toast message={toast} />
    </div>
  );
}
