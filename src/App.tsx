/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePicasStore } from './store/eventStore';
import { SEED_IMAGES } from './data/seedImages';
import { IPhoneView } from './components/devices/IPhoneView';
import { LeitstandView } from './components/devices/LeitstandView';
import { IPadView } from './components/devices/IPadView';
import { LGOledView } from './components/devices/LGOledView';
import { EventLogView } from './components/devices/EventLogView';
import {
  Smartphone,
  Monitor,
  Tablet,
  Tv,
  Database,
  BookOpen,
  X,
} from 'lucide-react';
import { ToggleSwitch } from './utils/statusIcons';

export default function App() {
  const [activeDevice, setActiveDevice] = useState<
    'iphone' | 'leitstand' | 'ipad' | 'oled' | 'eventlog'
  >('iphone');
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [showFormSymbols, setShowFormSymbols] = useState(true);

  const {
    events,
    projections,
    gallerySession,
    setGallerySession,
    appendEvent,
    undoEvent,
    resetLog,
    exportNDJSON,
  } = usePicasStore();

  return (
    <div className="min-h-screen bg-[#0a0c10] text-stone-100 flex flex-col font-sans selection:bg-[#b87514] selection:text-white">
      {/* CSS Selector 2: Top Bar Contract: [Brand title] — [Nav links] — [Primary action] */}
      <header className="h-[52px] bg-[#0e1015] border-b border-stone-800/80 px-4 md:px-6 flex items-center justify-between gap-4 md:gap-8 z-30 shrink-0 leading-none">
        
        {/* Zone 1: Single element Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            className="font-serif text-base md:text-lg font-normal tracking-wider text-stone-100 hover:text-stone-300 transition-colors whitespace-nowrap leading-none"
          >
            PICAS
          </a>
          <span className="hidden lg:inline-block text-xs font-mono text-stone-500 font-normal leading-none">
            v0.1-entwurf
          </span>
        </div>

        {/* Zone 2: Device-×-Säulen-Architektur Navigation Links (Strict font-weight: 400 normal / 600 semibold) */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveDevice('iphone')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-colors leading-none ${
              activeDevice === 'iphone'
                ? 'bg-stone-800 text-stone-100 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 font-normal'
            }`}
            aria-label="iPhone Triage View"
          >
            <Smartphone className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">iPhone (Triagieren)</span>
            <span className="sm:hidden">iPhone</span>
          </button>

          <button
            onClick={() => setActiveDevice('leitstand')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-colors leading-none ${
              activeDevice === 'leitstand'
                ? 'bg-stone-800 text-stone-100 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 font-normal'
            }`}
            aria-label="Leitstand View"
          >
            <Monitor className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">Leitstand (Prüfen/Regie)</span>
            <span className="sm:hidden">Leitstand</span>
          </button>

          <button
            onClick={() => setActiveDevice('ipad')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-colors leading-none ${
              activeDevice === 'ipad'
                ? 'bg-stone-800 text-stone-100 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 font-normal'
            }`}
            aria-label="iPad Leuchtpult View"
          >
            <Tablet className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">iPad (Kuratieren)</span>
            <span className="sm:hidden">iPad</span>
          </button>

          <button
            onClick={() => setActiveDevice('oled')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-colors leading-none ${
              activeDevice === 'oled'
                ? 'bg-stone-800 text-stone-100 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 font-normal'
            }`}
            aria-label="LG 4K-OLED Galerie View"
          >
            <Tv className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">LG OLED (Zeigen)</span>
            <span className="sm:hidden">OLED</span>
          </button>

          <button
            onClick={() => setActiveDevice('eventlog')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-colors leading-none ${
              activeDevice === 'eventlog'
                ? 'bg-stone-800 text-stone-100 font-semibold'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 font-normal'
            }`}
            aria-label="Event Log and Projections Audit"
          >
            <Database className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">
              Event-Log <span className="font-mono text-xs text-stone-500 font-normal">({events.length})</span>
            </span>
            <span className="sm:hidden">
              Log <span className="font-mono text-xs text-stone-500 font-normal">({events.length})</span>
            </span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action & Accessible Toggle on/off switch */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center pl-2 border-l border-stone-800">
            <ToggleSwitch
              checked={showFormSymbols}
              onChange={setShowFormSymbols}
              label="§7 Formen"
              size="sm"
              activeColor="bg-[#3d5a80]"
              ariaLabel="Barrierefreie Form-Semantik (Checkmark / Kreuz) an- oder ausschalten"
            />
          </div>

          <button
            onClick={() => setShowSpecModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-800 hover:border-stone-600 text-stone-300 hover:text-stone-100 rounded-lg text-xs font-sans font-normal transition-colors whitespace-nowrap leading-none"
          >
            <BookOpen className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden md:inline">SPEC &amp; Glossar</span>
            <span className="md:hidden">SPEC</span>
          </button>
        </div>
      </header>

      {/* Main View Area Routing */}
      <main className="flex-1 overflow-hidden relative">
        {activeDevice === 'iphone' && (
          <IPhoneView
            images={SEED_IMAGES}
            projections={projections}
            events={events}
            appendEvent={appendEvent}
            undoEvent={undoEvent}
            showFormSymbols={showFormSymbols}
          />
        )}

        {activeDevice === 'leitstand' && (
          <LeitstandView
            images={SEED_IMAGES}
            projections={projections}
            events={events}
            appendEvent={appendEvent}
            undoEvent={undoEvent}
            gallerySession={gallerySession}
          />
        )}

        {activeDevice === 'ipad' && (
          <IPadView
            images={SEED_IMAGES}
            projections={projections}
            events={events}
            appendEvent={appendEvent}
            undoEvent={undoEvent}
          />
        )}

        {activeDevice === 'oled' && (
          <LGOledView
            images={SEED_IMAGES}
            projections={projections}
            events={events}
            gallerySession={gallerySession}
            setGallerySession={setGallerySession}
            appendEvent={appendEvent}
          />
        )}

        {activeDevice === 'eventlog' && (
          <EventLogView
            events={events}
            images={SEED_IMAGES}
            projections={projections}
            undoEvent={undoEvent}
            exportNDJSON={exportNDJSON}
            resetLog={resetLog}
          />
        )}
      </main>

      {/* PICAS SPEC & Glossar Reference Drawer / Modal */}
      {showSpecModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-150">
          <div className="bg-[#12141a] border border-stone-800 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-800/80 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-100 leading-snug">
                  PICAS Architektur &amp; Invarianten
                </h2>
                <p className="text-xs font-mono text-stone-400 mt-1 leading-normal font-normal">
                  Version: v0.1-entwurf · 2026-10-21 · Quelle: Arne
                </p>
              </div>
              <button
                onClick={() => setShowSpecModal(false)}
                className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans text-stone-300 leading-normal font-normal">
              {/* Invarianten Grid */}
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-bold text-stone-100 leading-snug">
                  1. Invarianten (§1)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-stone-900/90 rounded-2xl border border-stone-800/80">
                    <span className="text-stone-200 font-semibold block leading-snug">1.1 Single Source of Truth:</span>
                    <p className="mt-1 text-stone-400 leading-normal">
                      Alle Interaktionen aller 4 Geräte schreiben append-only in den Event-Log. Keine UPDATE oder DELETE.
                    </p>
                  </div>
                  <div className="p-3.5 bg-stone-900/90 rounded-2xl border border-stone-800/80">
                    <span className="text-stone-200 font-semibold block leading-snug">1.2 Pflicht-Provenienz:</span>
                    <p className="mt-1 text-stone-400 leading-normal">
                      Menschlich: device, input_modality, zoom_level, timestamp. System: Vier-Hash (schema_hash, analyzer_version, param_hash, code_hash).
                    </p>
                  </div>
                  <div className="p-3.5 bg-stone-900/90 rounded-2xl border border-stone-800/80">
                    <span className="text-stone-200 font-semibold block leading-snug">1.3 Geräte-Rollen:</span>
                    <p className="mt-1 text-stone-400 leading-normal">
                      iPhone (triagieren), Leitstand (prüfen/regieren), iPad (kuratieren), LG OLED (zeigen).
                    </p>
                  </div>
                  <div className="p-3.5 bg-stone-900/90 rounded-2xl border border-stone-800/80">
                    <span className="text-stone-200 font-semibold block leading-snug">1.6 Content-Addressed:</span>
                    <p className="mt-1 text-stone-400 leading-normal">
                      Originale unveränderlich über SHA-256 (32 Bytes). Ableitungen reproduzierbar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Glossar Math */}
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-bold text-stone-100 leading-snug">
                  2. Mathematische Definitionen (Glossar §C &amp; §D)
                </h3>
                <div className="p-4 bg-stone-900/90 rounded-2xl border border-stone-800/80 space-y-2">
                  <div>
                    <span className="text-stone-200 font-semibold">Δp Metrik:</span>
                    <code className="ml-2 font-mono text-xs text-amber-300 font-normal">
                      Δp := ||p_sys - p_subj||_2 / sqrt(W² + H²) ∈ [0, 1]
                    </code>
                  </div>
                  <p className="text-stone-400 leading-normal">
                    Normiert auf Bilddiagonale; auflösungs- und seitenverhältnis-invariant. Testfall 400×300 mit p_sys=(120,90), p_subj=(130,100) ergibt exakt 0,028284.
                  </p>
                  <div className="pt-2 border-t border-stone-800">
                    <span className="text-stone-200 font-semibold">Naht (Seam) Kontinuitäts-Score:</span>
                    <code className="ml-2 font-mono text-xs text-amber-300 font-normal">
                      s = exp(- (Δt / σ_t)² - (Δθ / σ_θ)²)
                    </code>
                  </div>
                </div>
              </div>

              {/* Farb- & Form-Semantik */}
              <div className="space-y-2">
                <h3 className="text-sm font-serif font-bold text-stone-100 leading-snug">
                  3. WCAG Farb- &amp; Form-Semantik (§7 Farbenblindheit)
                </h3>
                <div className="p-3 bg-[#111317] rounded-xl border border-stone-800 text-xs font-sans text-stone-300 leading-normal">
                  <span className="font-semibold text-amber-400">Farbenblindheits-Sicherheit:</span> Farbcodierte Zustände werden ausnahmslos durch distinkte geometrische Formen ergänzt: <span className="text-[#89b3e6] font-semibold">Pick = Häkchen (✓)</span> in Indigoblau vs. <span className="text-[#f27457] font-semibold">Reject = Kreuz (✕)</span> in Oxidrot vs. <span className="text-stone-400 font-semibold">Skip = Minus (−)</span>.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-black rounded-2xl border border-stone-800">
                    <span className="text-stone-300 font-semibold block leading-snug">Dunkler Grund (#000000 OLED):</span>
                    <ul className="mt-1 space-y-1 text-stone-400 leading-normal text-xs">
                      <li>• Ockergold (#b87514): 5.59:1 (Punctum, Text)</li>
                      <li>• Oxidrot (#c23010): 3.72:1 + Kreuz (✕)</li>
                      <li>• Indigoblau (#3d5a80): 2.97:1 + Häkchen (✓, nie reiner Text auf Schwarz)</li>
                    </ul>
                  </div>
                  <div className="p-3.5 bg-[#faf7f2] text-stone-900 rounded-2xl border border-stone-300">
                    <span className="text-stone-800 font-semibold block leading-snug">Heller Grund (#FAF7F2 Patent-Papier):</span>
                    <ul className="mt-1 space-y-1 text-stone-700 leading-normal text-xs">
                      <li>• Indigoblau (#3d5a80): 7.06:1 (Pick ✓ / Studium)</li>
                      <li>• Oxidrot (#c23010): 5.64:1 (Reject ✕)</li>
                      <li>• Ockergold (#b87514): 3.75:1 (Marker ◆ + Formsymbol)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-end">
              <button
                onClick={() => setShowSpecModal(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-sans font-semibold transition-colors leading-none"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
