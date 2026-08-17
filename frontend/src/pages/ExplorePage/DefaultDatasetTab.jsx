import { useCallback, useEffect, useMemo, useState } from 'react';
import C from '../../constants/colors';
import { useT } from '../../i18n';
import GlowCard from '../../components/GlowCard';
import { fetchOverviewInfo } from '../../services/api';
import { LoadingBox } from './ExploreComponents';

const OFFICIAL_SOURCE_CARDS = [
  {
    key: 'mcd',
    title: 'MCD 6.1',
    subtitleKey: 'mcdSubtitle',
    bodyKey: 'mcdBody',
    tagKeys: ['fullOverview', 'environmentDrivers', 'lsGrid'],
    accent: C.mars,
  },
  {
    key: 'openmars',
    title: 'OpenMARS',
    subtitleKey: 'openmarsSubtitle',
    bodyKey: 'openmarsBody',
    tagKeys: ['o3Column', 'globalField', 'lsTime'],
    accent: C.blue,
  },
  {
    key: 'nomad',
    title: 'NOMAD',
    subtitleKey: 'nomadSubtitle',
    bodyKey: 'nomadBody',
    tagKeys: ['o3Column', 'observationCount', 'validationLayer'],
    accent: C.green,
  },
];

function formatLs(v) {
  return Number.isFinite(v) ? `${Number(v).toFixed(1)}°` : '--';
}

function pct(value) {
  return `${Math.max(0, Math.min(100, Number(value || 0))).toFixed(0)}%`;
}

