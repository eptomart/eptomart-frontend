// ============================================
// EPTOMART HOME — Tab switcher wrapper
// ============================================
// Mounted at "/" (see App.jsx) in place of Home directly. Home.jsx itself
// is completely untouched — when neither extra tab is enabled (the
// default), this wrapper renders <Home /> and nothing else, so existing
// users see zero difference from today.
//
// Only when Koyambedu admin turns on Bulk Harvest and/or News (same
// on/off switches as before — see BulkHarvestTab.jsx / NewsTab.jsx in the
// Koyambedu admin panel) does a slim tab bar appear above the page,
// letting visitors switch between "Home" (unchanged), "Bulk Harvest" and
// "News" — page 1 / page 2 style, same content area swapped per tab.
import { useState, useEffect } from 'react';
import { FiHome, FiZap, FiFileText } from 'react-icons/fi';
import api from '../utils/api';
import Home from './Home';
import KoyambeduBulkHarvestPage from './koyambedu/KoyambeduBulkHarvestPage';
import KoyambeduNewsPage from './koyambedu/KoyambeduNewsPage';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const TABS = [
  { id: 'home', label: 'Home', icon: <FiHome size={13} /> },
  { id: 'bulk-harvest', label: 'Bulk Harvest from Farmers', icon: <FiZap size={13} /> },
  { id: 'news', label: 'News', icon: <FiFileText size={13} /> },
];

export default function HomeTabs() {
  const [flags, setFlags] = useState(null); // null = still loading
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    api.get('/koyambedu/home-tabs/status')
      .then(({ data }) => setFlags({ bulkHarvestEnabled: !!data.bulkHarvestEnabled, newsEnabled: !!data.newsEnabled }))
      .catch(() => setFlags({ bulkHarvestEnabled: false, newsEnabled: false }));
  }, []);

  // While loading, or when both extra tabs are off, render Home exactly
  // as it always has — no wrapper chrome, no layout shift.
  if (!flags || (!flags.bulkHarvestEnabled && !flags.newsEnabled)) {
    return <Home />;
  }

  const visibleTabs = TABS.filter(t => t.id === 'home' || (t.id === 'bulk-harvest' && flags.bulkHarvestEnabled) || (t.id === 'news' && flags.newsEnabled));

  return (
    <div>
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex max-w-6xl mx-auto">
          {visibleTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center text-center gap-1.5 py-2.5 px-1.5 text-[11px] leading-tight font-bold transition ${
                activeTab === t.id ? 'text-green-800 border-b-2 border-green-600' : 'text-gray-700 border-b-2 border-transparent'
              }`}
            >
              {t.icon} <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'home' && <Home />}

      {activeTab === 'bulk-harvest' && (
        <>
          <Navbar />
          <KoyambeduBulkHarvestPage />
          <Footer />
        </>
      )}

      {activeTab === 'news' && (
        <>
          <Navbar />
          <KoyambeduNewsPage />
          <Footer />
        </>
      )}
    </div>
  );
}
