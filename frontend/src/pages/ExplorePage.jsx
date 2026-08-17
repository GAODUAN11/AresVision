import { useEffect, useMemo, useState } from 'react';
import C from '../constants/colors';
import { useT } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import SectionTitle from '../components/SectionTitle';
import { AdminReviewWorkspace } from '../components/AdminReviewPanel';
import DefaultDatasetTab from './ExplorePage/DefaultDatasetTab';
import MyDataTab from './ExplorePage/MyDataTab';

function createCopy(isZh) {
  return {
    tabOfficial: isZh ? '官方数据源' : 'Official Data Sources',
    tabPersonal: isZh ? '个人数据管理' : 'Personal Data Management',
    tabAdmin: isZh ? '管理员审核' : 'Admin Review',
  };
}

function CompactTaskTabs({ views, activeView, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        padding: 6,
        marginTop: 18,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.025)',
      }}
    >
      {views.map((view) => {
        const active = activeView === view.key;
        return (
          <button
            key={view.key}
            onClick={() => onChange(view.key)}
            style={{
              minHeight: 44,
              padding: '10px 16px',
              border: `1px solid ${active ? view.accent : 'transparent'}`,
              borderRadius: 9,
              background: active ? `${view.accent}18` : 'transparent',
              color: active ? view.accent : C.ice60,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'calc(12px * var(--font-scale, 1))',
              fontWeight: 700,
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
            }}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ExplorePage({ onReviewComplete, reviewSignal = 0 }) {
  const t = useT();
  const { user } = useAuth();
  const { settings } = useSettings();
  const isZh = settings.language !== 'en';
  const isAdmin = user?.role === 'admin';
  const copy = useMemo(() => createCopy(isZh), [isZh]);
  const [activeView, setActiveView] = useState('official');

  useEffect(() => {
    if (!isAdmin && activeView === 'admin') setActiveView('official');
  }, [activeView, isAdmin]);

  const views = useMemo(() => {
    const baseViews = [
      { key: 'official', label: copy.tabOfficial, accent: C.blue },
      { key: 'personal', label: copy.tabPersonal, accent: C.green },
    ];
    return isAdmin ? [...baseViews, { key: 'admin', label: copy.tabAdmin, accent: '#f59e0b' }] : baseViews;
  }, [copy, isAdmin]);

  return (
    <div className="page-enter" style={{ padding: '100px 40px 60px', maxWidth: 1400, margin: '0 auto' }}>
      <SectionTitle title={t('explore.title')} subtitle={t('explore.subtitle')} />

      <CompactTaskTabs views={views} activeView={activeView} onChange={setActiveView} />

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {activeView === 'official' && <DefaultDatasetTab />}

        {activeView === 'personal' && <MyDataTab reviewSignal={reviewSignal} />}

        {activeView === 'admin' && isAdmin && <AdminReviewWorkspace onReviewComplete={onReviewComplete} reviewSignal={reviewSignal} />}
      </div>
    </div>
  );
}
