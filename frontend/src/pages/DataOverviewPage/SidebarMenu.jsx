import React from 'react';
import C from '../../constants/colors';
import { useDataOverview } from '../../contexts/DataOverviewContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { GLOBE_VARIABLE_OPTIONS } from '../../constants/globeVariables';
import { getMyUploads } from '../../services/api';
import { buildOverviewUploadOptions, buildUploadYearOptions } from './uploadedSourceOptions';
import { MODE_DEFS as SHARED_MODE_DEFS } from './overviewChartLayout';

export { SHARED_MODE_DEFS as MODE_DEFS };

const NAVBAR_HEIGHT = 70;

function SectionLabel({ children }) {
  return (
    <div
      style={{
        color: C.ice50,
        fontSize: 'calc(10px * var(--font-scale, 1))',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled = false, isLight = false }) {
  const optionBg = isLight ? '#ffffff' : '#111827';
  const optionColor = isLight ? '#17212f' : '#f5f7fb';

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ color: C.ice60, fontSize: 'calc(11px * var(--font-scale, 1))', fontWeight: 600 }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '11px 40px 11px 12px',
            borderRadius: 12,
            border: `1px solid ${C.borderStrong}`,
            background: isLight ? 'rgba(255,255,255,0.94)' : C.bgCardStrong,
            color: C.ice,
            fontSize: 'calc(12px * var(--font-scale, 1))',
            fontWeight: 600,
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.72 : 1,
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            boxShadow: isLight ? '0 8px 18px rgba(15,23,42,0.05)' : '0 10px 20px rgba(0,0,0,0.16)',
          }}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              style={{ color: optionColor, background: optionBg }}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: C.ice40,
            fontSize: 'calc(14px * var(--font-scale, 1))',
            lineHeight: 1,
          }}
        >
          ▾
        </span>
      </div>
    </label>
  );
}