function intervalSpan(interval) {
  const start = Number(interval?.start);
  const end = Number(interval?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  const span = end >= start ? end - start : (360 - start) + end;
  return Math.max(0, Math.min(360, span));
}

function summarizeSourceCoverage(sourceCoverage = {}) {
  const rows = Object.entries(sourceCoverage || {})
    .map(([year, intervals]) => {
      const normalizedIntervals = Array.isArray(intervals) ? intervals : [];
      const span = Math.min(360, normalizedIntervals.reduce((sum, interval) => sum + intervalSpan(interval), 0));
      return {
        year: Number(year),
        intervals: normalizedIntervals,
        segmentCount: normalizedIntervals.length,
        coverage: (span / 360) * 100,
      };
    })
    .filter((row) => Number.isFinite(row.year))
    .sort((a, b) => a.year - b.year);

  const yearCount = rows.length;
  const segmentCount = rows.reduce((sum, row) => sum + row.segmentCount, 0);
  const avgCoverage = yearCount
    ? rows.reduce((sum, row) => sum + row.coverage, 0) / yearCount
    : 0;
  const yearRange = yearCount === 0
    ? '--'
    : rows[0].year === rows[yearCount - 1].year
      ? `MY ${rows[0].year}`
      : `MY ${rows[0].year} - MY ${rows[yearCount - 1].year}`;

  return {
    rows,
    yearCount,
    segmentCount,
    avgCoverage,
    yearRange,
    hasData: yearCount > 0,
  };
}

function buildSourceCoverageStats(dataInfo) {
  const coverage = dataInfo?.ozone_capabilities?.coverage || {};
  return {
    mcd: summarizeSourceCoverage(coverage?.mcd),
    openmars: summarizeSourceCoverage(coverage?.openmars),
    nomad: summarizeSourceCoverage(coverage?.nomad),
  };
}

function SourceStat({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 'calc(10px * var(--font-scale, 1))', color: C.ice30, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'calc(13px * var(--font-scale, 1))', color: accent, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function SourceCard({ title, subtitle, tags, body, stats, accent = C.blue, loading, t }) {
  const statusLabel = loading
    ? t('common.loading')
    : stats?.hasData
      ? t('explore.defaultDataset.labelOfficial')
      : t('common.noData');
  const statusColor = stats?.hasData ? C.green : C.ice30;

  return (
    <div
      style={{
        border: `1px solid ${accent}33`,
        borderRadius: 14,
        padding: '15px 16px',
        background: `linear-gradient(135deg, ${accent}10, rgba(255,255,255,0.02))`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 214,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div
            style={{
              fontSize: 'calc(12px * var(--font-scale, 1))',
              fontWeight: 700,
              color: accent,
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: 1.2,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 'calc(11px * var(--font-scale, 1))', color: C.ice30, marginTop: 3 }}>{subtitle}</div>
        </div>
        <span
          style={{
            alignSelf: 'flex-start',
            fontSize: 'calc(10px * var(--font-scale, 1))',
            color: statusColor,
            padding: '3px 8px',
            borderRadius: 999,
            border: `1px solid ${statusColor}33`,
            background: `${statusColor}12`,
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <SourceStat label={t('explore.defaultDataset.metricCoverageLabel')} value={loading ? '--' : stats.yearRange} accent={accent} />
        <SourceStat label={t('explore.defaultDataset.coverageAvg')} value={loading ? '--' : pct(stats.avgCoverage)} accent={accent} />
        <SourceStat label={t('explore.defaultDataset.metaLsRange')} value={loading ? '--' : stats.segmentCount} accent={accent} />
      </div>

      <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
        <div
          style={{
            width: loading ? '0%' : `${Math.max(3, stats.avgCoverage)}%`,
            height: '100%',
            background: stats?.hasData ? accent : C.ice30,
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 'calc(10px * var(--font-scale, 1))',
              color: C.ice60,
              padding: '3px 8px',
              borderRadius: 999,
              border: `1px solid ${accent}2e`,
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div style={{ fontSize: 'calc(11px * var(--font-scale, 1))', color: C.ice60, lineHeight: 1.75 }}>{body}</div>
    </div>
  );
}

function OfficialSourceSituationGrid({ loading, error, onRetry, sourceCoverageStats, t }) {
  return (
    <GlowCard style={{ padding: '18px 20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: 'calc(11px * var(--font-scale, 1))',
            fontWeight: 700,
            color: C.blue,
            fontFamily: "'Orbitron', sans-serif",
            letterSpacing: 2,
          }}
        >
          {t('explore.defaultDataset.sourceTitle')}
        </div>
        {error && (
          <button
            onClick={onRetry}
            style={{
              minHeight: 36,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '5px 12px',
              background: 'rgba(255,255,255,0.03)',
              color: C.ice60,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('common.retry')}
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: C.mars, fontSize: 'calc(12px * var(--font-scale, 1))', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {OFFICIAL_SOURCE_CARDS.map((source) => (
          <SourceCard
            key={source.key}
            title={source.title}
            subtitle={t(`explore.defaultDataset.${source.subtitleKey}`)}
            tags={source.tagKeys.map((tagKey) => t(`explore.defaultDataset.sourceTags.${tagKey}`))}
            body={t(`explore.defaultDataset.${source.bodyKey}`)}
            stats={sourceCoverageStats[source.key]}
            accent={source.accent}
            loading={loading}
            t={t}
          />
        ))}
      </div>
    </GlowCard>
  );
}

function OfficialCoverageSummary({ loading, sourceCoverageStats, t }) {
  if (loading) {
    return (
      <GlowCard style={{ padding: '18px 20px' }}>
        <LoadingBox h={120} label={t('common.loading')} />
      </GlowCard>
    );
  }

  return (
    <GlowCard style={{ padding: '16px 18px' }}>
      <div
        style={{
          fontSize: 'calc(11px * var(--font-scale, 1))',
          fontWeight: 700,
          color: C.blue,
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: 2,
          marginBottom: 12,
        }}
      >
        {t('explore.defaultDataset.listTitle')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {OFFICIAL_SOURCE_CARDS.map((source) => {
          const stats = sourceCoverageStats[source.key];
          const firstRow = stats.rows[0];
          const lastRow = stats.rows[stats.rows.length - 1];
          const firstInterval = firstRow?.intervals?.[0];
          const lastInterval = lastRow?.intervals?.[lastRow.intervals.length - 1];
          const lsRange = stats.hasData
            ? `${formatLs(firstInterval?.start)} - ${formatLs(lastInterval?.end)}`
            : '--';

          return (
            <div
              key={source.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px minmax(120px, 1fr) minmax(160px, auto)',
                alignItems: 'center',
                gap: 12,
                minHeight: 38,
                padding: '8px 10px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: 'rgba(255,255,255,0.018)',
              }}
            >
              <div style={{ fontSize: 'calc(12px * var(--font-scale, 1))', color: source.accent, fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>
                {source.title}
              </div>
              <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
                <div
                  style={{
                    width: `${Math.max(stats.hasData ? 3 : 0, stats.avgCoverage)}%`,
                    height: '100%',
                    background: stats.hasData ? source.accent : C.ice30,
                  }}
                />
              </div>
              <div style={{ fontSize: 'calc(11px * var(--font-scale, 1))', color: C.ice60, textAlign: 'right' }}>
                {`${stats.yearRange} | ${pct(stats.avgCoverage)} | ${lsRange}`}
              </div>
            </div>
          );
        })}
      </div>
    </GlowCard>
  );
}

export default function DefaultDatasetTab() {
  const t = useT();
  const [dataInfo, setDataInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const info = await fetchOverviewInfo({ dataSource: 'default' });
      setDataInfo(info);
    } catch (e) {
      setError(e?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const sourceCoverageStats = useMemo(() => buildSourceCoverageStats(dataInfo), [dataInfo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <OfficialSourceSituationGrid
        loading={loading}
        error={error}
        onRetry={load}
        sourceCoverageStats={sourceCoverageStats}
        t={t}
      />

      <OfficialCoverageSummary loading={loading} sourceCoverageStats={sourceCoverageStats} t={t} />
    </div>
  );
}
