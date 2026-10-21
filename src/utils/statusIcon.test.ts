import test from 'node:test';
import assert from 'node:assert/strict';
import { getStatusIcon, getMenuIcon, MENU_ICONS, ToggleSwitch } from './statusIcons';
import { getStatusIcon as getStatusIconFromSingular } from './statusIcon';
import { Check, X, Minus, Smartphone, Monitor, Tablet, Tv, Database, Eye } from 'lucide-react';

test('getStatusIcon returns Check for pick states', () => {
  assert.strictEqual(getStatusIcon('pick'), Check);
  assert.strictEqual(getStatusIcon('triage.pick'), Check);
  assert.strictEqual(getStatusIconFromSingular('pick'), Check);
});

test('getStatusIcon returns X for reject states', () => {
  assert.strictEqual(getStatusIcon('reject'), X);
  assert.strictEqual(getStatusIcon('triage.reject'), X);
  assert.strictEqual(getStatusIconFromSingular('reject'), X);
});

test('getStatusIcon returns Minus for skip or other states', () => {
  assert.strictEqual(getStatusIcon('skip'), Minus);
  assert.strictEqual(getStatusIcon('triage.skip'), Minus);
  assert.strictEqual(getStatusIcon('unknown'), Minus);
  assert.strictEqual(getStatusIconFromSingular('skip'), Minus);
});

test('getMenuIcon returns correct Lucide icon for menu items', () => {
  assert.strictEqual(getMenuIcon('iphone'), Smartphone);
  assert.strictEqual(getMenuIcon('leitstand'), Monitor);
  assert.strictEqual(getMenuIcon('ipad'), Tablet);
  assert.strictEqual(getMenuIcon('oled'), Tv);
  assert.strictEqual(getMenuIcon('eventlog'), Database);
  assert.strictEqual(getMenuIcon('inspect'), Eye);
  assert.ok(MENU_ICONS.spec);
});

test('ToggleSwitch component is exported and valid React component', () => {
  assert.strictEqual(typeof ToggleSwitch, 'function');
});