function SegmentedToggle({ value, onChange, options, disabled = false, isLight = false }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        gap: 6,
        padding: 4,
        borderRadius: 12,
        background: isLight ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {options.map((option) => {
        const active = value === option.value;
        const optionDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            onClick={() => !optionDisabled && onChange(option.value)}
            disabled={optionDisabled}
            style={{
              border: 'none',
              borderRadius: 10,
              padding: '9px 10px',
              background: active ? option.activeBg : 'transparent',
              color: active ? option.activeColor : C.ice60,
              fontSize: 'calc(11px * var(--font-scale, 1))',
              fontWeight: active ? 700 : 600,
              cursor: optionDisabled ? 'not-allowed' : 'pointer',
              opacity: optionDisabled ? 0.5 : 1,
              transition: 'all 0.36s ease',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SourceScopePicker({
  title,
  desc,
  sourceName,
  selectedUploadId,
  onSelectUpload,
  personalOptions,
  officialOptions,
  officialValue,
  onOfficialChange,
  disabled = false,
  loading = false,
  showEmptyPersonalHint = true,
  isLight = false,
  isZh = false,
  accent = C.blue,
}) {
  const hasPersonalOptions = personalOptions.length > 0;
  const scope = selectedUploadId ? 'personal' : 'official';
  const selectOptions = scope === 'personal' ? personalOptions : officialOptions;
  const officialValueString = String(officialValue);
  const resolvedOfficialValue = officialOptions.some((option) => option.value === officialValueString)
    ? officialValueString
    : officialOptions[0]?.value || '';
  const selectValue = scope === 'personal'
    ? (selectedUploadId ? String(selectedUploadId) : personalOptions[0]?.value || '')
    : resolvedOfficialValue;
  const selectLabel = scope === 'personal'
    ? (isZh ? '个人火星年' : 'Personal Mars year')
    : (isZh ? '官方火星年' : 'Official Mars year');
  const disabledReason = !hasPersonalOptions && isZh
    ? '暂无可用于数据总览的个人上传源'
    : 'No usable personal upload for Data Overview yet';

  const handleScopeChange = (value) => {
    if (value === 'official') {
      onSelectUpload(null);
      return;
    }
    const nextUploadId = Number(personalOptions[0]?.value);
    if (Number.isFinite(nextUploadId)) onSelectUpload(nextUploadId);
  };

  const handleSelectChange = (value) => {
    if (scope === 'personal') {
      onSelectUpload(Number(value));
      return;
    }
    onOfficialChange(value);
  };

  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        padding: '12px',
        borderRadius: 14,
        border: `1px solid ${isLight ? 'rgba(15,23,42,0.09)' : 'rgba(255,255,255,0.08)'}`,
        background: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.025)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.ice, fontSize: 'calc(12px * var(--font-scale, 1))', fontWeight: 800, letterSpacing: '-0.01em' }}>
            {title}
          </div>
          {desc ? (
            <div style={{ color: C.ice45, fontSize: 'calc(10px * var(--font-scale, 1))', lineHeight: 1.5, marginTop: 3 }}>
              {desc}
            </div>
          ) : null}
        </div>
        <span
          style={{
            flexShrink: 0,
            padding: '3px 7px',
            borderRadius: 999,
            background: `${accent}18`,
            color: accent,
            fontSize: 'calc(9px * var(--font-scale, 1))',
            fontWeight: 800,
            letterSpacing: '0.04em',
          }}
        >
          {sourceName}
        </span>
      </div>

      <SegmentedToggle
        value={scope}
        onChange={handleScopeChange}
        disabled={disabled || loading}
        isLight={isLight}
        options={[
          {
            value: 'official',
            label: isZh ? '官方' : 'Official',
            activeBg: `${accent}18`,
            activeColor: accent,
          },
          {
            value: 'personal',
            label: isZh ? '个人' : 'Personal',
            activeBg: 'rgba(52,211,153,0.14)',
            activeColor: '#34d399',
            disabled: !hasPersonalOptions,
          },
        ]}
      />

      <SelectField
        label={selectLabel}
        value={selectValue}
        onChange={handleSelectChange}
        options={selectOptions}
        disabled={disabled || loading || selectOptions.length === 0}
        isLight={isLight}
      />

      {!hasPersonalOptions && showEmptyPersonalHint ? (
        <div style={{ color: C.ice40, fontSize: 'calc(10px * var(--font-scale, 1))', lineHeight: 1.5 }}>
          {disabledReason}
        </div>
      ) : null}
    </div>
  );
}

function RadioModeCard({ mode, selected, onSelect, isZh, isLight }) {
  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '20px minmax(0, 1fr)',
        gap: 10,
        alignItems: 'start',
        padding: '13px 12px',
        borderRadius: 14,
        border: `1px solid ${selected ? `${mode.color}55` : isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.08)'}`,
        background: selected
          ? (isLight ? `${mode.color}10` : 'rgba(255,255,255,0.05)')
          : (isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.02)'),
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <input
        type="radio"
        name="overview-mode"
        checked={selected}
        onChange={() => onSelect(mode.id)}
        style={{ marginTop: 3, accentColor: mode.color }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: selected ? `${mode.color}1a` : C.bgMuted,
              color: selected ? mode.color : C.ice40,
              fontSize: 'calc(11px * var(--font-scale, 1))',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {mode.icon}
          </span>
          <div
            style={{
              color: selected ? mode.color : C.ice,
              fontSize: 'calc(13px * var(--font-scale, 1))',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              lineHeight: 1.35,
              letterSpacing: '-0.01em',
            }}
          >
            {isZh ? mode.title.zh : mode.title.en}
          </div>
        </div>
        <div style={{ color: selected ? C.ice70 : C.ice40, fontSize: 'calc(11px * var(--font-scale, 1))', lineHeight: 1.55 }}>
          {isZh ? mode.desc.zh : mode.desc.en}
        </div>
      </div>
    </label>
  );
}

function InlineSwitch({ label, checked, onChange, accent = C.blue, isLight = false }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 12,
        border: `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.07)'}`,
        background: isLight ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
      }}
    >
      <span style={{ color: C.ice, fontSize: 'calc(12px * var(--font-scale, 1))', lineHeight: 1.45 }}>{label}</span>
      <span style={{ position: 'relative', width: 36, height: 20, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            background: checked ? `${accent}33` : (isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.10)'),
            border: `1px solid ${checked ? accent : isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.10)'}`,
            transition: 'all 0.2s ease',
          }}
        />
        <span
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            left: checked ? 18 : 3,
            top: 3,
            borderRadius: '50%',
            background: checked ? accent : (isLight ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.60)'),
            transition: 'all 0.2s ease',
          }}
        />
      </span>
    </label>
  );
}

function AdvancedToggleGroup({ title, open, onToggle, children, isLight = false, isZh = false }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)'}`,
        background: isLight ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '13px 14px',
          border: 'none',
          background: 'transparent',
          color: C.ice,
          cursor: 'pointer',
          fontSize: 'calc(12px * var(--font-scale, 1))',
          fontWeight: 700,
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span style={{ color: C.ice40, fontSize: 'calc(11px * var(--font-scale, 1))' }}>
          {open ? (isZh ? '收起' : 'Hide') : (isZh ? '展开' : 'Show')}
        </span>
      </button>
      {open && <div style={{ display: 'grid', gap: 8, padding: '0 12px 12px' }}>{children}</div>}
    </div>
  );
}

