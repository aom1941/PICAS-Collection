/**
 * iPhone — „Sichten, nicht bearbeiten" · Konvolut Teil 1
 * Primary verb: triagieren (< 100 ms)
 *
 * Implements genuine mobile ergonomics:
 * - Full-bleed photograph center stage
 * - Daumenzone with ultra-fast binary/ternary triage (Pick, Reject, Skip)
 * - Touch swipe gestures (Left: Reject, Right: Pick, Up: Skip)
 * - Kalibrierungsmodus (Assistive-Access-Stil für den Vater mit maximalen Schaltflächen)
 * - Spontane Punctum-Notiz (Diktat / Kurztext)
 * - Nicht-destruktives Undo (Kompensations-Event)
 * - Strict 2-weight typography discipline (Sans: 400/600, Serif: 400, Mono: 400)
 */

import React, { useState, useCallback, useRef } from 'react';
import { PicasImage, PicasEvent, ActorId } from '../../types/picas';
import { PhotographicCanvas } from '../PhotographicCanvas';
import { TriageBadge } from '../TriageBadge';
import { RotateCcw, Mic, Tv, ChevronLeft, ChevronRight, Eye, ArrowRight, CornerDownLeft, Smartphone } from 'lucide-react';
import { ToggleSwitch, getStatusIcon } from '../../utils/statusIcons';

interface IPhoneViewProps {
  images: PicasImage[];
  projections: ReturnType<typeof import('../../utils/math').computeProjections>;
  events: PicasEvent[];
  appendEvent: (event: any) => PicasEvent;
  undoEvent: (ref_id: string, actor: ActorId, dev: any, mod: any) => void;
  showFormSymbols?: boolean;
}

