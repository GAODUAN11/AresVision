import { useEffect, useMemo, useState } from 'react';
import C from '../constants/colors';
import { useT } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import SectionTitle from '../components/SectionTitle';
import GlowCard from '../components/GlowCard';
import { AdminReviewWorkspace } from '../components/AdminReviewPanel';
import DefaultDatasetTab from './ExplorePage/DefaultDatasetTab';
import MyDataTab from './ExplorePage/MyDataTab';

function createCopy(isZh) {
  return {
    tabOfficial: isZh ? '官方数据源' : 'Official Data Sources',
    tabOfficialDesc: isZh ? '查看 MCD / OpenMARS / NOMAD 官方状态与作用' : 'View MCD / OpenMARS / NOMAD status and roles',
    tabPersonal: isZh ? '个人数据管理' : 'Personal Data Management',
    tabPersonalDesc: isZh ? '上传、查看、删除个人三类原始数据，并选择是否贡献' : 'Upload, inspect, delete, and optionally contribute personal raw datasets',
    tabAdmin: isZh ? '管理员审核' : 'Admin Review',
    tabAdminDesc: isZh ? '审核用户同意贡献的数据源' : 'Review user-contributed data sources',
    quickTitle: isZh ? '任务导航' : 'Task Navigation',
    quickDesc: isZh
      ? '数据管理按官方数据、个人数据、管理员审核三类任务组织。'
      : 'Data Management is organized by official sources, personal data, and admin review.',
  };
}

function ViewTab({ active, label, desc, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        border: `1px solid ${active ? accent : C.border}`,
        borderRadius: 16,
        padding: '16px 18px',
        background: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          fontSize: 'calc(10px * var(--font-scale, 1))',
          color: active ? accent : C.ice30,
          fontWeight: 700,
          letterSpacing: 1.8,
          fontFamily: "'Orbitron', sans-serif",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 'calc(12px * var(--font-scale, 1))', color: C.ice60, lineHeight: 1.7 }}>{desc}</div>
    </button>
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
      { key: 'official', label: copy.tabOfficial, desc: copy.tabOfficialDesc, accent: C.blue },
      { key: 'personal', label: copy.tabPersonal, desc: copy.tabPersonalDesc, accent: C.green },
    ];
    return isAdmin ? [...baseViews, { key: 'admin', label: copy.tabAdmin, desc: copy.tabAdminDesc, accent: '#f59e0b' }] : baseViews;
  }, [copy, isAdmin]);

  return (
    <div className="page-enter" style={{ padding: '100px 40px 60px', maxWidth: 1400, margin: '0 auto' }}>
      <SectionTitle title={t('explore.title')} subtitle={t('explore.subtitle')} />

      <GlowCard style={{ padding: '18px 20px', marginTop: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div
              style={{
                fontSize: 'calc(11px * var(--font-scale, 1))',
                fontWeight: 700,
                color: C.blue,
                fontFamily: "'Orbitron', sans-serif",
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              {copy.quickTitle}
            </div>
            <div style={{ fontSize: 'calc(12px * var(--font-scale, 1))', color: C.ice30, lineHeight: 1.8 }}>{copy.quickDesc}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          {views.map((view) => (
            <ViewTab
              key={view.key}
              active={activeView === view.key}
              label={view.label}
              desc={view.desc}
              accent={view.accent}
              onClick={() => setActiveView(view.key)}
            />
          ))}
        </div>
      </GlowCard>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {activeView === 'official' && <DefaultDatasetTab />}

        {activeView === 'personal' && <MyDataTab reviewSignal={reviewSignal} />}

        {activeView === 'admin' && isAdmin && <AdminReviewWorkspace onReviewComplete={onReviewComplete} reviewSignal={reviewSignal} />}
      </div>
    </div>
  );
}
