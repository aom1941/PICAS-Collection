/**
 * PICAS Event-Log Store
 * Implements Invariant 1.1 & 1.2: Append-only Event-Log with mandatory provenance.
 * Rebuildable projections (v_triage_state, v_punctum_marks, v_delta_p).
 * Controller lease arbiter for TV gallery (§3.1).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PicasEvent,
  EventType,
  DeviceRole,
  InputModality,
  ActorId,
  GallerySessionState,
} from '../types/picas';
import { SEED_IMAGES } from '../data/seedImages';
import { computeProjections, validateHumanProvenance } from '../utils/math';

const STORAGE_KEY = 'picas_append_only_event_log_v1';
const SESSION_STORAGE_KEY = 'picas_current_session_id';

function generateUUIDv7(): string {
  // Approximate UUIDv7 format with millisecond timestamp prefix
  const ts = Date.now().toString(16).padStart(12, '0');
  const rand = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${ts.substring(0, 8)}-${ts.substring(8, 12)}-7${rand.substring(0, 3)}-8${rand.substring(3, 6)}-${rand.substring(6, 18)}`;
}

// Initial System-Provenienz Vier-Hash events for all seed images
function createInitialSystemEvents(sessionId: string): PicasEvent[] {
  const events: PicasEvent[] = [];
  let seq = 1;

  for (const img of SEED_IMAGES) {
    // 1. analysis.center
    events.push({
      seq: seq++,
      event_id: generateUUIDv7(),
      schema_version: 1,
      event_type: 'analysis.center',
      actor_kind: 'system',
      actor_id: 'system:picas_probe',
      session_id: sessionId,
      image_id: img.image_id,
      server_ts: new Date(Date.now() - 3600000).toISOString(),
      schema_hash: '3f7a81b2c4d5e6f7a8b9c0d1e2f3a4b5',
      analyzer_version: 'v0.1.4',
      param_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      code_hash: 'git:7b29a1c43f0e816a2c91',
      payload: {
        estimator: img.system_center.estimator,
        x: img.system_center.x,
        y: img.system_center.y,
      },
    });

    // 2. analysis.metrics (92 probe features)
    events.push({
      seq: seq++,
      event_id: generateUUIDv7(),
      schema_version: 1,
      event_type: 'analysis.metrics',
      actor_kind: 'system',
      actor_id: 'system:picas_probe',
      session_id: sessionId,
      image_id: img.image_id,
      server_ts: new Date(Date.now() - 3590000).toISOString(),
      schema_hash: '3f7a81b2c4d5e6f7a8b9c0d1e2f3a4b5',
      analyzer_version: 'v0.1.4',
      param_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      code_hash: 'git:7b29a1c43f0e816a2c91',
      payload: img.probe_features,
    });

    // 3. analysis.vectors (Rand-Vektoren)
    events.push({
      seq: seq++,
      event_id: generateUUIDv7(),
      schema_version: 1,
      event_type: 'analysis.vectors',
      actor_kind: 'system',
      actor_id: 'system:picas_probe',
      session_id: sessionId,
      image_id: img.image_id,
      server_ts: new Date(Date.now() - 3580000).toISOString(),
      schema_hash: '3f7a81b2c4d5e6f7a8b9c0d1e2f3a4b5',
      analyzer_version: 'v0.1.4',
      param_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      code_hash: 'git:7b29a1c43f0e816a2c91',
      payload: { vectors: img.edge_vectors },
    });
  }

  // Pre-seed an initial punctum mark for Arne on Brutalist Arch and Hand of the Father
  // so delta_p is immediately demonstrable on first launch!
  const archImg = SEED_IMAGES[0];
  events.push({
    seq: seq++,
    event_id: generateUUIDv7(),
    schema_version: 1,
    event_type: 'punctum.mark',
    actor_kind: 'human',
    actor_id: 'arne',
    session_id: sessionId,
    image_id: archImg.image_id,
    client_ts: new Date(Date.now() - 1800000).toISOString(),
    server_ts: new Date(Date.now() - 1800000).toISOString(),
    device: 'ipad',
    input_modality: 'pencil',
    zoom_level: 1.0,
    payload: { x: 2840, y: 1380 }, // Shadow edge departure
  });

  const portraitImg = SEED_IMAGES[2];
  events.push({
    seq: seq++,
    event_id: generateUUIDv7(),
    schema_version: 1,
    event_type: 'punctum.mark',
    actor_kind: 'human',
    actor_id: 'arne',
    session_id: sessionId,
    image_id: portraitImg.image_id,
    client_ts: new Date(Date.now() - 1700000).toISOString(),
    server_ts: new Date(Date.now() - 1700000).toISOString(),
    device: 'ipad',
    input_modality: 'pencil',
    zoom_level: 1.25,
    payload: { x: 1490, y: 1890 }, // Weathered silver ring
  });

  // Pre-seed a voice note for the portrait
  events.push({
    seq: seq++,
    event_id: generateUUIDv7(),
    schema_version: 1,
    event_type: 'note.punctum',
    actor_kind: 'human',
    actor_id: 'arne',
    session_id: sessionId,
    image_id: portraitImg.image_id,
    client_ts: new Date(Date.now() - 1690000).toISOString(),
    server_ts: new Date(Date.now() - 1690000).toISOString(),
    device: 'iphone',
    input_modality: 'voice',
    zoom_level: 0.85,
    payload: {
      text: 'Der Ring fängt das kalte Nordlicht; die Gelenke der Hand erinnern an den Sommer 1984.',
      source: 'dictation',
      locale: 'de-DE',
    },
  });

  return events;
}

export function usePicasStore() {
  const [sessionId] = useState<string>(() => {
    let sid = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = generateUUIDv7();
      localStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  });

  const [events, setEvents] = useState<PicasEvent[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse stored events, re-initializing', e);
    }
    return createInitialSystemEvents(sessionId);
  });

  // Gallery session state with lease (§3.1)
  const [gallerySession, setGallerySession] = useState<GallerySessionState>({
    active_image_id: SEED_IMAGES[0].image_id,
    series: SEED_IMAGES.map((i) => i.image_id),
    mode: 'static',
    lease_holder: 'mac',
    lease_expiry: Date.now() + 60000,
    flight_progress: 0,
  });

  // Persist events to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error('Failed to write event log to localStorage', e);
    }
  }, [events]);

  // Image dimension map for projection calculation
  const imageDims = useMemo(() => {
    const map = new Map<string, { width_px: number; height_px: number }>();
    for (const img of SEED_IMAGES) {
      map.set(img.image_id, { width_px: img.width_px, height_px: img.height_px });
    }
    return map;
  }, []);

  // Compute live SQL views (projections)
  const projections = useMemo(() => {
    return computeProjections(events, imageDims);
  }, [events, imageDims]);

  /**
   * Append-Only Invariant Enforcement
   * Adds a new event to the tail of the log with monotonic sequence number.
   */
  const appendEvent = useCallback(
    (
      eventInput: Omit<PicasEvent, 'seq' | 'event_id' | 'server_ts' | 'schema_version' | 'session_id'> & {
        schema_version?: number;
      }
    ): PicasEvent => {
      const now = new Date().toISOString();
      const newEvent: PicasEvent = {
        seq: events.length + 1,
        event_id: generateUUIDv7(),
        schema_version: eventInput.schema_version ?? 1,
        session_id: sessionId,
        server_ts: now,
        ...eventInput,
      };

      // Strict Human Provenance validation
      if (newEvent.actor_kind === 'human' && !validateHumanProvenance(newEvent)) {
        console.error('Human Provenance violation:', newEvent);
        throw new Error('PICAS Event rejected: Missing mandatory Human-Provenienz (§1.2 & §4.3)');
      }

      setEvents((prev) => [...prev, newEvent]);

      // Handle gallery command effects
      if (newEvent.event_type === 'gallery.command') {
        const cmd = newEvent.payload?.cmd;
        if (cmd === 'take_lease') {
          setGallerySession((prev) => ({
            ...prev,
            lease_holder: newEvent.device === 'iphone' ? 'iphone' : 'mac',
            lease_expiry: Date.now() + 60000,
          }));
        } else if (cmd === 'next_image') {
          setGallerySession((prev) => {
            const curIdx = prev.series.indexOf(prev.active_image_id);
            const nextIdx = (curIdx + 1) % prev.series.length;
            return {
              ...prev,
              active_image_id: prev.series[nextIdx],
              mode: 'static',
              flight_progress: 0,
            };
          });
        } else if (cmd === 'prev_image') {
          setGallerySession((prev) => {
            const curIdx = prev.series.indexOf(prev.active_image_id);
            const prevIdx = (curIdx - 1 + prev.series.length) % prev.series.length;
            return {
              ...prev,
              active_image_id: prev.series[prevIdx],
              mode: 'static',
              flight_progress: 0,
            };
          });
        } else if (cmd === 'start_flight') {
          setGallerySession((prev) => ({
            ...prev,
            mode: 'flight',
            flight_progress: 0,
          }));
        } else if (cmd === 'select_image' && newEvent.payload?.image_id) {
          setGallerySession((prev) => ({
            ...prev,
            active_image_id: newEvent.payload.image_id,
            mode: 'static',
            flight_progress: 0,
          }));
        }
      }

      return newEvent;
    },
    [events.length, sessionId]
  );

  /**
   * Non-destructive Undo according to PICAS_SPEC §4.1:
   * Appends a new 'meta.undo' event pointing to ref_event_id.
   */
  const undoEvent = useCallback(
    (
      ref_event_id: string,
      actor_id: ActorId,
      device: DeviceRole,
      input_modality: InputModality
    ) => {
      appendEvent({
        event_type: 'meta.undo',
        actor_kind: 'human',
        actor_id,
        device,
        input_modality,
        client_ts: new Date().toISOString(),
        ref_event_id,
        payload: { reason: 'user_undo_invoked' },
      });
    },
    [appendEvent]
  );

  /**
   * Reset to initial state (for clean testing)
   */
  const resetLog = useCallback(() => {
    const initial = createInitialSystemEvents(sessionId);
    setEvents(initial);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  }, [sessionId]);

  /**
   * Export functions
   */
  const exportNDJSON = useCallback(() => {
    const ndjson = events.map((e) => JSON.stringify(e)).join('\n');
    const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `picas_event_log_${new Date().toISOString().substring(0, 10)}.ndjson`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  return {
    events,
    sessionId,
    projections,
    gallerySession,
    setGallerySession,
    appendEvent,
    undoEvent,
    resetLog,
    exportNDJSON,
  };
}
