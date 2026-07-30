const USABLE_STATUSES = new Set(['valid', 'pending_review', 'approved']);

export function getRawDatasetUsage(upload, isZh = true) {
  const type = String(upload?.data_type || '').trim().toLowerCase();
  const status = String(upload?.status || '').trim().toLowerCase();

  if (!USABLE_STATUSES.has(status)) {
    return {
      key: 'unusable',
      usable: false,
      label: isZh ? '暂不可用于可视化' : 'Not usable for visualization',
      desc: isZh ? '该文件未通过校验、已被驳回，或状态暂不可用。' : 'This file has not passed validation, was rejected, or is not in a usable state.',
      pages: [],
    };
  }

  if (type === 'mcd') {
    return {
      key: 'overview_mcd',
      usable: true,
      label: isZh ? '数据总览整页数据源' : 'Full Data Overview source',
      desc: isZh
        ? '已按数据总览契约校验并标准化；可作为当前 MCD 数据源，驱动右侧图表和球体变量。'
        : 'Validated and normalized MCD overview source; drives the globe variables and right-side charts.',
      pages: [isZh ? '数据总览' : 'Data Overview'],
    };
  }

  if (type === 'openmars') {
    return {
      key: 'ozone_openmars',
      usable: true,
      label: isZh ? '3D OpenMARS 臭氧图层' : '3D OpenMARS ozone layer',
      desc: isZh
        ? '已校验为 o3col 臭氧图层，仅用于数据总览三维球体的多源展示。'
        : 'Validated ozone layer (o3col), used only in the Data Overview 3D multi-source display.',
      pages: [isZh ? '数据总览 3D 臭氧' : 'Data Overview 3D ozone'],
    };
  }

  if (type === 'nomad') {
    return {
      key: 'ozone_nomad',
      usable: true,
      label: isZh ? '3D NOMAD 臭氧图层' : '3D NOMAD ozone layer',
      desc: isZh
        ? '已校验为带 count 观测计数的网格化 NOMAD 臭氧图层，仅用于三维展示与验证。'
        : 'Validated gridded NOMAD ozone layer with observation counts, used only for 3D display and validation.',
      pages: [isZh ? '数据总览 3D 臭氧' : 'Data Overview 3D ozone'],
    };
  }

  return {
    key: 'unknown',
    usable: false,
    label: isZh ? '未知数据类型' : 'Unknown data type',
    desc: isZh ? '当前仅支持 MCD、OpenMARS、NOMAD。' : 'Only MCD, OpenMARS, and NOMAD are supported.',
    pages: [],
  };
}
