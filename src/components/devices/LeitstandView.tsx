/**
 * Leitstand — Dell 23" + Maus am Mac mini · Konvolut Teil 2 & Regie
 * Primary verbs: prüfen, regieren
 * Dense grids, keyboard workflows (P/X/U, 1–5), 1:1 Loupe check,
 * audit of 92 picas_probe features, Δp distribution analysis, and TV Regie.
 *
 * Strict 2-weight typography hierarchy:
 * - Sans: 400 (normal) / 600 (semibold)
 * - Serif: 400 (normal) / 700 (bold)
 * - Mono: 400 (normal)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PicasImage, PicasEvent, ActorId } from '../../types/picas';
import { PhotographicCanvas } from '../PhotographicCanvas';
import { TriageBadge } from '../TriageBadge';
import {
  Check,
  X,
  Minus,
  RotateCcw,
  Star,
  ZoomIn,
  Tv,
  Eye,
  Sliders,
  BarChart2,
  List,
} from 'lucide-react';
import { ToggleSwitch } from '../../utils/statusIcons';

interface LeitstandViewProps {
  images: PicasImage[];
  projections: ReturnType<typeof import('../../utils/math').computeProjections>;
  events: PicasEvent[];
  appendEvent: (event: any) => PicasEvent;
  undoEvent: (ref_id: string, actor: ActorId, dev: any, mod: any) => void;
  gallerySession: ReturnType<typeof import('../../store/eventStore').usePicasStore>['gallerySession'];
}

export const LeitstandView: React.FC<LeitstandViewProps> = ({
  images,
  projections,
  events,
  appendEvent,
  undoEvent,
  gallerySession,
}) => {
  const [selectedImageId, setSelectedImageId] = useState<string>(images[0].image_id);
  const [activeTab, setActiveTab] = useState<'inspect' | 'probe' | 'deltap' | 'regie'>('inspect');
  const [isLoupeActive, setIsLoupeActive] = useState<boolean>(false);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [newTagInput, setNewTagInput] = useState('');
  const [stratFilter, setStratFilter] = useState<'all' | 'arne' | 'vater' | 'ipad' | 'iphone'>('all');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'pick' | 'reject' | 'unreviewed'>('all');

  const triageCounts = useMemo(() => {
    let picks = 0;
    let rejects = 0;
    let unreviewed = 0;
    images.forEach((img) => {
      const s = projections.triageStates.get(`${img.image_id}:arne`);
      if (s?.state === 'triage.pick') picks++;
      else if (s?.state === 'triage.reject') rejects++;
      else unreviewed++;
    });
    return { picks, rejects, unreviewed };
  }, [images, projections.triageStates]);

  const filteredInventoryImages = useMemo(() => {
    return images.filter((img) => {
      const s = projections.triageStates.get(`${img.image_id}:arne`);
      if (inventoryFilter === 'pick') return s?.state === 'triage.pick';
      if (inventoryFilter === 'reject') return s?.state === 'triage.reject';
      if (inventoryFilter === 'unreviewed') return !s || s.state === 'triage.skip';
      return true;
    });
  }, [images, inventoryFilter, projections.triageStates]);

  const selectedImage = images.find((i) => i.image_id === selectedImageId) || images[0];

  // Current triage state & rating
  const triageState = projections.triageStates.get(`${selectedImage.image_id}:arne`);
  const currentRating = projections.ratings.get(`${selectedImage.image_id}:arne`) || 0;
  const currentTags = projections.tags.get(selectedImage.image_id) || new Set<string>();

  // Relevant delta_p records
  const imageDeltaP = projections.deltaPRecords.filter((d) => d.image_id === selectedImage.image_id);

  // Keyboard navigation & triage (P/X/U, 1-5, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      if (key === 'P') {
        e.preventDefault();
        appendEvent({
          event_type: 'triage.pick',
          actor_kind: 'human',
          actor_id: 'arne',
          device: 'mac',
          input_modality: 'keyboard',
          zoom_level: 1.0,
          image_id: selectedImage.image_id,
          client_ts: new Date().toISOString(),
          payload: { trigger: 'key_P' },
        });
      } else if (key === 'X') {
        e.preventDefault();
        appendEvent({
          event_type: 'triage.reject',
          actor_kind: 'human',
          actor_id: 'arne',
          device: 'mac',
          input_modality: 'keyboard',
          zoom_level: 1.0,
          image_id: selectedImage.image_id,
          client_ts: new Date().toISOString(),
          payload: { trigger: 'key_X' },
        });
      } else if (key === 'U') {
        e.preventDefault();
        // Find last event on this image to undo
        const lastEv = [...events]
          .reverse()
          .find(
            (ev) =>
              ev.image_id === selectedImage.image_id &&
              ev.actor_id === 'arne' &&
              ['triage.pick', 'triage.reject', 'triage.skip'].includes(ev.event_type) &&
              !events.some((u) => u.event_type === 'meta.undo' && u.ref_event_id === ev.event_id)
          );
        if (lastEv) {
          undoEvent(lastEv.event_id, 'arne', 'mac', 'keyboard');
        }
      } else if (['1', '2', '3', '4', '5'].includes(key)) {
        e.preventDefault();
        appendEvent({
          event_type: 'rating.set',
          actor_kind: 'human',
          actor_id: 'arne',
          device: 'mac',
          input_modality: 'keyboard',
          zoom_level: 1.0,
          image_id: selectedImage.image_id,
          client_ts: new Date().toISOString(),
          payload: { value: parseInt(key, 10) },
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage.image_id, appendEvent, undoEvent, events]);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    appendEvent({
      event_type: 'tag.add',
      actor_kind: 'human',
      actor_id: 'arne',
      device: 'mac',
      input_modality: 'keyboard',
      zoom_level: 1.0,
      image_id: selectedImage.image_id,
      client_ts: new Date().toISOString(),
      payload: { tag: newTagInput.trim().toLowerCase() },
    });
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    appendEvent({
      event_type: 'tag.remove',
      actor_kind: 'human',
      actor_id: 'arne',
      device: 'mac',
      input_modality: 'mouse',
      zoom_level: 1.0,
      image_id: selectedImage.image_id,
      client_ts: new Date().toISOString(),
      payload: { tag },
    });
  };

  // Stratified delta_p records
  const filteredDeltaP = useMemo(() => {
    return projections.deltaPRecords.filter((rec) => {
      if (stratFilter === 'all') return true;
      if (stratFilter === 'arne') return rec.actor_id === 'arne';
      if (stratFilter === 'vater') return rec.actor_id === 'vater';
      if (stratFilter === 'ipad') return rec.device === 'ipad';
      if (stratFilter === 'iphone') return rec.device === 'iphone';
      return true;
    });
  }, [projections.deltaPRecords, stratFilter]);

  // Histogram bins for Δp [0.0 - 0.5]
  const deltaPBins = useMemo(() => {
    const bins = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const rec of filteredDeltaP) {
      const idx = Math.min(9, Math.floor(rec.delta_p * 20));
      bins[idx]++;
    }
    return bins;
  }, [filteredDeltaP]);

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] bg-[#0d0f12] text-stone-200 overflow-hidden font-sans">
      {/* Leitstand Control Bar */}
      <div className="h-12 border-b border-stone-800 bg-[#13161c] px-4 flex items-center justify-between shrink-0 leading-none">
        <div className="flex items-center gap-3">
          <span className="font-sans text-xs uppercase tracking-wider text-amber-500 font-semibold leading-none">
            Dell 23" · Leitstand
          </span>
          <span className="text-stone-600">|</span>
          <span className="text-xs text-stone-400 font-sans font-normal leading-none">
            Tastatur: <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-[11px]">P</kbd> Pick · <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-[11px]">X</kbd> Reject · <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-[11px]">U</kbd> Undo · <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-stone-200 font-mono text-[11px]">1-5</kbd> Stern
          </span>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-lg border border-stone-800">
          <button
            onClick={() => setActiveTab('inspect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-colors leading-none ${
              activeTab === 'inspect'
                ? 'bg-[#3d5a80] text-white font-semibold'
                : 'text-stone-400 hover:text-white font-normal'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>1:1 Prüfung</span>
          </button>
          <button
            onClick={() => setActiveTab('probe')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-colors leading-none ${
              activeTab === 'probe'
                ? 'bg-[#3d5a80] text-white font-semibold'
                : 'text-stone-400 hover:text-white font-normal'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>picas_probe (92 Merkmale)</span>
          </button>
          <button
            onClick={() => setActiveTab('deltap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-colors leading-none ${
              activeTab === 'deltap'
                ? 'bg-[#3d5a80] text-white font-semibold'
                : 'text-stone-400 hover:text-white font-normal'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Δp Verteilung</span>
          </button>
          <button
            onClick={() => setActiveTab('regie')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-colors leading-none ${
              activeTab === 'regie'
                ? 'bg-[#b87514] text-white font-semibold'
                : 'text-stone-400 hover:text-white font-normal'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>TV-Regie</span>
          </button>
        </div>
      </div>

      {/* Main Leitstand Workspace Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Dense Grid Inventory (Konvolut Teil 2) */}
        <div className="w-80 border-r border-stone-800 bg-[#101217] flex flex-col shrink-0">
          <div className="p-3 border-b border-stone-800 flex items-center justify-between leading-none">
            <span className="text-xs font-sans uppercase text-stone-400 tracking-wider font-semibold">
              Konvolut ({images.length} Negative)
            </span>
            <span className="text-xs font-mono font-normal text-stone-500">SHA-256</span>
          </div>

          {/* Accessibility Filter Tabs with distinct geometric shapes (SPEC §7) */}
          <div className="p-2 border-b border-stone-800/80 grid grid-cols-4 gap-1 bg-[#0c0e12]">
            <button
              onClick={() => setInventoryFilter('all')}
              className={`py-1 px-1 rounded text-[11px] font-sans text-center transition-colors leading-none ${
                inventoryFilter === 'all'
                  ? 'bg-stone-800 text-stone-100 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Alle ({images.length})
            </button>
            <button
              onClick={() => setInventoryFilter('pick')}
              className={`py-1 px-1 rounded text-[11px] font-sans flex items-center justify-center gap-1 transition-colors leading-none ${
                inventoryFilter === 'pick'
                  ? 'bg-[#3d5a80] text-white font-semibold'
                  : 'text-stone-400 hover:text-[#89b3e6]'
              }`}
              title="Picks (Indigoblau · Checkmark ✓)"
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>{triageCounts.picks}</span>
            </button>
            <button
              onClick={() => setInventoryFilter('reject')}
              className={`py-1 px-1 rounded text-[11px] font-sans flex items-center justify-center gap-1 transition-colors leading-none ${
                inventoryFilter === 'reject'
                  ? 'bg-[#c23010] text-white font-semibold'
                  : 'text-stone-400 hover:text-[#f27457]'
              }`}
              title="Rejects (Oxidrot · Kreuz ✕)"
            >
              <X className="w-2.5 h-2.5 stroke-[3]" />
              <span>{triageCounts.rejects}</span>
            </button>
            <button
              onClick={() => setInventoryFilter('unreviewed')}
              className={`py-1 px-1 rounded text-[11px] font-sans flex items-center justify-center gap-1 transition-colors leading-none ${
                inventoryFilter === 'unreviewed'
                  ? 'bg-stone-800 text-stone-200 font-semibold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Offen (Minus −)"
            >
              <Minus className="w-2.5 h-2.5 stroke-[3]" />
              <span>{triageCounts.unreviewed}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredInventoryImages.map((img) => {
              const isSelected = img.image_id === selectedImageId;
              const state = projections.triageStates.get(`${img.image_id}:arne`);
              const rating = projections.ratings.get(`${img.image_id}:arne`) || 0;

              return (
                <div
                  key={img.image_id}
                  onClick={() => setSelectedImageId(img.image_id)}
                  className={`p-2.5 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-stone-800/80 border-amber-500 shadow-md'
                      : 'bg-[#151820] border-stone-800/80 hover:border-stone-700'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="w-20 h-16 rounded overflow-hidden bg-black shrink-0 relative">
                      <PhotographicCanvas image={img} showSystemCenter={false} showPunctumMarks={false} />
                      {state && (
                        <div className="absolute top-1 left-1 z-10">
                          <TriageBadge state={state.state} size="xs" showLabel={false} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-serif font-normal text-stone-200 truncate leading-snug">
                        {img.title}
                      </div>
                      <div className="text-[11px] font-sans font-normal text-stone-400 truncate mt-0.5 leading-normal">
                        {img.series}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] font-mono font-normal leading-none">
                        <span className="text-stone-500">{img.width_px}×{img.height_px}</span>
                        {rating > 0 && (
                          <span className="text-amber-400 flex items-center font-normal">
                            ★ {rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Primary Inspection Stage */}
        <div className="flex-1 flex flex-col bg-[#0b0c0f] overflow-hidden relative">
          {activeTab === 'inspect' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* Inspection Canvas Area */}
              <div
                className="flex-1 rounded-2xl bg-black border border-stone-800 overflow-hidden relative flex items-center justify-center"
                onMouseMove={(e) => {
                  if (!isLoupeActive) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setLoupePos({
                    x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
                    y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
                  });
                }}
              >
                <PhotographicCanvas
                  image={selectedImage}
                  showSystemCenter={true}
                  showPunctumMarks={true}
                  showEdgeVectors={true}
                  showDeltaPVector={true}
                  punctumMarks={projections.punctumMarks}
                  className="w-full h-full max-h-[640px]"
                  zoomLevel={1.0}
                  onImageClick={(pt) => {
                    appendEvent({
                      event_type: 'punctum.mark',
                      actor_kind: 'human',
                      actor_id: 'arne',
                      device: 'mac',
                      input_modality: 'mouse',
                      zoom_level: 1.0,
                      image_id: selectedImage.image_id,
                      client_ts: new Date().toISOString(),
                      payload: { x: pt.x, y: pt.y, x_px: pt.x, y_px: pt.y },
                    });
                  }}
                />

                {/* 1:1 Loupe Magnifier Overlay */}
                {isLoupeActive && (
                  <div
                    className="absolute w-48 h-48 rounded-full border-2 border-amber-400 shadow-2xl pointer-events-none overflow-hidden bg-black"
                    style={{
                      left: `calc(${loupePos.x}% - 96px)`,
                      top: `calc(${loupePos.y}% - 96px)`,
                    }}
                  >
                    <div
                      className="w-[400%] h-[400%] relative"
                      style={{
                        transform: `translate(-${loupePos.x * 3}%, -${loupePos.y * 3}%)`,
                      }}
                    >
                      <PhotographicCanvas
                        image={selectedImage}
                        showSystemCenter={true}
                        showPunctumMarks={true}
                      />
                    </div>
                    <div className="absolute inset-0 border border-white/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                    </div>
                  </div>
                )}

                {/* Canvas Floating Top Info: Title & Triage Status Badge with geometric shapes */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 bg-stone-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-stone-800 shadow-lg">
                  <span className="font-serif text-sm font-normal text-stone-100">{selectedImage.title}</span>
                  <span className="text-stone-600">·</span>
                  <TriageBadge state={triageState?.state} size="xs" showLabel={true} />
                </div>

                {/* Canvas Floating Controls: Toggle Switch for 1:1 Schärfe-Lupe */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-stone-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-800 z-10 shadow-lg">
                  <ToggleSwitch
                    checked={isLoupeActive}
                    onChange={setIsLoupeActive}
                    label="1:1 Schärfe-Lupe"
                    size="sm"
                    icon={ZoomIn}
                    activeColor="bg-amber-600"
                    ariaLabel="1:1 Schärfe-Lupe ein- oder ausschalten"
                  />
                </div>
              </div>

              {/* Triage & Rating Action Bar */}
              <div className="h-16 mt-3 bg-[#13161c] border border-stone-800 rounded-xl px-4 flex items-center justify-between shrink-0 leading-none">
                <div className="flex items-center gap-2.5">
                  {/* Pick Button (Indigoblau + Checkmark ✓) */}
                  <button
                    onClick={() => {
                      appendEvent({
                        event_type: 'triage.pick',
                        actor_kind: 'human',
                        actor_id: 'arne',
                        device: 'mac',
                        input_modality: 'mouse',
                        zoom_level: 1.0,
                        image_id: selectedImage.image_id,
                        client_ts: new Date().toISOString(),
                        payload: {},
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-sans text-xs font-semibold flex items-center gap-2 transition-colors leading-none ${
                      triageState?.state === 'triage.pick'
                        ? 'bg-[#3d5a80] text-white border border-[#5277a7]'
                        : 'bg-stone-800 text-stone-300 hover:bg-[#3d5a80] hover:text-white'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Pick (P)</span>
                  </button>

                  {/* Reject Button (Oxidrot + Cross ✕) */}
                  <button
                    onClick={() => {
                      appendEvent({
                        event_type: 'triage.reject',
                        actor_kind: 'human',
                        actor_id: 'arne',
                        device: 'mac',
                        input_modality: 'mouse',
                        zoom_level: 1.0,
                        image_id: selectedImage.image_id,
                        client_ts: new Date().toISOString(),
                        payload: {},
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-sans text-xs font-semibold flex items-center gap-2 transition-colors leading-none ${
                      triageState?.state === 'triage.reject'
                        ? 'bg-[#c23010] text-white border border-[#e05638]'
                        : 'bg-stone-800 text-stone-300 hover:bg-[#c23010] hover:text-white'
                    }`}
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                    <span>Reject (X)</span>
                  </button>

                  {/* Skip Button (Minus −) */}
                  <button
                    onClick={() => {
                      appendEvent({
                        event_type: 'triage.skip',
                        actor_kind: 'human',
                        actor_id: 'arne',
                        device: 'mac',
                        input_modality: 'mouse',
                        zoom_level: 1.0,
                        image_id: selectedImage.image_id,
                        client_ts: new Date().toISOString(),
                        payload: {},
                      });
                    }}
                    className={`px-3 py-2 rounded-lg font-sans text-xs font-normal flex items-center gap-1.5 transition-colors leading-none ${
                      triageState?.state === 'triage.skip'
                        ? 'bg-stone-700 text-stone-100 font-semibold'
                        : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700'
                    }`}
                    title="Bild überspringen"
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Skip</span>
                  </button>

                  {/* Undo Button */}
                  <button
                    onClick={() => {
                      const lastTriage = [...events].reverse().find(
                        (ev) =>
                          ['triage.pick', 'triage.reject', 'triage.skip'].includes(ev.event_type) &&
                          ev.image_id === selectedImage.image_id
                      );
                      if (lastTriage) {
                        undoEvent(lastTriage.event_id, 'arne', 'mac', 'mouse');
                      }
                    }}
                    className="px-3 py-2 rounded-lg font-sans text-xs font-normal flex items-center gap-1.5 text-stone-400 hover:text-stone-200 bg-stone-800/80 hover:bg-stone-700 transition-colors leading-none"
                    title="Letzte Triage dieses Bildes zurücknehmen (U)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 opacity-70" />
                    <span>Undo (U)</span>
                  </button>
                </div>

                {/* Rating Stars 1-5 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-sans font-normal text-stone-500 mr-2 leading-none">Bewertung:</span>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      onClick={() => {
                        appendEvent({
                          event_type: 'rating.set',
                          actor_kind: 'human',
                          actor_id: 'arne',
                          device: 'mac',
                          input_modality: 'mouse',
                          zoom_level: 1.0,
                          image_id: selectedImage.image_id,
                          client_ts: new Date().toISOString(),
                          payload: { value: starVal },
                        });
                      }}
                      className={`p-1 rounded hover:scale-110 transition-transform ${
                        starVal <= currentRating ? 'text-amber-400' : 'text-stone-700'
                      }`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  ))}
                </div>

                {/* Tags form */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {Array.from(currentTags).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-stone-800 text-stone-300 leading-none"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <form onSubmit={handleAddTag} className="flex gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="+ Tag"
                      className="w-20 bg-stone-900 border border-stone-700 text-xs px-2.5 py-1 rounded-lg font-sans font-normal text-stone-200 focus:outline-none focus:border-amber-400 leading-none"
                    />
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'probe' && (
            /* 92 picas_probe Features Audit (§2 Leitstand) */
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-stone-100 leading-snug">
                      picas_probe v0.1.4 — Merkmal-Audit
                    </h3>
                    <p className="text-xs font-mono font-normal text-stone-400 mt-1 leading-normal">
                      System-Provenienz: Schema-Hash 3f7a81... · Param-Hash 9a8b7c... · Code git:7b29a1
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-normal text-amber-400 leading-none">
                      MTF50 Schärfe: {(selectedImage.probe_features.sharpness_mtf50 * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs font-mono font-normal text-stone-500 mt-1 leading-none">
                      Dynamikumfang: {selectedImage.probe_features.dynamic_range_stops} Blenden
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(selectedImage.probe_features).map(([metric, val]) => (
                    <div
                      key={metric}
                      className="p-3.5 bg-[#13161c] border border-stone-800 rounded-xl"
                    >
                      <div className="text-[11px] font-sans font-normal text-stone-400 truncate leading-none">
                        {metric.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xl font-mono font-normal text-stone-100 mt-2 leading-none">
                        {typeof val === 'number' ? (val < 1 && val > 0 ? val.toFixed(3) : val.toString()) : val}
                      </div>
                      <div className="w-full bg-stone-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                          className="bg-[#3d5a80] h-full"
                          style={{
                            width: `${Math.min(100, typeof val === 'number' ? (val <= 1 ? val * 100 : (val / 16) * 100) : 50)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deltap' && (
            /* Δp Distribution Analysis (§D.7) */
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-stone-100 leading-snug">
                      Δp-Verteilungsanalyse (Punctum-Distanz)
                    </h3>
                    <p className="text-xs font-mono font-normal text-stone-400 mt-1 leading-normal">
                      Δp = ||p_sys - p_subj||_2 / Bilddiagonale ∈ [0, 1] · Stratifiziert nach Provenienz
                    </p>
                  </div>

                  {/* Stratification Filter */}
                  <div className="flex items-center gap-2 leading-none">
                    <span className="text-xs font-sans font-normal text-stone-500">Filter:</span>
                    {(['all', 'arne', 'vater', 'ipad', 'iphone'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setStratFilter(filter)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-sans capitalize transition-colors leading-none ${
                          stratFilter === filter
                            ? 'bg-amber-500 text-stone-950 font-semibold'
                            : 'bg-stone-900 text-stone-400 hover:text-stone-200 font-normal'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Histogram Visualizer */}
                <div className="p-4 bg-[#13161c] border border-stone-800 rounded-xl">
                  <div className="text-xs font-sans font-normal text-stone-400 mb-4 leading-none">
                    Histogramm: Δp-Häufigkeit (Bins 0.05 Schritte bis 0.50)
                  </div>
                  <div className="h-48 flex items-end gap-3 pt-6 border-b border-stone-700">
                    {deltaPBins.map((count, i) => {
                      const maxCount = Math.max(1, ...deltaPBins);
                      const heightPct = (count / maxCount) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                          <span className={`text-[10px] font-mono font-normal transition-opacity leading-none ${
                            count > 0 ? 'text-amber-400' : 'text-transparent'
                          }`}>
                            {count}
                          </span>
                          <div
                            className={`w-full rounded-t transition-all ${
                              count > 0 ? 'bg-[#3d5a80] group-hover:bg-amber-500' : 'bg-stone-800'
                            }`}
                            style={{ height: count > 0 ? `${Math.max(22, heightPct)}%` : '4px' }}
                          />
                          <span className="text-[9px] font-mono font-normal text-stone-500 mt-1 leading-none">
                            {(i * 0.05).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center text-[11px] font-sans font-normal text-stone-500 mt-2.5 leading-normal">
                    Abstand zur Bilddiagonale (0.0 = Studium-Zentrum, &gt;0.2 = starkes peripheres Punctum)
                  </div>
                </div>

                {/* Individual Punctum Marks Table */}
                <div className="border border-stone-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-stone-900 text-stone-400 border-b border-stone-800 font-semibold leading-none">
                      <tr>
                        <th className="p-3">Bild</th>
                        <th className="p-3">Akteur</th>
                        <th className="p-3">Gerät</th>
                        <th className="p-3">Modalität</th>
                        <th className="p-3">Zoom</th>
                        <th className="p-3">p_subj (x, y)</th>
                        <th className="p-3 text-right">Δp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60 bg-[#111317] font-normal leading-normal">
                      {filteredDeltaP.map((dp) => (
                        <tr key={dp.mark_event_id} className="hover:bg-stone-800/40">
                          <td className="p-3 text-stone-300 font-semibold truncate max-w-[140px]">
                            {images.find((i) => i.image_id === dp.image_id)?.title || dp.image_id.substring(0, 8)}
                          </td>
                          <td className="p-3 capitalize">{dp.actor_id}</td>
                          <td className="p-3">{dp.device}</td>
                          <td className="p-3">{dp.input_modality}</td>
                          <td className="p-3">{dp.zoom_level}×</td>
                          <td className="p-3 font-mono">({dp.p_subj.x}, {dp.p_subj.y})</td>
                          <td className="p-3 text-right font-mono text-amber-400">
                            {dp.delta_p.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'regie' && (
            /* TV Regie Player (§3.1) */
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto p-6 bg-[#13161c] border border-stone-800 rounded-2xl space-y-6">
                <div className="flex items-center gap-3">
                  <Tv className="w-7 h-7 text-amber-500" />
                  <div>
                    <h3 className="text-lg font-serif font-bold text-stone-100 leading-snug">
                      LG 4K-OLED Galerie Regie
                    </h3>
                    <p className="text-xs font-sans font-normal text-stone-400 mt-1 leading-normal">
                      Aktiver Lease-Holder: <span className="text-amber-400 font-semibold">{gallerySession.lease_holder}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-stone-900 rounded-xl space-y-2 border border-stone-800">
                  <div className="text-xs font-sans font-normal text-stone-400 leading-none">
                    Aktives Ausgabebild:
                  </div>
                  <div className="text-sm font-serif font-normal text-stone-100 leading-snug">
                    {images.find((i) => i.image_id === gallerySession.active_image_id)?.title}
                  </div>
                  <div className="text-xs font-mono font-normal text-stone-500 leading-none">
                    Modus: {gallerySession.mode === 'flight' ? 'Δp-Fahrt aktiv' : 'Statisches Bild'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 leading-none">
                  <button
                    onClick={() => {
                      appendEvent({
                        event_type: 'gallery.command',
                        actor_kind: 'human',
                        actor_id: 'arne',
                        device: 'mac',
                        input_modality: 'mouse',
                        client_ts: new Date().toISOString(),
                        payload: { cmd: 'take_lease' },
                      });
                    }}
                    className="py-3 bg-stone-800 border border-stone-700 text-stone-200 rounded-xl font-sans text-xs font-semibold hover:bg-stone-700 transition-colors leading-none"
                  >
                    Leitstand-Lease übernehmen
                  </button>

                  <button
                    onClick={() => {
                      appendEvent({
                        event_type: 'gallery.command',
                        actor_kind: 'human',
                        actor_id: 'arne',
                        device: 'mac',
                        input_modality: 'mouse',
                        client_ts: new Date().toISOString(),
                        payload: { cmd: 'start_flight' },
                      });
                    }}
                    className="py-3 bg-amber-600 text-white rounded-xl font-sans text-xs font-semibold hover:bg-amber-500 transition-colors leading-none"
                  >
                    Δp-Fahrt auf TV starten
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
