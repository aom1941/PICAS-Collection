/**
 * PICAS — Type definitions according to PICAS_SPEC & PICAS_GLOSSAR
 * Version: v0.1-entwurf
 */

export type DeviceRole = 'iphone' | 'ipad' | 'mac' | 'tv';

export type InputModality = 'finger' | 'pencil' | 'mouse' | 'voice' | 'keyboard';

export type ActorKind = 'human' | 'system';

export type ActorId = 'arne' | 'vater' | string;

export type EventType =
  | 'triage.pick'
  | 'triage.reject'
  | 'triage.skip'
  | 'meta.undo'
  | 'rating.set'
  | 'tag.add'
  | 'tag.remove'
  | 'note.punctum'
  | 'punctum.mark'
  | 'stroke.commit'
  | 'canvas.place'
  | 'canvas.link'
  | 'gallery.command'
  | 'calibration.start'
  | 'calibration.end'
  | 'analysis.center'
  | 'analysis.metrics'
  | 'analysis.vectors';

export interface PicasEvent {
  seq: number;
  event_id: string; // UUIDv7
  schema_version: number;
  event_type: EventType;
  actor_kind: ActorKind;
  actor_id: ActorId;
  session_id: string;
  image_id?: string; // SHA-256 of original
  ref_event_id?: string;
  client_ts?: string;
  server_ts: string;
  // Human provenance
  device?: DeviceRole;
  input_modality?: InputModality;
  zoom_level?: number;
  // System provenance (Vier-Hash)
  schema_hash?: string;
  analyzer_version?: string;
  param_hash?: string;
  code_hash?: string;
  payload: Record<string, any>;
}

export interface EdgeVector {
  id: string;
  edge: 'top' | 'right' | 'bottom' | 'left';
  t: number; // in [0, 1] normalized along the edge
  d: [number, number]; // unit tangent vector exiting image
  kind: 'line' | 'edge' | 'contour' | 'gradient';
  confidence: number;
}

export interface PicasImage {
  image_id: string; // 64-char hex SHA-256
  title: string;
  series: string;
  width_px: number;
  height_px: number;
  aspect_ratio: string;
  created_at: string;
  render_type: 'architectural' | 'coastal' | 'portrait' | 'staircase' | 'nocturne' | 'monolith';
  capture_meta: {
    camera: string;
    lens: string;
    focal_length: string;
    iso: number;
    shutter: string;
    aperture: string;
    film_stock: string;
    location: string;
  };
  probe_features: {
    sharpness_mtf50: number; // 0..1
    micro_contrast: number; // 0..1
    tonal_entropy: number; // bits
    dynamic_range_stops: number;
    edge_coherence: number;
    color_saturation_mean: number;
    highlight_clipping_pct: number;
    shadow_depth_pct: number;
    spatial_frequency_high: number;
    compositional_balance: number;
    saliency_peak_val: number;
    noise_sigma: number;
    [key: string]: number;
  };
  system_center: {
    estimator: 'saliency_centroid' | 'structure_centroid';
    x: number;
    y: number;
  };
  edge_vectors: EdgeVector[];
}

export interface TriageState {
  image_id: string;
  actor_id: string;
  state: 'triage.pick' | 'triage.reject' | 'triage.skip';
  seq: number;
  device: DeviceRole;
  input_modality: InputModality;
  timestamp: string;
}

export interface PunctumMark {
  event_id: string;
  seq: number;
  image_id: string;
  actor_id: string;
  device: DeviceRole;
  input_modality: InputModality;
  zoom_level: number;
  x_px: number;
  y_px: number;
  timestamp: string;
}

export interface DeltaPRecord {
  mark_event_id: string;
  analysis_event_id: string;
  image_id: string;
  actor_id: string;
  device: DeviceRole;
  input_modality: InputModality;
  zoom_level: number;
  estimator: string;
  analyzer_version: string;
  param_hash: string;
  delta_p: number; // in [0, 1]
  p_sys: { x: number; y: number };
  p_subj: { x: number; y: number };
}

export interface GallerySessionState {
  active_image_id: string;
  series: string[];
  mode: 'static' | 'flight';
  lease_holder: 'iphone' | 'mac' | 'none';
  lease_expiry: number; // timestamp ms
  flight_progress: number; // 0..1
}
