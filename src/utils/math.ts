/**
 * PICAS — Mathematical reference implementation and validation
 * Strictly implements formulas from PICAS_SPEC §4, §6, §7 and PICAS_GLOSSAR §C, §D
 */

import {
  EdgeVector,
  PicasEvent,
  TriageState,
  PunctumMark,
  DeltaPRecord,
} from '../types/picas';

/**
 * Calculates Δp according to PICAS_GLOSSAR §D.4:
 * Δp := ||p_sys - p_subj||_2 / sqrt(W^2 + H^2) in [0, 1]
 * Normalized against image diagonal for scale and aspect-ratio invariance.
 */
export function delta_p(
  p_sys: { x: number; y: number },
  p_subj: { x: number; y: number },
  width: number,
  height: number
): number {
  if (width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive');
  }
  const dx = p_sys.x - p_subj.x;
  const dy = p_sys.y - p_subj.y;
  const euclideanDist = Math.hypot(dx, dy);
  const diagonal = Math.hypot(width, height);
  return euclideanDist / diagonal;
}

/**
 * Calculates edge vector continuation across a seam according to PICAS_GLOSSAR §C:
 * Valid only at opposing edges in sequence A -> B:
 * - A: right, B: left (Naht axis x, t runs along y)
 * - A: bottom, B: top (Naht axis y, t runs along x)
 * Score: s = exp(- (Δt / σ_t)^2 - (Δθ / σ_θ)^2)
 */
export function calculate_seam_score(
  vectorA: EdgeVector,
  vectorB: EdgeVector,
  sigma_t = 0.08,
  sigma_theta = 0.25 // radians ~ 14.3 degrees
): {
  score: number;
  delta_t: number;
  delta_theta: number;
  isValidOpposingPair: boolean;
} {
  const isHorizontalPair = vectorA.edge === 'right' && vectorB.edge === 'left';
  const isVerticalPair = vectorA.edge === 'bottom' && vectorB.edge === 'top';

  if (!isHorizontalPair && !isVerticalPair) {
    return {
      score: 0,
      delta_t: 1,
      delta_theta: Math.PI,
      isValidOpposingPair: false,
    };
  }

  // Position difference along edge
  const delta_t = Math.abs(vectorA.t - vectorB.t);

  // Direction angle calculation
  // Vector A is directed out of image A
  // Vector B is directed into image B (flip direction to match continuous stream)
  const angleA = Math.atan2(vectorA.d[1], vectorA.d[0]);
  const angleB = Math.atan2(vectorB.d[1], vectorB.d[0]);

  // Smallest angle difference in radians
  let delta_theta = Math.abs(angleA - angleB);
  if (delta_theta > Math.PI) {
    delta_theta = 2 * Math.PI - delta_theta;
  }

  // Exponential gaussian decay
  const exponent =
    -Math.pow(delta_t / sigma_t, 2) - Math.pow(delta_theta / sigma_theta, 2);
  const score = Math.exp(exponent) * Math.min(vectorA.confidence, vectorB.confidence);

  return {
    score: Math.max(0, Math.min(1, score)),
    delta_t,
    delta_theta,
    isValidOpposingPair: true,
  };
}

/**
 * WCAG 2.x relative luminance and contrast ratio
 * Matches contrast_check.py from PICAS_SPEC Anhang B
 */