export const IPhoneView: React.FC<IPhoneViewProps> = ({
  images,
  projections,
  events,
  appendEvent,
  undoEvent,
  showFormSymbols = true,
}) => {
  const PickIcon = getStatusIcon('pick');
  const RejectIcon = getStatusIcon('reject');
  const SkipIcon = getStatusIcon('skip');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFatherMode, setIsFatherMode] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [activeTab, setActiveTab] = useState<'triage' | 'remote'>('triage');
  const [swipeFeedback, setSwipeFeedback] = useState<'pick' | 'reject' | 'skip' | null>(null);

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const currentActor: ActorId = isFatherMode ? 'vater' : 'arne';
  const currentImage = images[currentIndex % images.length];

  // Current triage state for this actor
  const currentTriageState = projections.triageStates.get(`${currentImage.image_id}:${currentActor}`);

  // Existing punctum notes for this image
  const existingNotes = events.filter(
    (e) => e.event_type === 'note.punctum' && e.image_id === currentImage.image_id
  );

  // Find last triage event for non-destructive undo
  const lastTriageEvent = [...events]
    .reverse()
    .find(
      (e) =>
        e.actor_id === currentActor &&
        ['triage.pick', 'triage.reject', 'triage.skip'].includes(e.event_type) &&
        !events.some((u) => u.event_type === 'meta.undo' && u.ref_event_id === e.event_id)
    );

  const handleTriage = useCallback(
    (action: 'pick' | 'reject' | 'skip') => {
      const startTime = performance.now();
      setSwipeFeedback(action);
      setTimeout(() => setSwipeFeedback(null), 250);

      appendEvent({
        event_type: `triage.${action}`,
        actor_kind: 'human',
        actor_id: currentActor,
        device: 'iphone',
        input_modality: 'finger',
        zoom_level: 0.72,
        image_id: currentImage.image_id,
        client_ts: new Date().toISOString(),
        payload: { latency_ms: Math.round(performance.now() - startTime) },
      });

      // Advance queue immediately (< 100ms)
      setCurrentIndex((prev) => (prev + 1) % images.length);
    },
    [appendEvent, currentActor, currentImage.image_id, images.length]
  );

  const handleUndo = useCallback(() => {
    if (!lastTriageEvent) return;
    undoEvent(lastTriageEvent.event_id, currentActor, 'iphone', 'finger');
    const prevIdx = images.findIndex((i) => i.image_id === lastTriageEvent.image_id);
    if (prevIdx !== -1) {
      setCurrentIndex(prevIdx);
    }
  }, [lastTriageEvent, undoEvent, currentActor, images]);

  const handleSavePunctumNote = () => {
    if (!dictationText.trim()) return;
    appendEvent({
      event_type: 'note.punctum',
      actor_kind: 'human',
      actor_id: currentActor,
      device: 'iphone',
      input_modality: 'voice',
      zoom_level: 0.72,
      image_id: currentImage.image_id,
      client_ts: new Date().toISOString(),
      payload: {
        text: dictationText.trim(),
        source: 'dictation',
        locale: 'de-DE',
      },
    });
    setDictationText('');
    setIsDictating(false);
  };

  const sendGalleryCommand = (cmd: string, args: Record<string, any> = {}) => {
    appendEvent({
      event_type: 'gallery.command',
      actor_kind: 'human',
      actor_id: currentActor,
      device: 'iphone',
      input_modality: 'finger',
      client_ts: new Date().toISOString(),
      payload: { cmd, ...args },
    });
  };

  // Touch gesture listeners for mobile swipe triage
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        // Swipe Right -> Pick
        handleTriage('pick');
      } else {
        // Swipe Left -> Reject
        handleTriage('reject');
      }
    } else if (diffY < -60 && Math.abs(diffY) > Math.abs(diffX)) {
      // Swipe Up -> Skip
      handleTriage('skip');
    }
  };

  return (
    <div className="flex justify-center items-center p-3 sm:p-6 lg:p-8 bg-[#090b0e] min-h-[calc(100vh-56px)] select-none">
      {/* CSS Selector 1: Authentic, serene iPhone Chassis */}
      <div className="w-full max-w-[380px] h-[780px] max-h-[calc(100vh-80px)] bg-[#0c0e12] rounded-[48px] p-5 flex flex-col justify-between border border-stone-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden ring-1 ring-white/5">
        
        {/* Dynamic Island / iPhone Speaker Notch */}
        <div className="w-28 h-5 bg-black rounded-full mx-auto mb-2 flex items-center justify-between px-3 shrink-0 border border-white/5 shadow-inner">
          <div className="w-2 h-2 rounded-full bg-stone-900 border border-stone-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#16181f] flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-blue-900/60" />
          </div>
        </div>

        {/* Top Status & Role Bar: Calm, quiet typography */}
        <div className="flex items-center justify-between pb-2.5 border-b border-stone-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs font-normal text-stone-300 leading-none">
              {isFatherMode ? 'Kalibrierungsmodus' : 'Sichten'}
            </span>
            <span className="text-stone-600 font-normal leading-none">·</span>
            <span className="font-mono text-xs font-normal text-stone-500 leading-none">
              {String(currentIndex + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(images.length).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Father Mode Toggle Switch */}
            <ToggleSwitch
              checked={isFatherMode}
              onChange={setIsFatherMode}
              label={isFatherMode ? 'Vater' : 'Arne'}
              size="sm"
              activeColor="bg-stone-300"
              ariaLabel="Kalibrierungsmodus umschalten (Arne / Vater)"
            />

            {/* Remote vs Triage Tab Toggle with Icons */}
            <div className="flex items-center bg-stone-900 rounded-full p-0.5 border border-stone-800">
              <button
                onClick={() => setActiveTab('triage')}
                className={`p-1.5 rounded-full transition-colors leading-none ${
                  activeTab === 'triage'
                    ? 'bg-stone-800 text-stone-100'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
                title="Bild-Triage (Sichten)"
                aria-label="Bild-Triage (Sichten)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTab('remote')}
                className={`p-1.5 rounded-full transition-colors leading-none ${
                  activeTab === 'remote'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
                title="Galerie-Fernbedienung"
                aria-label="Galerie-Fernbedienung"
              >
                <Tv className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'triage' ? (
          <div className="flex-1 flex flex-col justify-between py-2 overflow-hidden">
            
            {/* Photographic Stage: Immersive, pure focus */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative flex-1 rounded-2xl overflow-hidden bg-black border border-stone-900 flex items-center justify-center my-1 group"
            >
              <PhotographicCanvas
                image={currentImage}
                showSystemCenter={false}
                showPunctumMarks={true}
                showDeltaPVector={false}
                punctumMarks={projections.punctumMarks}
                className="w-full h-full object-contain"
                zoomLevel={0.72}
              />

              {/* Status Badge (SPEC §7 Color & Geometric Shape) */}
              {currentTriageState && (
                <div className="absolute top-3 right-3 z-10">
                  <TriageBadge
                    state={currentTriageState.state}
                    size="sm"
                    showLabel={true}
                    showIcon={showFormSymbols}
                  />
                </div>
              )}

              {/* Swipe Feedback Overlay with distinct geometric shapes (SPEC §7) */}
              {swipeFeedback && (
                <div
                  className={`absolute inset-0 flex items-center justify-center backdrop-blur-xs transition-opacity duration-200 pointer-events-none ${
                    swipeFeedback === 'pick'
                      ? 'bg-[#3d5a80]/30 text-white'
                      : swipeFeedback === 'reject'
                      ? 'bg-[#c23010]/30 text-white'
                      : 'bg-stone-800/40 text-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/85 border border-white/20 shadow-2xl">
                    {showFormSymbols && (
                      <>
                        {swipeFeedback === 'pick' && <PickIcon className="w-7 h-7 text-[#89b3e6] stroke-[3]" />}
                        {swipeFeedback === 'reject' && <RejectIcon className="w-7 h-7 text-[#f27457] stroke-[3]" />}
                        {swipeFeedback === 'skip' && <SkipIcon className="w-7 h-7 text-stone-300 stroke-[3]" />}
                      </>
                    )}
                    <span className="font-sans font-semibold text-xl uppercase tracking-wider leading-none">
                      {swipeFeedback === 'pick' ? 'Pick' : swipeFeedback === 'reject' ? 'Reject' : 'Skip'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Typography Hierarchy: Title (Serif 400) & Metadata (Mono 400) */}
            <div className="pt-2 pb-1 text-left shrink-0">
              <h2 className="font-serif text-sm font-normal text-stone-100 leading-snug truncate">
                {currentImage.title}
              </h2>
              <p className="font-mono text-[11px] font-normal text-stone-500 leading-normal mt-0.5 truncate">
                <span>{currentImage.capture_meta.camera}</span>
                <span className="mx-1.5 opacity-40">·</span>
                <span>{currentImage.capture_meta.lens}</span>
                <span className="mx-1.5 opacity-40">·</span>
                <span>{currentImage.capture_meta.shutter}</span>
              </p>

              {/* Existing Punctum Note Display (if recorded) */}
              {existingNotes.length > 0 && (
                <p className="font-serif text-xs font-normal italic text-stone-400 leading-snug mt-1.5 line-clamp-1 border-l border-amber-600/50 pl-2">
                  „{(existingNotes[existingNotes.length - 1].payload as any)?.text}“
                </p>
              )}
            </div>

            {/* Bottom Ergonomic Zone: Different for Father Mode vs Standard Mode */}
            <div className="pt-1 space-y-2 shrink-0">
              {isFatherMode ? (
                /* Father Mode (Kalibrierungsmodus): Giant, unmistakable touch targets with geometric shapes */
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Giant Reject Button (Oxidrot + Cross ✕) */}
                    <button
                      onClick={() => handleTriage('reject')}
                      className="py-5 px-4 rounded-2xl bg-[#c23010]/25 hover:bg-[#c23010]/35 border-2 border-[#c23010] text-stone-100 font-sans font-semibold text-base leading-none flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                      aria-label="Aussortieren (Reject)"
                    >
                      {showFormSymbols && <RejectIcon className="w-6 h-6 text-[#f27457] stroke-[3]" />}
                      <span>Aussortieren</span>
                    </button>

                    {/* Giant Pick Button (Indigoblau + Checkmark ✓) */}
                    <button
                      onClick={() => handleTriage('pick')}
                      className="py-5 px-4 rounded-2xl bg-[#3d5a80]/30 hover:bg-[#3d5a80]/40 border-2 border-[#3d5a80] text-stone-100 font-sans font-semibold text-base leading-none flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                      aria-label="Behalten (Pick)"
                    >
                      {showFormSymbols && <PickIcon className="w-6 h-6 text-[#89b3e6] stroke-[3]" />}
                      <span>Behalten</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleTriage('skip')}
                      className="py-2.5 px-4 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 font-sans font-normal text-xs leading-none hover:text-stone-200 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      {showFormSymbols && <SkipIcon className="w-3.5 h-3.5 text-stone-400" />}
                      <span>Überspringen</span>
                    </button>

                    <button
                      onClick={handleUndo}
                      disabled={!lastTriageEvent}
                      className={`py-2.5 px-4 rounded-xl bg-stone-900 border border-stone-800 font-sans text-xs leading-none flex items-center gap-1.5 transition-all ${
                        lastTriageEvent
                          ? 'text-stone-300 hover:text-stone-100 active:scale-95'
                          : 'text-stone-600 border-stone-800/40 cursor-not-allowed'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 opacity-70" />
                      <span>Letzten Schritt zurück</span>
                    </button>
                  </div>

                  {/* SPEC §7 Color Labels & Geometric Shape Indicators */}
                  <div className="flex items-center justify-center gap-3 pt-0.5 text-[11px] font-sans select-none">
                    <span className="inline-flex items-center gap-1.5 text-[#89b3e6] font-medium">
                      {showFormSymbols && <PickIcon className="w-3 h-3 stroke-[2.5]" />}
                      <span>Indigoblau (Behalten)</span>
                    </span>
                    <span className="text-stone-700">·</span>
                    <span className="inline-flex items-center gap-1.5 text-[#f27457] font-medium">
                      {showFormSymbols && <RejectIcon className="w-3 h-3 stroke-[2.5]" />}
                      <span>Oxidrot (Aussortieren)</span>
                    </span>
                  </div>
                </div>
              ) : (
                /* Standard Arne Mode: Ergonomic thumb buttons with geometric shapes */
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Reject (Oxidrot #c23010 + Cross ✕) */}
                    <button
                      onClick={() => handleTriage('reject')}
                      className="flex-1 py-3.5 rounded-2xl bg-[#1b1214] border border-[#c23010]/50 hover:border-[#c23010] text-[#f27457] font-sans font-semibold text-xs leading-none flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                      aria-label="Reject photo"
                    >
                      {showFormSymbols && <RejectIcon className="w-4 h-4 text-[#c23010] stroke-[2.5]" />}
                      <span>Reject</span>
                    </button>

                    {/* Skip (Neutral + Minus −) */}
                    <button
                      onClick={() => handleTriage('skip')}
                      className="py-3.5 px-4 rounded-2xl bg-[#14161c] border border-stone-800 hover:border-stone-700 text-stone-400 font-sans font-normal text-xs leading-none active:scale-95 transition-all flex items-center justify-center gap-1"
                      aria-label="Skip photo"
                    >
                      {showFormSymbols && <SkipIcon className="w-3.5 h-3.5 text-stone-500 stroke-[2.5]" />}
                      <span>Skip</span>
                    </button>

                    {/* Pick (Indigoblau #3d5a80 + Checkmark ✓) */}
                    <button
                      onClick={() => handleTriage('pick')}
                      className="flex-1 py-3.5 rounded-2xl bg-[#101724] border border-[#3d5a80]/60 hover:border-[#3d5a80] text-[#89b3e6] font-sans font-semibold text-xs leading-none flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
                      aria-label="Pick photo"
                    >
                      {showFormSymbols && <PickIcon className="w-4 h-4 text-[#5277a7] stroke-[2.5]" />}
                      <span>Pick</span>
                    </button>
                  </div>

                  {/* Secondary Utility Row: Non-destructive Undo & Punctum Voice Note */}
                  <div className="flex items-center justify-between pt-1 px-1">
                    <button
                      onClick={handleUndo}
                      disabled={!lastTriageEvent}
                      className={`flex items-center gap-1.5 font-sans text-xs font-normal leading-none transition-colors ${
                        lastTriageEvent
                          ? 'text-stone-400 hover:text-stone-200'
                          : 'text-stone-700 cursor-not-allowed'
                      }`}
                      aria-label="Undo last triage"
                    >
                      <RotateCcw className="w-3.5 h-3.5 opacity-70" />
                      <span>Zurücknehmen</span>
                    </button>

                    <button
                      onClick={() => setIsDictating(!isDictating)}
                      className="flex items-center gap-1.5 font-sans text-xs font-normal text-stone-400 hover:text-stone-200 leading-none transition-colors"
                      aria-label="Spontane Punctum-Notiz"
                    >
                      <Mic className="w-3.5 h-3.5 opacity-70" />
                      <span>Punctum-Diktat</span>
                    </button>
                  </div>

                  {/* SPEC §7 Color Labels & Geometric Shape Indicators */}
                  <div className="flex items-center justify-center gap-3 pt-0.5 text-[11px] font-sans select-none">
                    <span className="inline-flex items-center gap-1.5 text-[#89b3e6] font-medium">
                      {showFormSymbols && <PickIcon className="w-3 h-3 stroke-[2.5]" />}
                      <span>Indigoblau (Pick)</span>
                    </span>
                    <span className="text-stone-700">·</span>
                    <span className="inline-flex items-center gap-1.5 text-[#f27457] font-medium">
                      {showFormSymbols && <RejectIcon className="w-3 h-3 stroke-[2.5]" />}
                      <span>Oxidrot (Reject)</span>
                    </span>
                  </div>

                  {/* Punctum Dictation Popover */}
                  {isDictating && (
                    <div className="bg-[#13161c] border border-stone-700/80 rounded-2xl p-3 text-xs shadow-xl animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-sans font-normal text-stone-300 text-xs leading-none">
                          Spontanes Punctum festhalten:
                        </span>
                        <button
                          onClick={() => setDictationText('Das Licht an der Bruchkante berührt mich wie eine Erinnerung.')}
                          className="font-sans text-[11px] font-normal text-stone-500 hover:text-stone-300 leading-none"
                        >
                          Beispieltext
                        </button>
                      </div>
                      <input
                        type="text"
                        value={dictationText}
                        onChange={(e) => setDictationText(e.target.value)}
                        placeholder="Was trifft Sie an diesem Bild? (Diktat / Text)"
                        className="w-full bg-[#0a0c10] text-stone-200 font-sans font-normal text-xs px-3 py-2 rounded-xl border border-stone-800 focus:outline-none focus:border-stone-600 leading-normal"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2.5">
                        <button
                          onClick={() => setIsDictating(false)}
                          className="px-3 py-1.5 rounded-lg text-stone-400 hover:text-stone-200 font-sans font-normal text-xs leading-none"
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={handleSavePunctumNote}
                          className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 font-sans font-semibold text-xs leading-none transition-colors"
                        >
                          Speichern
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TV Gallery Remote Control Panel (§3.1) */
          <div className="flex-1 flex flex-col justify-center space-y-4 px-2 py-4">
            <div className="text-center p-6 bg-[#13161c] rounded-2xl border border-stone-800/80">
              <Tv className="w-7 h-7 text-stone-400 mx-auto mb-2.5" />
              <h3 className="font-serif text-sm font-normal text-stone-200 leading-snug">
                TV-Galerie Steuerung
              </h3>
              <p className="font-mono text-xs font-normal text-stone-500 leading-normal mt-1">
                Lease verwalten &amp; Serien wechseln
              </p>
            </div>

            <button
              onClick={() => sendGalleryCommand('take_lease')}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-sans text-xs font-semibold leading-none transition-colors border border-stone-700/80 shadow-xs"
            >
              Regie-Lease übernehmen
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => sendGalleryCommand('prev_image')}
                className="py-3 bg-stone-900 border border-stone-800 text-stone-300 rounded-xl font-sans text-xs font-normal leading-none hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Vorheriges</span>
              </button>
              <button
                onClick={() => sendGalleryCommand('next_image')}
                className="py-3 bg-stone-900 border border-stone-800 text-stone-300 rounded-xl font-sans text-xs font-normal leading-none hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Nächstes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => sendGalleryCommand('start_flight')}
              className="w-full py-3 bg-stone-900 border border-stone-800 text-stone-200 rounded-xl font-sans text-xs font-normal leading-none hover:bg-stone-800 flex items-center justify-center gap-2 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 opacity-70" />
              <span>Δp-Fahrt auslösen</span>
            </button>

            <div className="pt-2 text-center">
              <button
                onClick={() => setActiveTab('triage')}
                className="font-sans text-xs font-normal text-stone-500 hover:text-stone-300 leading-none underline underline-offset-4"
              >
                Zurück zur Bild-Triage
              </button>
            </div>
          </div>
        )}

        {/* iPhone Home Indicator Bar */}
        <div className="w-32 h-1 bg-stone-700/60 rounded-full mx-auto mt-2 shrink-0" />
      </div>
    </div>
  );
};
