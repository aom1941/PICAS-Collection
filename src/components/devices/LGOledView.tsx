/**
 * LG 4K-OLED — „Nichts tun außer zeigen" · Galerie
 * Primary verb: zeigen
 * Deep OLED #000000, 10-foot typography (Playfair Display + Space Mono),
 * OLED burn-in pixel drift, and conceptual Δp-Fahrt from p_sys to p_subj.
 *
 * Strict 2-weight typography hierarchy:
 * - Sans: 400 (normal) / 600 (semibold)
 * - Serif: 400 (normal) / 700 (bold)
 * - Mono: 400 (normal)
 *
 * SPEC §7 Accessibility:
 * Triage states (Pick / Reject) are prominently supplemented with distinct geometric
 * shapes (Checkmark ✓ vs Cross ✕) so that color-blind viewers have immediate clarity.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PicasImage, PicasEvent } from '../../types/picas';
import { PhotographicCanvas } from '../PhotographicCanvas';
import { TriageBadge } from '../TriageBadge';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Compass,
  Check,
  X,
  Minus,
  Sparkles,
} from 'lucide-react';
import { ToggleSwitch } from '../../utils/statusIcons';

interface LGOledViewProps {
  images: PicasImage[];
  projections: ReturnType<typeof import('../../utils/math').computeProjections>;
  events: PicasEvent[];
  gallerySession: ReturnType<typeof import('../../store/eventStore').usePicasStore>['gallerySession'];
  setGallerySession: (session: any) => void;
  appendEvent: (event: any) => PicasEvent;
}

export const LGOledView: React.FC<LGOledViewProps> = ({
  images,
  projections,
  events,
  gallerySession,
  setGallerySession,
  appendEvent,
}) => {
  const [pixelDrift, setPixelDrift] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFlightPlaying, setIsFlightPlaying] = useState<boolean>(false);
  const [flightT, setFlightT] = useState<number>(0);
  const [onlyPicksMode, setOnlyPicksMode] = useState<boolean>(false);

  // Filtered images based on exhibition mode
  const displayedImages = useMemo(() => {
    if (!onlyPicksMode) return images;
    const picks = images.filter((img) => {
      const state = projections.triageStates.get(`${img.image_id}:arne`);
      return state?.state === 'triage.pick';
    });
    return picks.length > 0 ? picks : images;
  }, [images, onlyPicksMode, projections.triageStates]);

  const currentImage =
    displayedImages.find((i) => i.image_id === gallerySession.active_image_id) || displayedImages[0] || images[0];

  const currentTriage = projections.triageStates.get(`${currentImage.image_id}:arne`);

  // Count picks for exhibition header
  const pickCount = useMemo(() => {
    return images.filter((img) => {
      const state = projections.triageStates.get(`${img.image_id}:arne`);
      return state?.state === 'triage.pick';
    }).length;
  }, [images, projections.triageStates]);

  // OLED Burn-In Protection: Slowly shifts pixel drift every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      setPixelDrift({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync with remote gallery events from other devices
  useEffect(() => {
    const lastCmd = [...events]
      .reverse()
      .find((e) => e.event_type === 'gallery.command');
    if (!lastCmd) return;

    const payload = lastCmd.payload as any;
    if (payload.cmd === 'next_image') {
      const idx = displayedImages.findIndex((i) => i.image_id === gallerySession.active_image_id);
      const nextIdx = (idx + 1) % displayedImages.length;
      setGallerySession({
        ...gallerySession,
        active_image_id: displayedImages[nextIdx].image_id,
      });
    } else if (payload.cmd === 'prev_image') {
      const idx = displayedImages.findIndex((i) => i.image_id === gallerySession.active_image_id);
      const prevIdx = (idx - 1 + displayedImages.length) % displayedImages.length;
      setGallerySession({
        ...gallerySession,
        active_image_id: displayedImages[prevIdx].image_id,
      });
    } else if (payload.cmd === 'start_flight') {
      setIsFlightPlaying(true);
      setFlightT(0);
    } else if (payload.cmd === 'take_lease') {
      setGallerySession({
        ...gallerySession,
        lease_holder: lastCmd.device,
        lease_actor: lastCmd.actor_id,
      });
    }
  }, [events, displayedImages, gallerySession, setGallerySession]);

  // Animated Δp Camera Glide (Glide from p_sys to p_subj)
  useEffect(() => {
    if (!isFlightPlaying) return;

    let animFrame: number;
    const duration = 8000;
    const start = performance.now();

    const frame = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // Smooth smoothstep easing
      const eased = progress * progress * (3 - 2 * progress);
      setFlightT(eased);

      if (progress < 1) {
        animFrame = requestAnimationFrame(frame);
      } else {
        // Pause at destination then finish
        setTimeout(() => setIsFlightPlaying(false), 2000);
      }
    };

    animFrame = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animFrame);
  }, [isFlightPlaying]);

  // Compute camera position between p_sys and p_subj
  const pSys = currentImage.system_center;
  const pSubj = projections.punctumMarks.find((m) => m.image_id === currentImage.image_id) || {
    x_px: currentImage.width_px * 0.75,
    y_px: currentImage.height_px * 0.45,
  };

  const currentCameraX = pSys.x + (pSubj.x_px - pSys.x) * flightT;
  const currentCameraY = pSys.y + (pSubj.y_px - pSys.y) * flightT;
  const zoomFactor = isFlightPlaying ? 1 + flightT * 0.6 : 1;

  const handleSelectImage = (imgId: string) => {
    setGallerySession({
      ...gallerySession,
      active_image_id: imgId,
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-52px)] bg-[#000000] text-stone-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* 10-Foot Header: Subdued exhibition typography with pixel drift & SPEC §7 Curation Badge */}
      <header
        className="z-10 p-8 flex items-center justify-between leading-none"
        style={{
          transform: `translate(${pixelDrift.x}px, ${pixelDrift.y}px)`,
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-normal tracking-widest uppercase text-stone-500 leading-none">
              {currentImage.series}
            </span>
            <span className="text-stone-700">·</span>
            {/* Gallery Curation Triage Badge with geometric shape (SPEC §7) */}
            <TriageBadge
              state={currentTriage?.state}
              size="sm"
              showLabel={true}
              label={
                currentTriage?.state === 'triage.pick'
                  ? 'Exhibition Pick'
                  : currentTriage?.state === 'triage.reject'
                  ? 'Reject'
                  : 'Unbewertet'
              }
            />
          </div>
          <h1 className="text-3xl lg:text-4xl font-serif font-normal text-stone-100 tracking-tight mt-2 leading-snug">
            {currentImage.title}
          </h1>
        </div>

        {/* Controller Lease Indicator (§3.1) & Exhibition Filter */}
        <div className="flex items-center gap-3 bg-stone-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-stone-800">
          {/* Exhibition Filter: Toggle on/off switch for Only Picks vs All */}
          <ToggleSwitch
            checked={onlyPicksMode}
            onChange={setOnlyPicksMode}
            label={`Nur Picks (${pickCount})`}
            size="sm"
            icon={Check}
            activeColor="bg-[#3d5a80]"
            ariaLabel="Kuratierte Auswahl: Nur Picks mit Checkmark ✓ anzeigen"
          />

          <div className="h-4 w-px bg-stone-800" />

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#b87514]" />
            <span className="text-xs font-sans font-normal text-stone-400 leading-none">
              Lease: <span className="text-stone-200 font-semibold">{gallerySession.lease_holder.toUpperCase()}</span>
            </span>
          </div>

          <div className="text-xs font-mono font-normal text-stone-600 leading-none">
            webOS 4K-OLED
          </div>
        </div>
      </header>

      {/* Main Photographic Frame with Camera Glide (Δp-Fahrt) */}
      <main className="relative flex-1 flex items-center justify-center p-4 lg:p-12 overflow-hidden">
        <div
          className="relative max-w-6xl w-full max-h-full aspect-[4/3] rounded-lg overflow-hidden shadow-2xl transition-transform duration-300"
          style={{
            transform: isFlightPlaying
              ? `scale(${zoomFactor}) translate(${((currentImage.width_px / 2 - currentCameraX) / currentImage.width_px) * 30}% , ${((currentImage.height_px / 2 - currentCameraY) / currentImage.height_px) * 30}%)`
              : 'none',
          }}
        >
          <PhotographicCanvas
            image={currentImage}
            showSystemCenter={isFlightPlaying}
            showPunctumMarks={isFlightPlaying}
            showDeltaPVector={isFlightPlaying}
            punctumMarks={projections.punctumMarks}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Flight HUD Overlay */}
        {isFlightPlaying && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-stone-950/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-amber-500/40 text-center font-sans shadow-2xl">
            <div className="text-xs text-amber-400 font-semibold flex items-center justify-center gap-2 leading-none">
              <Compass className="w-4 h-4 animate-spin text-amber-500" />
              <span>Δp-Fahrt aktiv: Studium (p_sys) ➔ Punctum (p_subj)</span>
            </div>
            <div className="text-[11px] font-mono font-normal text-stone-400 mt-1.5 leading-none">
              Position: ({Math.round(currentCameraX)}, {Math.round(currentCameraY)}) · Fortschritt: {(flightT * 100).toFixed(0)}%
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <TriageBadge state={currentTriage?.state} size="xs" showLabel={true} />
            </div>
          </div>
        )}
      </main>

      {/* 10-Foot Caption Bar, Exhibition Series Navigation & Discreet Controls */}
      <footer
        className="z-10 p-6 lg:p-8 flex items-center justify-between border-t border-stone-900/60 bg-black/60 backdrop-blur-xs leading-none"
        style={{
          transform: `translate(${pixelDrift.x}px, ${pixelDrift.y}px)`,
        }}
      >
        <div className="text-xs font-mono font-normal text-stone-500 max-w-md leading-normal">
          {currentImage.capture_meta.camera} · {currentImage.capture_meta.lens} · {currentImage.capture_meta.film_stock}
          <div className="text-stone-400 font-serif italic mt-1 leading-snug">
            {currentImage.capture_meta.location}
          </div>
        </div>

        {/* Center: Exhibition Series Filmstrip Navigation with Geometric Accessibility Shapes */}
        <div className="hidden md:flex items-center gap-2 bg-stone-950/80 px-4 py-2 rounded-2xl border border-stone-800/80">
          <span className="text-[11px] font-mono font-normal text-stone-500 uppercase tracking-wider mr-1">
            Serie:
          </span>
          {displayedImages.map((img, idx) => {
            const isSelected = img.image_id === currentImage.image_id;
            const state = projections.triageStates.get(`${img.image_id}:arne`);
            const isPick = state?.state === 'triage.pick';
            const isReject = state?.state === 'triage.reject';

            return (
              <button
                key={img.image_id}
                onClick={() => handleSelectImage(img.image_id)}
                className={`relative px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-sans text-xs transition-all leading-none border ${
                  isSelected
                    ? 'border-stone-400 bg-stone-800 text-stone-100 font-semibold shadow-xs'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900 font-normal'
                }`}
                title={`${img.title} (${isPick ? 'Pick ✓' : isReject ? 'Reject ✕' : 'Offen −'})`}
              >
                <span>{idx + 1}</span>
                {isPick && (
                  <span className="w-4 h-4 rounded flex items-center justify-center bg-[#3d5a80] text-white">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                {isReject && (
                  <span className="w-4 h-4 rounded flex items-center justify-center bg-[#c23010] text-white">
                    <X className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                {!isPick && !isReject && (
                  <span className="w-4 h-4 rounded flex items-center justify-center bg-stone-800 text-stone-500">
                    <Minus className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quiet controls for manual exhibition review */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              appendEvent({
                event_type: 'gallery.command',
                actor_kind: 'human',
                actor_id: 'arne',
                device: 'tv',
                input_modality: 'mouse',
                client_ts: new Date().toISOString(),
                payload: { cmd: 'prev_image' },
              });
            }}
            className="p-3 rounded-full bg-stone-900/80 text-stone-400 hover:text-white transition-colors"
            aria-label="Previous exhibition image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              if (isFlightPlaying) {
                setIsFlightPlaying(false);
              } else {
                setIsFlightPlaying(true);
                setFlightT(0);
              }
            }}
            className="px-5 py-2.5 rounded-full bg-[#b87514] text-white font-sans text-xs font-semibold hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-lg leading-none"
          >
            {isFlightPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isFlightPlaying ? 'Fahrt anhalten' : 'Δp-Fahrt starten'}</span>
          </button>

          <button
            onClick={() => {
              appendEvent({
                event_type: 'gallery.command',
                actor_kind: 'human',
                actor_id: 'arne',
                device: 'tv',
                input_modality: 'mouse',
                client_ts: new Date().toISOString(),
                payload: { cmd: 'next_image' },
              });
            }}
            className="p-3 rounded-full bg-stone-900/80 text-stone-400 hover:text-white transition-colors"
            aria-label="Next exhibition image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
