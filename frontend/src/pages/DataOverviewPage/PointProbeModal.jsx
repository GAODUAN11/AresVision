import Plot from 'react-plotly.js';
import C from '../../constants/colors';
import { getGlobeVariableMeta } from '../../constants/globeVariables';
import { useSettings } from '../../contexts/SettingsContext';
import { convertOzone, ozoneLabel, convertTemp, tempLabel, convertWind, windLabel } from '../../utils/units';
import { fmtNum } from '../../utils/fmt';

function convertByVariable(value, variable, units) {
  if (!Number.isFinite(value)) return null;
  if (variable === 'o3col') return convertOzone(value, units.ozone);
  if (variable === 'Temperature') return convertTemp(value, units.temperature);
  if (variable === 'U_Wind' || variable === 'V_Wind') return convertWind(value, units.wind);
  return value;
}

function unitLabelByVariable(variable, units) {
  if (variable === 'o3col') return ozoneLabel(units.ozone);
  if (variable === 'Temperature') return tempLabel(units.temperature);
  if (variable === 'U_Wind' || variable === 'V_Wind') return windLabel(units.wind);
  if (variable === 'Solar_Flux_DN') return 'W/m^2';
  return '';
}

function formatValue(value, variable, units, precision) {
  const converted = convertByVariable(value, variable, units);
  if (!Number.isFinite(converted)) return '--';
  return fmtNum(converted, precision);
}