export default function SidebarMenu() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const isLight = settings?.theme === 'light';
  const isZh = settings?.language !== 'en';
  const {
    activeAnalysisMode,
    setActiveAnalysisMode,
    marsYear,
    setMarsYear,
    availableMarsYears,
    isSwitchingSource,
    sourceMeta,
    selectedMcdUploadId,
    setSelectedMcdUploadId,
    selectedOpenMarsUploadId,
    setSelectedOpenMarsUploadId,
    selectedNomadUploadId,
    setSelectedNomadUploadId,
    autoRotate,
    setAutoRotate,
    gestureEnabled,
    setGestureEnabled,
    showConcentration3D,
    setShowConcentration3D,
    showGeoAnnotations,
    setShowGeoAnnotations,
    showMarsTexture,
    setShowMarsTexture,
    globeVariable,
    setGlobeVariable,
    ozoneDisplayMode,
    setOzoneDisplayMode,
    overviewOzoneCapabilities,
    leftPanelWidth,
    setLeftPanelWidth,
  } = useDataOverview();

  const [displayOpen, setDisplayOpen] = React.useState(true);
  const [interactionOpen, setInteractionOpen] = React.useState(true);
  const [rawUploadOptions, setRawUploadOptions] = React.useState({ mcd: [], openmars: [], nomad: [] });
  const [rawUploadsLoading, setRawUploadsLoading] = React.useState(false);

  const panelBg = isLight ? 'rgba(255,255,255,0.82)' : 'rgba(10,12,18,0.54)';
  const borderSoft = isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.08)';
  const contentGap = leftPanelWidth <= 300 ? 14 : 16;

  const sourceMessage = React.useMemo(() => {
    const rawMessage = sourceMeta?.message;
    if (isZh) return rawMessage || '';
    return /[a-zA-Z]/.test(rawMessage || '') && !/[\u4e00-\u9fff]/.test(rawMessage || '') ? rawMessage : '';
  }, [isZh, sourceMeta]);

  React.useEffect(() => {
    if (!user?.id) {
      setRawUploadOptions({ mcd: [], openmars: [], nomad: [] });
      setSelectedMcdUploadId(null);
      setSelectedOpenMarsUploadId(null);
      setSelectedNomadUploadId(null);
      return undefined;
    }

    let active = true;
    setRawUploadsLoading(true);
    getMyUploads()
      .then((uploads) => {
        if (!active) return;
        const nextOptions = buildOverviewUploadOptions(uploads);
        setRawUploadOptions(nextOptions);
        setSelectedMcdUploadId((current) => (nextOptions.mcd.some((item) => item.id === current) ? current : null));
        setSelectedOpenMarsUploadId((current) => (nextOptions.openmars.some((item) => item.id === current) ? current : null));
        setSelectedNomadUploadId((current) => (nextOptions.nomad.some((item) => item.id === current) ? current : null));
      })
      .catch(() => {
        if (active) setRawUploadOptions({ mcd: [], openmars: [], nomad: [] });
      })
      .finally(() => {
        if (active) setRawUploadsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setSelectedMcdUploadId, setSelectedNomadUploadId, setSelectedOpenMarsUploadId, user?.id]);

  const globeVariableOptions = React.useMemo(
    () => GLOBE_VARIABLE_OPTIONS.map((option) => ({ value: option.id, label: isZh ? option.zh : option.en })),
    [isZh],
  );

  const yearOptions = React.useMemo(
    () => availableMarsYears.map((year) => ({ value: String(year), label: `MY ${year}` })),
    [availableMarsYears],
  );

  const mcdUploadYearOptions = React.useMemo(
    () => buildUploadYearOptions(rawUploadOptions.mcd),
    [rawUploadOptions.mcd],
  );

  const openMarsUploadYearOptions = React.useMemo(
    () => buildUploadYearOptions(rawUploadOptions.openmars),
    [rawUploadOptions.openmars],
  );

  const nomadUploadYearOptions = React.useMemo(
    () => buildUploadYearOptions(rawUploadOptions.nomad),
    [rawUploadOptions.nomad],
  );

  const handleOfficialYearChange = React.useCallback((value) => {
    setMarsYear(Number(value));
  }, [setMarsYear]);

  const handleMouseDown = React.useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const onMouseMove = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      setLeftPanelWidth(Math.max(272, Math.min(newWidth, 420)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [leftPanelWidth, setLeftPanelWidth]);

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: `${NAVBAR_HEIGHT}px`,
        width: leftPanelWidth,
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        background: panelBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: `1px solid ${borderSoft}`,
        zIndex: 1000,
        padding: leftPanelWidth <= 300 ? '18px 14px' : '22px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ paddingBottom: 14, borderBottom: `1px solid ${borderSoft}`, flexShrink: 0 }}>
        <div style={{ color: C.ice, fontFamily: 'var(--font-display)', fontSize: leftPanelWidth <= 300 ? 16 : 18, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
          {isZh ? '分析工作台' : 'Analysis workspace'}
        </div>
        <div style={{ color: C.ice50, fontSize: 'calc(11px * var(--font-scale, 1))', lineHeight: 1.6 }}>
          {isZh ? '先选择分析视角，再调整数据范围、显示图层和交互方式。' : 'Choose an analysis lens first, then tune the dataset, visible layers, and interaction behavior.'}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: contentGap,
          paddingRight: 4,
          scrollbarGutter: 'stable',
        }}
      >
        <section>
          <SectionLabel>{isZh ? '分析模式' : 'Analysis mode'}</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {SHARED_MODE_DEFS.map((mode) => (
              <RadioModeCard
                key={mode.id}
                mode={mode}
                selected={activeAnalysisMode === mode.id}
                onSelect={setActiveAnalysisMode}
                isZh={isZh}
                isLight={isLight}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>{isZh ? '数据范围' : 'Data scope'}</SectionLabel>
          <div style={{ display: 'grid', gap: 12 }}>
            <SourceScopePicker
              title={isZh ? '页面 MCD 数据源' : 'Page MCD source'}
              desc={isZh ? '驱动数据总览全部二维图表与主球体' : 'Drives all Data Overview charts and the main globe.'}
              sourceName="MCD"
              selectedUploadId={selectedMcdUploadId}
              onSelectUpload={setSelectedMcdUploadId}
              personalOptions={mcdUploadYearOptions}
              officialOptions={yearOptions}
              officialValue={marsYear}
              onOfficialChange={handleOfficialYearChange}
              disabled={isSwitchingSource}
              loading={rawUploadsLoading}
              showEmptyPersonalHint={Boolean(user)}
              isLight={isLight}
              isZh={isZh}
              accent="#f97316"
            />

            {!user ? (
              <div style={{ color: C.ice40, fontSize: 'calc(10px * var(--font-scale, 1))', lineHeight: 1.5 }}>
                {isZh ? '登录后可选择自己上传的 MCD / OpenMARS / NOMAD 原始数据。' : 'Sign in to select your uploaded MCD / OpenMARS / NOMAD raw datasets.'}
              </div>
            ) : null}
            {rawUploadsLoading || isSwitchingSource ? (
              <div style={{ color: C.ice50, fontSize: 'calc(10px * var(--font-scale, 1))', lineHeight: 1.5 }}>
                {isZh ? '正在刷新数据源，请稍候...' : 'Refreshing data sources, please wait...'}
              </div>
            ) : null}
            {!rawUploadsLoading && sourceMessage ? (
              <div style={{ color: C.ice50, fontSize: 'calc(10px * var(--font-scale, 1))', lineHeight: 1.55 }}>
                {sourceMessage}
              </div>
            ) : null}

            <SelectField
              label={isZh ? '球体变量' : 'Globe variable'}
              value={globeVariable}
              onChange={setGlobeVariable}
              options={globeVariableOptions}
              isLight={isLight}
            />

            {globeVariable === 'o3col' ? (
              <div>
                <div style={{ color: C.ice60, fontSize: 'calc(11px * var(--font-scale, 1))', fontWeight: 600, marginBottom: 8 }}>
                  {isZh ? '臭氧显示方式' : 'Ozone display'}
                </div>
                <SegmentedToggle
                  value={ozoneDisplayMode}
                  onChange={setOzoneDisplayMode}
                  isLight={isLight}
                  options={[
                    {
                      value: 'mcd',
                      label: 'MCD',
                      activeBg: 'rgba(249,115,22,0.14)',
                      activeColor: '#f97316',
                    },
                    {
                      value: 'multi-source',
                      label: isZh ? '多源' : 'Sources',
                      activeBg: 'rgba(56,189,248,0.14)',
                      activeColor: '#38bdf8',
                      disabled: !overviewOzoneCapabilities?.openmars && !overviewOzoneCapabilities?.nomad,
                    },
                    {
                      value: 'validation',
                      label: isZh ? '验证' : 'Validate',
                      activeBg: 'rgba(52,211,153,0.14)',
                      activeColor: '#34d399',
                      disabled: !overviewOzoneCapabilities?.nomad,
                    },
                    {
                      value: 'diff',
                      label: isZh ? '差值' : 'Diff',
                      activeBg: 'rgba(74,158,255,0.14)',
                      activeColor: C.blue,
                      disabled: !(overviewOzoneCapabilities?.diff_pairs || []).length,
                    },
                  ]}
                />
                <div style={{ marginTop: 8, color: C.ice40, fontSize: 'calc(10px * var(--font-scale, 1))', lineHeight: 1.5 }}>
                  {isZh
                    ? '右侧分析始终使用 MCD；验证模式用 NOMAD 稀疏观测点对比对应位置的 MCD。'
                    : 'Right-side analysis stays on MCD; validation compares sparse NOMAD observations against matched MCD cells.'}
                </div>
                <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                  <SourceScopePicker
                    title={isZh ? 'OpenMARS 臭氧图层' : 'OpenMARS ozone layer'}
                    desc={isZh ? '用于三维多源臭氧对照展示' : 'Used for 3D multi-source ozone comparison.'}
                    sourceName="OpenMARS"
                    selectedUploadId={selectedOpenMarsUploadId}
                    onSelectUpload={setSelectedOpenMarsUploadId}
                    personalOptions={openMarsUploadYearOptions}
                    officialOptions={yearOptions}
                    officialValue={marsYear}
                    onOfficialChange={handleOfficialYearChange}
                    disabled={isSwitchingSource}
                    loading={rawUploadsLoading}
                    showEmptyPersonalHint={Boolean(user)}
                    isLight={isLight}
                    isZh={isZh}
                    accent="#38bdf8"
                  />
                  <SourceScopePicker
                    title={isZh ? 'NOMAD 臭氧图层' : 'NOMAD ozone layer'}
                    desc={isZh ? '用于三维观测验证与差值对比' : 'Used for 3D observation validation and difference checks.'}
                    sourceName="NOMAD"
                    selectedUploadId={selectedNomadUploadId}
                    onSelectUpload={setSelectedNomadUploadId}
                    personalOptions={nomadUploadYearOptions}
                    officialOptions={yearOptions}
                    officialValue={marsYear}
                    onOfficialChange={handleOfficialYearChange}
                    disabled={isSwitchingSource}
                    loading={rawUploadsLoading}
                    showEmptyPersonalHint={Boolean(user)}
                    isLight={isLight}
                    isZh={isZh}
                    accent="#34d399"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <SectionLabel>{isZh ? '显示控制' : 'Display controls'}</SectionLabel>
          <AdvancedToggleGroup
            title={isZh ? '球体图层与辅助标记' : 'Globe layers and visual markers'}
            open={displayOpen}
            onToggle={() => setDisplayOpen((value) => !value)}
            isLight={isLight}
            isZh={isZh}
          >
            <InlineSwitch
              label={isZh ? '显示 3D 浓度' : 'Show 3D concentration'}
              checked={showConcentration3D}
              onChange={() => setShowConcentration3D((value) => !value)}
              accent={C.blue}
              isLight={isLight}
            />
            <InlineSwitch
              label={isZh ? '显示经纬度标注' : 'Show latitude and longitude labels'}
              checked={showGeoAnnotations}
              onChange={() => setShowGeoAnnotations((value) => !value)}
              accent={C.blue}
              isLight={isLight}
            />
            <InlineSwitch
              label={isZh ? '显示火星贴图' : 'Show Mars texture'}
              checked={showMarsTexture}
              onChange={() => setShowMarsTexture((value) => !value)}
              accent={C.blue}
              isLight={isLight}
            />
          </AdvancedToggleGroup>
        </section>

        <section>
          <SectionLabel>{isZh ? '动态交互' : 'Motion and interaction'}</SectionLabel>
          <AdvancedToggleGroup
            title={isZh ? '旋转与手势控制' : 'Rotation and gesture controls'}
            open={interactionOpen}
            onToggle={() => setInteractionOpen((value) => !value)}
            isLight={isLight}
            isZh={isZh}
          >
            <InlineSwitch
              label={isZh ? '自动旋转球体' : 'Auto-rotate globe'}
              checked={autoRotate}
              onChange={() => setAutoRotate((value) => !value)}
              accent={C.blue}
              isLight={isLight}
            />
            <InlineSwitch
              label={isZh ? '启用手势控制' : 'Enable gesture control'}
              checked={gestureEnabled}
              onChange={() => setGestureEnabled((value) => !value)}
              accent={C.mars}
              isLight={isLight}
            />
          </AdvancedToggleGroup>
        </section>
      </div>

      <div
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          right: -3,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 10,
          background: 'transparent',
        }}
      />
    </div>
  );
}
