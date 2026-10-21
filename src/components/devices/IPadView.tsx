/**
 * iPad Pro M2 + Apple Pencil — „Denken mit der Hand" · Kurator / Leuchtpult
 * Primary verb: kuratieren
 * Spatial Canvas on "Patent-Papier" (#FAF7F2), Series, Diptychs,
 * Rand-Vektoren & Nähte (Seams), Pencil vs Finger input, Fibonacci-Dip-Linie.
 *
 * Strict 2-weight typography discipline:
 * - Sans: 400 (normal) / 600 (semibold)
 * - Serif: 400 (normal) / 700 (bold)
 * - Mono: 400 (normal)
 */

import React, { useState, useCallback } from 'react';
import { PicasImage, PicasEvent } from '../../types/picas';
import { PhotographicCanvas } from '../PhotographicCanvas';
import { TriageBadge } from '../TriageBadge';
import { calculate_seam_score } from '../../utils/math';
import {
  PenTool,
  Hand,
  Sparkles,
  Compass,
  Check,
  X,
} from 'lucide-react';
import { ToggleSwitch } from '../../utils/statusIcons';

interface IPadViewProps {
  images: PicasImage[];
  projections: ReturnType<typeof import('../../utils/math').computeProjections>;
  events: PicasEvent[];
  appendEvent: (event: any) => PicasEvent;
  undoEvent: (ref_id: string, actor: any, dev: any, mod: any) => void;
}

interface CanvasImageItem {
  image: PicasImage;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  seriesId?: string;
}