function StatCard({ label, value, tone = C.ice }) {
  return (
    <div style={{
      padding: '14px 15px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.055)',
      border: `1px solid ${C.border}`,
      minWidth: 0,
    }}>
      <div style={{ color: C.ice40, fontSize: 'calc(10px * var(--font-scale, 1))', letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 8, color: tone, fontSize: 'calc(18px * var(--font-scale, 1))', fontFamily: 'var(--font-display)', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}

export default function PointProbeModal({ probe, loading = false, error = '', onClose }) {
  const { settings } = useSettings();
  const isLight = settings?.theme === 'light';
  const isZh = settings?.language !== 'en';
  if (!probe) return null;

  const variable = probe.variable || 'o3col';
  const meta = getGlobeVariableMeta(variable);
  const variableLabel = isZh ? meta.zh : meta.en;
  const unitLabel = unitLabelByVariable(variable, settings.units);
  const precision = settings.precision;
  const series = probe.series || {};
  const lsSeries = series.ls || [];
  const hasAnnualSeries = Array.isArray(series.point) && series.point.length > 0;
  const convertedPoint = (series.point || []).map((value) => convertByVariable(value, variable, settings.units));
  const convertedGlobalMean = (series.globalMean || []).map((value) => convertByVariable(value, variable, settings.units));
  const convertedLatitudeMean = (series.latitudeMean || []).map((value) => convertByVariable(value, variable, settings.units));
  const plotText = isLight ? 'rgba(23,33,47,0.88)' : 'rgba(236,244,255,0.94)';
  const plotGrid = isLight ? 'rgba(23,33,47,0.14)' : 'rgba(160,196,240,0.16)';

  const copy = isZh ? {
    title: '3D 点位探针',
    subtitle: '点击球面后定位最近网格点，并对照全年变化。',
    loading: '正在读取全年点位序列...',
    local: '当前先显示切片预览，全年曲线加载完成后会自动更新。',
    requested: '点击位置',
    grid: '最近网格',
    current: '当前值',
    globalDiff: '相对全球均值',
    latDiff: '相对纬向均值',
    annual: '全年点位变化与均值对比',
    point: '点位值',
    globalMean: '全球均值',
    latitudeMean: '同纬度均值',
    noAnnual: '暂无全年序列，仅显示当前切片最近点。',
    close: '关闭',
    ls: 'Ls',
  } : {
    title: '3D Point Probe',
    subtitle: 'Resolve the clicked globe location to the nearest grid cell and compare annual behavior.',
    loading: 'Loading annual point series...',
    local: 'Showing current-slice preview until the annual series finishes loading.',
    requested: 'Clicked Location',
    grid: 'Nearest Grid',
    current: 'Current Value',
    globalDiff: 'vs Global Mean',
    latDiff: 'vs Latitude Mean',
    annual: 'Annual Point Series vs Means',
    point: 'Point Value',
    globalMean: 'Global Mean',
    latitudeMean: 'Latitude Mean',
    noAnnual: 'Annual series is unavailable; showing the current-slice nearest point only.',
    close: 'Close',
    ls: 'Ls',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: isLight ? 'rgba(235,241,248,0.42)' : 'rgba(2,5,12,0.58)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: 'min(920px, calc(100vw - 44px))',
          maxHeight: 'min(780px, calc(100vh - 44px))',
          overflow: 'auto',
          borderRadius: 28,
          border: `1px solid ${isLight ? 'rgba(15,23,42,0.14)' : 'rgba(255,255,255,0.16)'}`,
          background: isLight
            ? 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(235,242,249,0.88))'
            : 'linear-gradient(145deg, rgba(11,15,25,0.94), rgba(24,16,14,0.90))',
          boxShadow: isLight ? '0 28px 80px rgba(32,48,72,0.20)' : '0 28px 90px rgba(0,0,0,0.55)',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 18 }}>
          <div>
            <div style={{ color: C.mars, fontFamily: 'var(--font-display)', fontSize: 'calc(13px * var(--font-scale, 1))', fontWeight: 800, letterSpacing: 1.5 }}>{variableLabel}</div>
            <h2 style={{ color: C.ice, fontFamily: 'var(--font-display)', fontSize: 'calc(26px * var(--font-scale, 1))', margin: '6px 0 0', letterSpacing: '-0.03em' }}>{copy.title}</h2>
            <p style={{ color: C.ice60, margin: '8px 0 0', fontSize: 'calc(12px * var(--font-scale, 1))', lineHeight: 1.7 }}>{copy.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${C.border}`,
              background: 'rgba(255,255,255,0.08)',
              color: C.ice70,
              borderRadius: 999,
              padding: '8px 14px',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
            }}
          >
            {copy.close}
          </button>
        </div>

        {(loading || probe.status === 'local' || error) && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 14, border: `1px solid ${loading ? 'rgba(121,187,255,0.32)' : 'rgba(255,143,104,0.30)'}`, background: loading ? 'rgba(121,187,255,0.10)' : 'rgba(255,143,104,0.08)', color: loading ? C.blue : C.mars, fontSize: 'calc(12px * var(--font-scale, 1))', lineHeight: 1.6 }}>
            {loading ? copy.loading : (error || copy.local)}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
          <StatCard label={copy.requested} value={`LAT ${fmtNum(probe.requested?.lat, 1)} / LNG ${fmtNum(probe.requested?.lng, 1)}`} tone={C.blue} />
          <StatCard label={copy.grid} value={`LAT ${fmtNum(probe.gridPoint?.lat, 1)} / LNG ${fmtNum(probe.gridPoint?.lng, 1)}`} tone={C.green} />
          <StatCard label={copy.current} value={`${formatValue(probe.current?.value, variable, settings.units, precision)} ${unitLabel}`} tone={C.mars} />
          <StatCard label={copy.globalDiff} value={`${formatValue(probe.comparison?.pointMinusGlobal, variable, settings.units, precision)} ${unitLabel}`} />
          <StatCard label={copy.latDiff} value={`${formatValue(probe.comparison?.pointMinusLatitudeMean, variable, settings.units, precision)} ${unitLabel}`} />
        </div>

        <div style={{ padding: 16, borderRadius: 20, background: 'rgba(255,255,255,0.045)', border: `1px solid ${C.border}`, minHeight: 360 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ color: C.ice, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'calc(15px * var(--font-scale, 1))' }}>{copy.annual}</div>
            <div style={{ color: C.ice40, fontSize: 'calc(11px * var(--font-scale, 1))' }}>{copy.ls} {fmtNum(probe.current?.ls, 1)}</div>
          </div>
          {hasAnnualSeries ? (
            <Plot
              data={[
                { x: lsSeries, y: convertedPoint, type: 'scatter', mode: 'lines+markers', name: copy.point, line: { color: C.mars, width: 3, shape: 'spline' }, marker: { size: 5 } },
                { x: lsSeries, y: convertedGlobalMean, type: 'scatter', mode: 'lines', name: copy.globalMean, line: { color: C.blue, width: 2, dash: 'dot', shape: 'spline' } },
                { x: lsSeries, y: convertedLatitudeMean, type: 'scatter', mode: 'lines', name: copy.latitudeMean, line: { color: C.green, width: 2, dash: 'dash', shape: 'spline' } },
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                margin: { l: 58, r: 18, t: 12, b: 52 },
                xaxis: { title: copy.ls, gridcolor: plotGrid, tickfont: { color: plotText, size: 10 }, titlefont: { color: plotText, size: 11 }, automargin: true },
                yaxis: { title: `${variableLabel} (${unitLabel})`, gridcolor: plotGrid, tickfont: { color: plotText, size: 10 }, titlefont: { color: plotText, size: 11 }, automargin: true },
                legend: { orientation: 'h', x: 0, y: 1.12, font: { color: plotText, size: 11 } },
              }}
              config={{ displayModeBar: false, responsive: true }}
              useResizeHandler
              style={{ width: '100%', height: 330 }}
            />
          ) : (
            <div style={{ height: 320, display: 'grid', placeItems: 'center', color: C.ice50, fontSize: 'calc(13px * var(--font-scale, 1))' }}>{copy.noAnnual}</div>
          )}
        </div>
      </div>
    </div>
  );
}

