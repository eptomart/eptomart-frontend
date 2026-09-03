// ============================================
// KOYAMBEDU HOME — Tab switcher wrapper
// ============================================
// Mounted at /koyambedu (see App.jsx) in place of KoyambeduHome directly.
// KoyambeduHome.jsx itself is completely untouched — when neither extra
// tab is enabled (the default), this wrapper renders <KoyambeduHome />
// and nothing else, so existing users see zero difference from today.
//
// Only when Koyambedu admin turns on Bulk Harvest and/or News (see
// BulkHarvestTab.jsx / NewsTab.jsx in the admin panel) does a slim tab
// bar appear above the page, letting customers switch between
// "Koyambedu Daily" (unchanged), "Bulk Harvest" and "News" — page 1 /
// page 2 style, same content area swapped per tab.
import { useState, useEffect } from 'react';
import { FiLeaf, FiZap, FiFileText } from 'react-icons/fi';
import api from '../../utils/api';
import KoyambeduHome from './KoyambeduHome';
import KoyambeduBulkHarvestPage from './KoyambeduBulkHarvestPage';
import KoyambeduNewsPage from './KoyambeduNewsPage';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

const TABS = [
  { id: 'daily', label: 'Koyambedu Daily', icon: <FiLeaf size={13} /> },
  { id: 'bulk-harvest', label: 'Bulk Harvest', icon: <FiZap size={13} /> },
  { id: 'news', label: 'News', icon: <FiFileText size={13} /> },
];

export default function KoyambeduHomeTabs() {
  const [flags, setFlags] = useState(null); // null = still loading
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    api.get('/koyambedu/home-tabs/status')
      .then(({ data }) => setFlags({ bulkHarvestEnabled: !!data.bulkHarvestEnabled, newsEnabled: !!data.newsEnabled }))
      .catch(() => setFlags({ bulkHarvestEnabled: false, newsEnabled: false }));
  }, []);

  // While loading, or when both extra tabs are off, render Koyambedu Daily
  // exactly as it always has — no wrapper chrome, no layout shift.
  if (!flags || (!flags.bulkHarvestEnabled && !flags.newsEnabled)) {
    return <KoyambeduHome />;
  }

  const visibleTabs = TABS.filter(t => t.id === 'daily' || (t.id === 'bulk-harvest' && flags.bulkHarvestEnabled) || (t.id === 'news' && flags.newsEnabled));

  return (
    <div>
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex max-w-6xl mx-auto">
          {visibleTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition ${
                activeTab === t.id ? 'text-green-700 border-b-2 border-green-600' : 'text-gray-400 border-b-2 border-transparent'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'daily' && <KoyambeduHome />}

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
