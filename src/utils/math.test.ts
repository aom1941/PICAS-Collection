/**
 * Fast-feedback unit tests for pure PICAS math & logic
 * Run via: tsx --test src/utils/math.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  delta_p,
  calculate_seam_score,
  wcagContrast,
  validateHumanProvenance,
  validateSystemProvenance,
  computeProjections,
} from './math';
import { EdgeVector, PicasEvent } from '../types/picas';

test('Δp exact calculation matches PICAS_SPEC §D.5 reference test value', () => {
  // Test case from PICAS_SPEC Anhang A & PICAS_GLOSSAR §D.5:
  // p_sys=(120, 90), p_subj=(130, 100), 400x300 => 14.142 / 500 = 0.028284...
  const p_sys = { x: 120, y: 90 };
  const p_subj = { x: 130, y: 100 };
  const width = 400;
  const height = 300;

  const result = delta_p(p_sys, p_subj, width, height);
  assert.ok(
    Math.abs(result - 0.028284271247461905) < 1e-6,
    `Expected ~0.028284, got ${result}`
  );
});

test('Δp is invariant under resolution scaling (doubling resolution)', () => {
  // 400x300 scaled to 800x600 with coordinates doubled
  const dp1 = delta_p({ x: 120, y: 90 }, { x: 130, y: 100 }, 400, 300);
  const dp2 = delta_p({ x: 240, y: 180 }, { x: 260, y: 200 }, 800, 600);
  assert.ok(Math.abs(dp1 - dp2) < 1e-10, 'Scale invariance failed');
});

test('Δp is invariant under 90-degree image rotation', () => {
  // Rotate 400x300 to 300x400: (x, y) -> (y, 400 - x)
  const dpOriginal = delta_p({ x: 120, y: 90 }, { x: 130, y: 100 }, 400, 300);
  const dpRotated = delta_p({ x: 90, y: 280 }, { x: 100, y: 270 }, 300, 400);
  assert.ok(Math.abs(dpOriginal - dpRotated) < 1e-10, 'Rotation invariance failed');
});

test('Seam score correctly calculates perfect continuation vs mismatch', () => {
  // Perfect right-left pair
  const vecRight: EdgeVector = {
    id: 'v1',
    edge: 'right',
    t: 0.618,
    d: [1, 0], // pointing directly right
    kind: 'line',
    confidence: 1.0,
  };

  const vecLeft: EdgeVector = {
    id: 'v2',
    edge: 'left',
    t: 0.618,
    d: [1, 0], // pointing directly into image B
    kind: 'line',
    confidence: 1.0,
  };

  const perfect = calculate_seam_score(vecRight, vecLeft);
  assert.equal(perfect.isValidOpposingPair, true);
  assert.equal(perfect.delta_t, 0);
  assert.equal(perfect.delta_theta, 0);
  assert.ok(Math.abs(perfect.score - 1.0) < 1e-6, 'Perfect seam score should be ~1.0');

  // Displaced t-position
  const displacedLeft: EdgeVector = { ...vecLeft, t: 0.9 };
  const displaced = calculate_seam_score(vecRight, displacedLeft);
  assert.ok(displaced.score < 0.01, 'Displaced seam score should drop exponentially');

  // Invalid edge pair (top with left)
  const invalidPair: EdgeVector = { ...vecLeft, edge: 'top' };
  const invalid = calculate_seam_score(vecRight, invalidPair);
  assert.equal(invalid.isValidOpposingPair, false);
  assert.equal(invalid.score, 0);
});

test('WCAG contrast matches Anhang B contrast_check.py values within rounding tolerance', () => {
  // Dark ground (#000000):
  // Ockergold #b87514: 5.59 : 1
  // Oxidrot #c23010: 3.72 : 1
  // Indigoblau #3d5a80: 2.97 : 1
  const cOchreDark = wcagContrast('#b87514', '#000000');
  const cOxideDark = wcagContrast('#c23010', '#000000');
  const cIndigoDark = wcagContrast('#3d5a80', '#000000');

  assert.ok(Math.abs(cOchreDark - 5.59) < 0.05, `Ochre dark: expected ~5.59, got ${cOchreDark}`);
  assert.ok(Math.abs(cOxideDark - 3.72) < 0.05, `Oxide dark: expected ~3.72, got ${cOxideDark}`);
  assert.ok(Math.abs(cIndigoDark - 2.97) < 0.05, `Indigo dark: expected ~2.97, got ${cIndigoDark}`);

  // Light ground (#ffffff):
  // Indigoblau #3d5a80: 7.06 : 1
  // Oxidrot #c23010: 5.64 : 1
  // Ockergold #b87514: 3.75 : 1
  const cIndigoLight = wcagContrast('#3d5a80', '#ffffff');
  const cOxideLight = wcagContrast('#c23010', '#ffffff');
  const cOchreLight = wcagContrast('#b87514', '#ffffff');

  assert.ok(Math.abs(cIndigoLight - 7.06) < 0.05, `Indigo light: expected ~7.06, got ${cIndigoLight}`);
  assert.ok(Math.abs(cOxideLight - 5.64) < 0.05, `Oxide light: expected ~5.64, got ${cOxideLight}`);
  assert.ok(Math.abs(cOchreLight - 3.75) < 0.05, `Ochre light: expected ~3.75, got ${cOchreLight}`);
});

test('Provenance validation strictly enforces Human & System requirements', () => {
  // Valid human event
  assert.equal(
    validateHumanProvenance({
      actor_kind: 'human',
      device: 'iphone',
      input_modality: 'finger',
      client_ts: '2026-10-21T12:00:00Z',
      image_id: 'img-1',
      zoom_level: 0.85,
    }),
    true
  );

  // Missing zoom_level with image_id
  assert.equal(
    validateHumanProvenance({
      actor_kind: 'human',
      device: 'iphone',
      input_modality: 'finger',
      client_ts: '2026-10-21T12:00:00Z',
      image_id: 'img-1',
    }),
    false
  );

  // Valid system event with Vier-Hash
  assert.equal(
    validateSystemProvenance({
      actor_kind: 'system',
      actor_id: 'system:picas_probe',
      schema_hash: '3f7a81b2c4d5e6f7a8b9c0d1e2f3a4b5',
      analyzer_version: '1.2.0',
      param_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      code_hash: 'git:commit:a1b2c3d4e5f6a7b8c9d0',
    }),
    true
  );

  // System missing code_hash
  assert.equal(
    validateSystemProvenance({
      actor_kind: 'system',
      actor_id: 'system:picas_probe',
      schema_hash: '3f7a81b2c4d5e6f7a8b9c0d1e2f3a4b5',
      analyzer_version: '1.2.0',
      param_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
    }),
    false
  );
});

test('Projection engine rebuilds state and non-destructively undos triage events', () => {
  const imgId = 'img-test-123';
  const imgDims = new Map([[imgId, { width_px: 400, height_px: 300 }]]);

  const events: PicasEvent[] = [
    {
      seq: 1,
      event_id: 'ev-1',
      schema_version: 1,
      event_type: 'analysis.center',
      actor_kind: 'system',
      actor_id: 'system:picas_probe',
      session_id: 'sess-1',
      image_id: imgId,
      server_ts: '2026-10-21T09:00:00Z',
      schema_hash: 'schemahash12345678901234567890',
      analyzer_version: '1.0.0',
      param_hash: 'paramhash12345678901234567890',
      code_hash: 'codehash12345678901234567890',
      payload: { estimator: 'saliency_centroid', x: 120, y: 90 },
    },
    {
      seq: 2,
      event_id: 'ev-2',
      schema_version: 1,
      event_type: 'triage.pick',
      actor_kind: 'human',
      actor_id: 'arne',
      session_id: 'sess-1',
      image_id: imgId,
      client_ts: '2026-10-21T09:01:00Z',
      server_ts: '2026-10-21T09:01:00Z',
      device: 'iphone',
      input_modality: 'finger',
      zoom_level: 0.75,
      payload: {},
    },
    {
      seq: 3,
      event_id: 'ev-3',
      schema_version: 1,
      event_type: 'triage.reject',
      actor_kind: 'human',
      actor_id: 'arne',
      session_id: 'sess-1',
      image_id: imgId,
      client_ts: '2026-10-21T09:02:00Z',
      server_ts: '2026-10-21T09:02:00Z',
      device: 'iphone',
      input_modality: 'finger',
      zoom_level: 0.75,
      payload: {},
    },
  ];

  // At seq 3, state is reject
  const proj1 = computeProjections(events, imgDims);
  assert.equal(proj1.triageStates.get(`${imgId}:arne`)?.state, 'triage.reject');

  // Now append meta.undo targeting ev-3
  events.push({
    seq: 4,
    event_id: 'ev-4',
    schema_version: 1,
    event_type: 'meta.undo',
    actor_kind: 'human',
    actor_id: 'arne',
    session_id: 'sess-1',
    ref_event_id: 'ev-3',
    client_ts: '2026-10-21T09:03:00Z',
    server_ts: '2026-10-21T09:03:00Z',
    device: 'iphone',
    input_modality: 'finger',
    payload: {},
  });

  // State should fall back to previous state: triage.pick!
  const proj2 = computeProjections(events, imgDims);
  assert.equal(proj2.triageStates.get(`${imgId}:arne`)?.state, 'triage.pick');

  // Now mark punctum
  events.push({
    seq: 5,
    event_id: 'ev-5',
    schema_version: 1,
    event_type: 'punctum.mark',
    actor_kind: 'human',
    actor_id: 'arne',
    session_id: 'sess-1',
    image_id: imgId,
    client_ts: '2026-10-21T09:04:00Z',
    server_ts: '2026-10-21T09:04:00Z',
    device: 'ipad',
    input_modality: 'pencil',
    zoom_level: 1.0,
    payload: { x: 130, y: 100 },
  });

  const proj3 = computeProjections(events, imgDims);
  assert.equal(proj3.punctumMarks.length, 1);
  assert.equal(proj3.deltaPRecords.length, 1);
  assert.ok(Math.abs(proj3.deltaPRecords[0].delta_p - 0.028284) < 1e-4);
});