export const IPadView: React.FC<IPadViewProps> = ({
  images,
  projections,
  events,
  appendEvent,
}) => {
  const [inputMode, setInputMode] = useState<'finger' | 'pencil'>('pencil');
  const [showFibonacci, setShowFibonacci] = useState(false);
  const [showVectors, setShowVectors] = useState(true);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Placed images on the Leuchtpult spatial canvas
  const [placedItems, setPlacedItems] = useState<CanvasImageItem[]>([
    {
      image: images[0], // Brutalist Arch
      x: 120,
      y: 140,
      scale: 0.9,
      rotation: 0,
      seriesId: 'series_diptych_01',
    },
    {
      image: images[3], // Spiral Staircase (matching right-left seam with Arch!)
      x: 620,
      y: 140,
      scale: 0.9,
      rotation: 0,
      seriesId: 'series_diptych_01',
    },
    {
      image: images[2], // Hand of the Father
      x: 1120,
      y: 120,
      scale: 0.75,
      rotation: 0,
    },
  ]);

  const [activeItemId, setActiveItemId] = useState<string>(images[0].image_id);
  const [isDiptychSnapped, setIsDiptychSnapped] = useState(true);

  // Calculate seam between placed items 0 and 1
  const seamCheck = useCallback(() => {
    const itemA = placedItems[0];
    const itemB = placedItems[1];
    if (!itemA || !itemB) return null;

    const vecA = itemA.image.edge_vectors.find((v) => v.edge === 'right');
    const vecB = itemB.image.edge_vectors.find((v) => v.edge === 'left');

    if (!vecA || !vecB) return null;
    return {
      scoreInfo: calculate_seam_score(vecA, vecB),
      vecA,
      vecB,
    };
  }, [placedItems]);

  const activeSeam = seamCheck();

  const handlePunctumMark = (image: PicasImage, pt: { x: number; y: number }) => {
    appendEvent({
      event_type: 'punctum.mark',
      actor_kind: 'human',
      actor_id: 'arne',
      device: 'ipad',
      input_modality: inputMode,
      zoom_level: 1.0,
      image_id: image.image_id,
      client_ts: new Date().toISOString(),
      payload: {
        x_px: pt.x,
        y_px: pt.y,
        note: inputMode === 'pencil' ? 'Apple Pencil Druckpunkt' : 'Finger-Tap',
      },
    });
  };

  const handleSnapDiptych = () => {
    setIsDiptychSnapped(true);
    // Align item 1 right up to item 0
    setPlacedItems((prev) => {
      const copy = [...prev];
      copy[1] = {
        ...copy[1],
        x: copy[0].x + (copy[0].image.aspect_ratio === '3:4' ? 380 : 480) + 16,
        y: copy[0].y,
      };
      return copy;
    });

    appendEvent({
      event_type: 'spatial.move',
      actor_kind: 'human',
      actor_id: 'arne',
      device: 'ipad',
      input_modality: inputMode,
      zoom_level: 1.0,
      client_ts: new Date().toISOString(),
      payload: {
        type: 'diptych_seam_snap',
        seam_score: activeSeam?.scoreInfo.score,
      },
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] bg-[#faf7f2] text-stone-900 select-none overflow-hidden font-sans">
      {/* iPad Top Curatorial Toolbar */}
      <div className="h-13 border-b border-stone-300 bg-[#f4eee4] px-6 flex items-center justify-between shadow-xs shrink-0 leading-none">
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-base text-stone-900 tracking-tight leading-snug">
            Leuchtpult · Spatial Canvas
          </span>
          <span className="text-stone-400">·</span>
          <span className="text-xs font-mono font-normal text-stone-600 leading-none">
            Patent-Papier (#FAF7F2) · Kurator
          </span>
        </div>

        {/* Tools and Mode Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Pencil vs Finger selector (§3.2) */}
          <div className="flex items-center p-1 bg-stone-200/80 rounded-xl border border-stone-300">
            <button
              onClick={() => setInputMode('finger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition-all leading-none ${
                inputMode === 'finger'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 font-normal'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Finger (Pan/Zoom)</span>
            </button>
            <button
              onClick={() => setInputMode('pencil')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition-all leading-none ${
                inputMode === 'pencil'
                  ? 'bg-[#3d5a80] text-white font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 font-normal'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Apple Pencil (Punctum)</span>
            </button>
          </div>

          {/* Fibonacci-Dip-Linie toggle switch (0.618 golden ratio) */}
          <div className="bg-white/90 border border-stone-300 rounded-lg px-2.5 py-1 flex items-center shadow-xs">
            <ToggleSwitch
              checked={showFibonacci}
              onChange={setShowFibonacci}
              label="Fibonacci φ"
              size="sm"
              icon={Compass}
              activeColor="bg-[#b87514]"
              ariaLabel="Fibonacci φ Hilfslinie ein- oder ausschalten"
            />
          </div>

          {/* Rand-Vektoren toggle switch */}
          <div className="bg-white/90 border border-stone-300 rounded-lg px-2.5 py-1 flex items-center shadow-xs">
            <ToggleSwitch
              checked={showVectors}
              onChange={setShowVectors}
              label="Rand-Vektoren"
              size="sm"
              icon={Sparkles}
              activeColor="bg-[#3d5a80]"
              ariaLabel="Rand-Vektoren Visualisierung ein- oder ausschalten"
            />
          </div>
        </div>
      </div>

      {/* Main Leuchtpult Canvas Area with Fine Grid Paper Texture */}
      <div className="flex-1 relative overflow-auto p-8 bg-[#faf7f2] bg-[radial-gradient(#d6cec4_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Diptych Seam Inspection Strip when items are aligned */}
        {activeSeam && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-stone-300 shadow-lg text-xs leading-none">
            <span className="text-stone-500 font-sans font-semibold uppercase tracking-wider">Naht (Seam):</span>
            <span className="text-stone-800 font-mono font-normal">
              Arch [right] ↔ Staircase [left]
            </span>
            <span className="text-stone-400">·</span>
            <span className="text-stone-700 font-mono font-normal">
              Δt: {activeSeam.scoreInfo.delta_t.toFixed(3)}
            </span>
            <span className="text-stone-400">·</span>
            <span className="text-[#b87514] font-sans font-semibold">
              Score s: {(activeSeam.scoreInfo.score * 100).toFixed(1)}%
            </span>
            {!isDiptychSnapped && (
              <button
                onClick={handleSnapDiptych}
                className="px-3 py-1.5 rounded-lg bg-[#3d5a80] text-white font-sans font-semibold hover:bg-[#2e4563] ml-2 leading-none"
              >
                Diptychon einrasten
              </button>
            )}
          </div>
        )}

        {/* Spatial Arrangement of Images on Leuchtpult */}
        <div className="relative w-[1800px] h-[900px]">
          {placedItems.map((item) => {
            const isSelected = item.image.image_id === activeItemId;
            const triageState = projections.triageStates.get(`${item.image.image_id}:arne`);

            return (
              <div
                key={item.image.image_id}
                onClick={() => setActiveItemId(item.image.image_id)}
                className={`absolute transition-all rounded-xl overflow-hidden bg-white shadow-xl border-4 ${
                  isSelected
                    ? 'border-[#3d5a80] ring-4 ring-[#3d5a80]/20'
                    : 'border-white hover:border-stone-300'
                }`}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: `${item.image.aspect_ratio === '3:4' ? 380 : 480}px`,
                  height: `${item.image.aspect_ratio === '3:4' ? 500 : 360}px`,
                }}
              >
                {/* Triage Badge with geometric shapes (SPEC §7: Checkmark vs Cross) */}
                {triageState && (
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <TriageBadge state={triageState.state} size="xs" showLabel={true} />
                  </div>
                )}

                {/* Photographic Canvas with Punctum Mark capability */}
                <PhotographicCanvas
                  image={item.image}
                  showSystemCenter={true}
                  showPunctumMarks={true}
                  showEdgeVectors={showVectors}
                  showFibonacciLine={showFibonacci}
                  showDeltaPVector={true}
                  punctumMarks={projections.punctumMarks}
                  hoverPoint={hoverCoord}
                  onImageClick={(pt) => handlePunctumMark(item.image, pt)}
                  className="w-full h-full"
                />

                {/* Card Title Label in Playfair Display (Serif 400) */}
                <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xs p-2.5 text-left border-t border-stone-200 flex items-center justify-between">
                  <div className="text-xs font-serif font-normal text-stone-900 truncate leading-snug">
                    {item.image.title}
                  </div>
                  <span className="text-xs font-mono font-normal text-stone-500 leading-none">
                    {item.image.aspect_ratio}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Diptych Seam Linking Line between Image 0 and Image 1 */}
          {activeSeam && isDiptychSnapped && (
            <div
              className="absolute pointer-events-none z-10"
              style={{
                left: '636px',
                top: '140px',
                height: '360px',
                width: '8px',
              }}
            >
              <div className="w-0.5 h-full bg-[#b87514] mx-auto border-r border-dashed border-white" />
            </div>
          )}
        </div>
      </div>

      {/* Leuchtpult Bottom Footer Banner */}
      <div className="h-10 border-t border-stone-300 bg-[#f4eee4] px-6 flex items-center justify-between text-xs font-sans text-stone-600 shrink-0 leading-none">
        <div>
          Modus: <span className="font-semibold text-stone-900">{inputMode === 'pencil' ? 'Apple Pencil (Punctum-Eingabe)' : 'Finger (Pan & Zoom)'}</span> · Klicken / Tippen setzt ein Punctum
        </div>
        <div className="flex items-center gap-4 text-xs font-sans">
          <span className="inline-flex items-center gap-1.5 text-[#3d5a80] font-semibold">
            <Check className="w-3.5 h-3.5 stroke-[3]" /> Indigoblau (Pick)
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#c23010] font-semibold">
            <X className="w-3.5 h-3.5 stroke-[3]" /> Oxidrot (Reject)
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#b87514] font-semibold">
            ◆ Ockergold (Punctum Marke)
          </span>
        </div>
      </div>
    </div>
  );
};
