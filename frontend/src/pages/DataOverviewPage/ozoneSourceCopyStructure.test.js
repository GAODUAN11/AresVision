import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebarSource = readFileSync(new URL('./SidebarMenu.jsx', import.meta.url), 'utf8');

function sourceBetween(startMarker, endMarker) {
  const start = sidebarSource.indexOf(startMarker);
  const end = sidebarSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return sidebarSource.slice(start, end);
}

test('ozone source controls do not show the redundant MCD analysis explanation', () => {
  assert.equal(sidebarSource.includes('右侧分析始终使用 MCD'), false);
  assert.equal(sidebarSource.includes('Right-side analysis stays on MCD'), false);
});

test('sidebar control panel keeps dataset source copy concise', () => {
  [
    '先选择分析视角',
    'Choose an analysis lens first',
    '驱动数据总览全部二维图表与主球体',
    'Drives all Data Overview charts and the main globe',
    '登录后可使用自己上传的 MCD 主数据',
    'Sign in to use uploaded MCD page data',
    '只影响 3D 多源与差值图层',
    'Only affects 3D multi-source and diff layers',
    '只影响 3D 观测验证与差值对比',
    'Only affects 3D validation and diff checks',
    '官方源跟随',
    'Official source follows',
  ].forEach((text) => {
    assert.equal(sidebarSource.includes(text), false, `${text} should not be rendered in the sidebar`);
  });
});

test('disabled personal ozone source buttons expose hover explanations', () => {
  assert.match(sidebarSource, /disabledTitle/);
  assert.match(sidebarSource, /const optionTitle = optionDisabled \? option\.disabledTitle : option\.title/);
  assert.match(sidebarSource, /title=\{optionTitle\}/);
  assert.match(sidebarSource, /<span[\s\S]*title=\{optionTitle\}/);
  assert.match(sidebarSource, /<button[\s\S]*disabled=\{optionDisabled\}[\s\S]*title=\{optionTitle\}/);
  assert.match(sidebarSource, /disabledTitle: personalDisabledTitle/);
  assert.match(sidebarSource, /No personal/);
  assert.match(sidebarSource, /sourceName/);
});

test('MCD personal source explains sign-in before reporting missing data', () => {
  const mcdPickerSource = sourceBetween('function SourceScopePicker', 'function formatLsStatus');
  const dataScopeSource = sourceBetween('<SectionLabel>{isZh ? \'数据范围\'', '{rawUploadsLoading || isSwitchingSource');

  assert.match(mcdPickerSource, /isSignedIn = false/);
  assert.match(mcdPickerSource, /const personalDisabledTitle = !isSignedIn/);
  assert.match(mcdPickerSource, /登录后可使用个人数据源。/);
  assert.match(dataScopeSource, /isSignedIn=\{Boolean\(user\)\}/);
});