function sRGBtoLin(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

export function wcagContrast(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const [hi, lo] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Validates Human-Provenance according to PICAS_SPEC §4.3 & Anhang A
 */
export function validateHumanProvenance(event: Partial<PicasEvent>): boolean {
  if (event.actor_kind !== 'human') return true;
  if (!event.device || !['iphone', 'ipad', 'mac', 'tv'].includes(event.device)) {
    return false;
  }
  if (
    !event.input_modality ||
    !['finger', 'pencil', 'mouse', 'voice', 'keyboard'].includes(event.input_modality)
  ) {
    return false;
  }
  if (!event.client_ts) return false;
  if (event.image_id && (event.zoom_level === undefined || event.zoom_level <= 0)) {
    return false;
  }
  return true;
}

/**
 * Validates System-Provenance (Vier-Hash) according to PICAS_SPEC §4.4 & Anhang A
 */
export function validateSystemProvenance(event: Partial<PicasEvent>): boolean {
  if (event.actor_kind !== 'system') return true;
  if (!event.schema_hash || event.schema_hash.length < 20) return false;
  if (!event.analyzer_version) return false;
  if (!event.param_hash || event.param_hash.length < 20) return false;
  if (!event.code_hash || event.code_hash.length < 20) return false;
  if (!event.actor_id || !event.actor_id.startsWith('system:')) return false;
  return true;
}

/**
 * Pure projection engine:
 * Rebuilds all SQL views (v_triage_state, v_punctum_marks, v_delta_p)
 * from the append-only event stream, correctly applying meta.undo.
 */
export function computeProjections(
  events: PicasEvent[],
  imageDimensions: Map<string, { width_px: number; height_px: number }>
): {
  triageStates: Map<string, TriageState>; // key: `${image_id}:${actor_id}`
  punctumMarks: PunctumMark[];
  deltaPRecords: DeltaPRecord[];
  ratings: Map<string, number>; // key: `${image_id}:${actor_id}`
  tags: Map<string, Set<string>>; // key: image_id
  notes: Array<{ event_id: string; image_id: string; text: string; source: string; actor_id: string; timestamp: string }>;
} {
  // Sort by sequence strictly ascending (seq is authoritative server ordering)
  const sorted = [...events].sort((a, b) => a.seq - b.seq);

  // Set of undone event IDs
  const undoneEventIds = new Set<string>();
  for (const e of sorted) {
    if (e.event_type === 'meta.undo' && e.ref_event_id) {
      undoneEventIds.add(e.ref_event_id);
    }
  }

  // 1. Triage states
  const triageHistory = new Map<string, TriageState[]>();
  for (const e of sorted) {
    if (
      ['triage.pick', 'triage.reject', 'triage.skip'].includes(e.event_type) &&
      e.image_id &&
      !undoneEventIds.has(e.event_id)
    ) {
      const key = `${e.image_id}:${e.actor_id}`;
      if (!triageHistory.has(key)) triageHistory.set(key, []);
      triageHistory.get(key)!.push({
        image_id: e.image_id,
        actor_id: e.actor_id,
        state: e.event_type as 'triage.pick' | 'triage.reject' | 'triage.skip',
        seq: e.seq,
        device: e.device || 'mac',
        input_modality: e.input_modality || 'mouse',
        timestamp: e.client_ts || e.server_ts,
      });
    }
  }

  const triageStates = new Map<string, TriageState>();
  for (const [key, history] of triageHistory.entries()) {
    if (history.length > 0) {
      // Latest valid triage event for this (image, actor)
      triageStates.set(key, history[history.length - 1]);
    }
  }

  // 2. Punctum Marks (v_punctum_marks)
  const punctumMarks: PunctumMark[] = [];
  for (const e of sorted) {
    if (
      e.event_type === 'punctum.mark' &&
      e.image_id &&
      !undoneEventIds.has(e.event_id) &&
      typeof e.payload?.x === 'number' &&
      typeof e.payload?.y === 'number'
    ) {
      punctumMarks.push({
        event_id: e.event_id,
        seq: e.seq,
        image_id: e.image_id,
        actor_id: e.actor_id,
        device: e.device || 'ipad',
        input_modality: e.input_modality || 'pencil',
        zoom_level: e.zoom_level || 1.0,
        x_px: e.payload.x,
        y_px: e.payload.y,
        timestamp: e.client_ts || e.server_ts,
      });
    }
  }

  // 3. System Analysis Centers
  const analysisCenters: Array<{
    event_id: string;
    image_id: string;
    estimator: string;
    analyzer_version: string;
    param_hash: string;
    x: number;
    y: number;
  }> = [];
  for (const e of sorted) {
    if (
      e.event_type === 'analysis.center' &&
      e.image_id &&
      !undoneEventIds.has(e.event_id) &&
      typeof e.payload?.x === 'number' &&
      typeof e.payload?.y === 'number'
    ) {
      analysisCenters.push({
        event_id: e.event_id,
        image_id: e.image_id,
        estimator: e.payload.estimator || 'saliency_centroid',
        analyzer_version: e.analyzer_version || '1.0.0',
        param_hash: e.param_hash || 'param-hash',
        x: e.payload.x,
        y: e.payload.y,
      });
    }
  }

  // 4. Δp Calculation (v_delta_p)
  // Join v_punctum_marks with analysis.center on image_id
  const deltaPRecords: DeltaPRecord[] = [];
  for (const mark of punctumMarks) {
    const dims = imageDimensions.get(mark.image_id);
    if (!dims) continue;

    for (const center of analysisCenters) {
      if (center.image_id === mark.image_id) {
        const dp = delta_p(
          { x: center.x, y: center.y },
          { x: mark.x_px, y: mark.y_px },
          dims.width_px,
          dims.height_px
        );
        deltaPRecords.push({
          mark_event_id: mark.event_id,
          analysis_event_id: center.event_id,
          image_id: mark.image_id,
          actor_id: mark.actor_id,
          device: mark.device,
          input_modality: mark.input_modality,
          zoom_level: mark.zoom_level,
          estimator: center.estimator,
          analyzer_version: center.analyzer_version,
          param_hash: center.param_hash,
          delta_p: dp,
          p_sys: { x: center.x, y: center.y },
          p_subj: { x: mark.x_px, y: mark.y_px },
        });
      }
    }
  }

  // 5. Ratings, Tags, Notes
  const ratings = new Map<string, number>();
  const tags = new Map<string, Set<string>>();
  const notes: Array<{ event_id: string; image_id: string; text: string; source: string; actor_id: string; timestamp: string }> = [];

  for (const e of sorted) {
    if (undoneEventIds.has(e.event_id) || !e.image_id) continue;

    if (e.event_type === 'rating.set' && typeof e.payload?.value === 'number') {
      ratings.set(`${e.image_id}:${e.actor_id}`, e.payload.value);
    } else if (e.event_type === 'tag.add' && e.payload?.tag) {
      if (!tags.has(e.image_id)) tags.set(e.image_id, new Set());
      tags.get(e.image_id)!.add(e.payload.tag);
    } else if (e.event_type === 'tag.remove' && e.payload?.tag) {
      if (tags.has(e.image_id)) {
        tags.get(e.image_id)!.delete(e.payload.tag);
      }
    } else if (e.event_type === 'note.punctum' && e.payload?.text) {
      notes.push({
        event_id: e.event_id,
        image_id: e.image_id,
        text: e.payload.text,
        source: e.payload.source || 'typed',
        actor_id: e.actor_id,
        timestamp: e.client_ts || e.server_ts,
      });
    }
  }

  return {
    triageStates,
    punctumMarks,
    deltaPRecords,
    ratings,
    tags,
    notes,
  };
}
