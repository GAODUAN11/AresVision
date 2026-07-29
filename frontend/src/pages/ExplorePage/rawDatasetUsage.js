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
      desc: isZh ? '可在数据总览中作为当前 MCD 数据源，驱动右侧图表和球体变量。' : 'Can be selected in Data Overview as the page MCD source.',
      pages: [isZh ? '数据总览' : 'Data Overview'],
    };
  }

  if (type === 'openmars') {
    return {
      key: 'ozone_openmars',
      usable: true,
      label: isZh ? '3D OpenMARS 臭氧图层' : '3D OpenMARS ozone layer',
      desc: isZh ? '仅用于数据总览三维球体的臭氧多源展示。' : 'Only used in the Data Overview 3D ozone multi-source display.',
      pages: [isZh ? '数据总览 3D 臭氧' : 'Data Overview 3D ozone'],
    };
  }

  if (type === 'nomad') {
    return {
      key: 'ozone_nomad',
      usable: true,
      label: isZh ? '3D NOMAD 臭氧图层' : '3D NOMAD ozone layer',
      desc: isZh ? '仅用于数据总览三维球体的 NOMAD 臭氧观测展示与验证。' : 'Only used in the Data Overview 3D NOMAD ozone display and validation.',
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
