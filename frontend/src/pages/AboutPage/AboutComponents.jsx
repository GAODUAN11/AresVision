import C from '../../constants/colors';
import GlowCard from '../../components/GlowCard';

export const TECH_STACKS = [
  { catKey: 'frontend', color: C.blue,      items: ['React 19', 'Vite', 'Three.js', 'Plotly.js', 'MUI', 'i18n'] },
  { catKey: 'backend',  color: '#4acfac',   items: ['FastAPI', 'SQLAlchemy', 'xarray', 'NumPy / SciPy', 'NetCDF', 'Async services'] },
  { catKey: 'model',    color: C.mars,      items: ['PredRNNv2', 'PyTorch', 'ST-LSTM', 'Channel ablation', 'Test-set metrics'] },
  { catKey: 'data',     color: '#9c7bea',   items: ['MCD 6.1', 'OpenMARS', 'NOMAD', 'Raw MCD 3h', 'Overview cache', '5° grid'] },
];

export const DATA_SOURCE_CARDS = [
  { key: 'mcd', color: C.mars },
  { key: 'openmars', color: C.blue },
  { key: 'nomad', color: '#4acfac' },
];

export const CAPABILITY_CARDS = [
  { key: 'overview', color: C.blue },
  { key: 'uploads', color: '#4acfac' },
  { key: 'training', color: C.mars },
  { key: 'copilot', color: '#9c7bea' },
];

export function TechStackBlock({ t }) {
  return (
    <GlowCard style={{ padding: 32, marginBottom: 24 }}>
      <div style={{ fontSize: 'calc(11px * var(--font-scale, 1))', fontWeight: 700, color: C.mars, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 24, textAlign: 'center' }}>
        {t('about.techStackTitle')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
        {TECH_STACKS.map((stack, i) => (
          <div key={i}>
            <div style={{ fontSize: 'calc(12px * var(--font-scale, 1))', fontWeight: 700, color: stack.color, marginBottom: 12, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>
              {t(`about.techCats.${stack.catKey}`)}
            </div>
            {stack.items.map((item, j) => (
              <div key={j} style={{ fontSize: 'calc(13px * var(--font-scale, 1))', color: C.ice60, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

export function DataSourcesBlock({ t }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 'calc(11px * var(--font-scale, 1))', fontWeight: 700, color: C.mars, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 16, textAlign: 'center' }}>
        {t('about.dataSourcesTitle')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {DATA_SOURCE_CARDS.map((source) => (
          <GlowCard key={source.key} style={{ padding: 24 }}>
            <div style={{ fontSize: 'calc(11px * var(--font-scale, 1))', fontWeight: 700, color: source.color, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 16 }}>
              {t(`about.dataSources.${source.key}.title`)}
            </div>
            <div style={{ fontSize: 'calc(13px * var(--font-scale, 1))', color: C.ice60, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {t(`about.dataSources.${source.key}.content`)}
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  );
}

export function PlatformCapabilitiesBlock({ t }) {
  return (
    <GlowCard style={{ padding: 32, marginBottom: 24 }}>
      <div style={{ fontSize: 'calc(11px * var(--font-scale, 1))', fontWeight: 700, color: C.mars, fontFamily: "'Orbitron', sans-serif", letterSpacing: 2, marginBottom: 24, textAlign: 'center' }}>
        {t('about.capabilitiesTitle')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        {CAPABILITY_CARDS.map((item) => (
          <div key={item.key} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 18, background: 'rgba(255,255,255,0.025)' }}>
            <div style={{ fontSize: 'calc(12px * var(--font-scale, 1))', fontWeight: 800, color: item.color, marginBottom: 10, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>
              {t(`about.capabilities.${item.key}.title`)}
            </div>
            <div style={{ fontSize: 'calc(13px * var(--font-scale, 1))', color: C.ice60, lineHeight: 1.75 }}>
              {t(`about.capabilities.${item.key}.content`)}
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
