/**
 * Event-Log & Projections Audit View
 * Invariants 1.1 & 1.2: Append-only Event-Log with mandatory provenance.
 * Shows raw events, SQL projections (v_triage_state, v_punctum_marks, v_delta_p),
 * and export tools (NDJSON, XMP sidecar, SQL DDL).
 *
 * Strict 2-weight typography hierarchy:
 * - Sans: 400 (normal) / 600 (semibold)
 * - Serif: 400 (normal) / 700 (bold)
 * - Mono: 400 (normal)
 */

import React, { useState } from 'react';
import { PicasEvent, PicasImage } from '../../types/picas';
import { TriageBadge } from '../TriageBadge';
import { Download, Database, RotateCcw, Filter, CheckCircle2, Copy, Check, X, Minus, List, CheckSquare, Crosshair, Activity, FileCode } from 'lucide-react';

interface EventLogViewProps {
  events: PicasEvent[];
  images: PicasImage[];
  projections: ReturnType<typeof import('../../utils/math').computeProjections>;
  undoEvent: (ref_id: string, actor: any, dev: any, mod: any) => void;
  exportNDJSON: () => void;
  resetLog: () => void;
}

export const EventLogView: React.FC<EventLogViewProps> = ({
  events,
  images,
  projections,
  undoEvent,
  exportNDJSON,
  resetLog,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'triage_view' | 'marks_view' | 'deltap_view' | 'xmp'>('events');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [copiedXmp, setCopiedXmp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const filteredEvents = events.filter((e) => {
    if (typeFilter !== 'all' && !e.event_type.startsWith(typeFilter)) return false;
    if (actorFilter !== 'all' && e.actor_id !== actorFilter) return false;
    return true;
  });

  // Generate XMP Sidecar XML for first image (§8)
  const sampleImage = images[0];
  const sampleTriage = projections.triageStates.get(`${sampleImage.image_id}:arne`);
  const sampleRating = projections.ratings.get(`${sampleImage.image_id}:arne`) || 0;
  const sampleTags = Array.from(projections.tags.get(sampleImage.image_id) || []);
  const sampleMarks = projections.punctumMarks.filter((m) => m.image_id === sampleImage.image_id);

  const xmpXml = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:picas="http://derarne.cloud/ns/picas/1.0/">
   <xmp:Rating>${sampleRating}</xmp:Rating>
   <xmp:MetadataDate>${new Date().toISOString()}</xmp:MetadataDate>
   <dc:title>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${sampleImage.title}</rdf:li>
    </rdf:Alt>
   </dc:title>
   <dc:subject>
    <rdf:Bag>
     ${sampleTags.map((t) => `<rdf:li>${t}</rdf:li>`).join('\n     ')}
    </rdf:Bag>
   </dc:subject>
   <picas:ImageSha256>${sampleImage.image_id}</picas:ImageSha256>
   <picas:TriageState>${sampleTriage?.state || 'none'}</picas:TriageState>
   <picas:SystemCenter estimator="${sampleImage.system_center.estimator}" x="${sampleImage.system_center.x}" y="${sampleImage.system_center.y}"/>
   <picas:PunctumMarks>
    <rdf:Seq>
     ${sampleMarks.map((m) => `<rdf:li actor="${m.actor_id}" x="${m.x_px}" y="${m.y_px}" zoom="${m.zoom_level}" modality="${m.input_modality}"/>`).join('\n     ')}
    </rdf:Seq>
   </picas:PunctumMarks>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  const handleCopyXmp = () => {
    navigator.clipboard.writeText(xmpXml);
    setCopiedXmp(true);
    setTimeout(() => setCopiedXmp(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] bg-[#0d0f12] text-stone-200 overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="h-13 border-b border-stone-800 bg-[#13161c] px-6 flex items-center justify-between shrink-0 leading-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-amber-500" />
            <span className="font-serif font-bold text-base text-stone-100 leading-snug">
              PICAS Event-Log &amp; Projektionen
            </span>
          </div>
          <span className="text-stone-600">|</span>
          <span className="text-xs font-mono font-normal text-stone-400 leading-none">
            Append-Only · {events.length} Einträge · Invariante 1.1 &amp; 1.2
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportNDJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-sans font-semibold border border-stone-700 transition-colors leading-none"
          >
            <Download className="w-3.5 h-3.5" />
            <span>NDJSON Export</span>
          </button>

          {showResetConfirm ? (
            <div className="flex items-center gap-1.5 bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-800 text-xs font-sans leading-none">
              <span className="text-red-200 font-normal">Sicher zurücksetzen?</span>
              <button
                onClick={() => {
                  resetLog();
                  setShowResetConfirm(false);
                }}
                className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white font-semibold rounded"
              >
                Ja
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-0.5 text-stone-400 hover:text-stone-200 font-normal"
              >
                Nein
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-sans font-normal border border-red-900/40 transition-colors leading-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Log zurücksetzen</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="h-10 border-b border-stone-800/80 bg-[#101217] px-6 flex items-center gap-2 shrink-0 leading-none">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-md transition-colors leading-none ${
            activeTab === 'events' ? 'bg-[#3d5a80] text-white font-semibold' : 'text-stone-400 hover:text-stone-200 font-normal'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>events (Append-Only Log)</span>
        </button>
        <button
          onClick={() => setActiveTab('triage_view')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-md transition-colors leading-none ${
            activeTab === 'triage_view' ? 'bg-[#3d5a80] text-white font-semibold' : 'text-stone-400 hover:text-stone-200 font-normal'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>VIEW v_triage_state</span>
        </button>
        <button
          onClick={() => setActiveTab('marks_view')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-md transition-colors leading-none ${
            activeTab === 'marks_view' ? 'bg-[#3d5a80] text-white font-semibold' : 'text-stone-400 hover:text-stone-200 font-normal'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>VIEW v_punctum_marks</span>
        </button>
        <button
          onClick={() => setActiveTab('deltap_view')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-md transition-colors leading-none ${
            activeTab === 'deltap_view' ? 'bg-[#3d5a80] text-white font-semibold' : 'text-stone-400 hover:text-stone-200 font-normal'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>VIEW v_delta_p</span>
        </button>
        <button
          onClick={() => setActiveTab('xmp')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-md transition-colors leading-none ${
            activeTab === 'xmp' ? 'bg-[#b87514] text-white font-semibold' : 'text-stone-400 hover:text-stone-200 font-normal'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>XMP-Sidecar (§8)</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6 font-sans">
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex items-center gap-4 bg-[#14171e] p-3 rounded-xl border border-stone-800 text-xs leading-none">
              <span className="text-stone-400 flex items-center gap-1.5 font-normal">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-normal">Typ:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-stone-900 border border-stone-700 text-stone-200 text-xs px-2.5 py-1 rounded-md font-sans font-normal"
                >
                  <option value="all">Alle Typen</option>
                  <option value="triage.">triage.*</option>
                  <option value="punctum.">punctum.*</option>
                  <option value="spatial.">spatial.*</option>
                  <option value="rating.">rating.*</option>
                  <option value="note.">note.*</option>
                  <option value="gallery.">gallery.*</option>
                  <option value="meta.undo">meta.undo</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-normal">Akteur:</span>
                <select
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="bg-stone-900 border border-stone-700 text-stone-200 text-xs px-2.5 py-1 rounded-md font-sans font-normal"
                >
                  <option value="all">Alle Akteure</option>
                  <option value="arne">arne</option>
                  <option value="vater">vater</option>
                  <option value="system">system</option>
                </select>
              </div>

              <span className="text-stone-500 ml-auto font-mono text-xs font-normal">
                {filteredEvents.length} gefilterte Events
              </span>
            </div>

            {/* Events Table */}
            <div className="border border-stone-800 rounded-xl overflow-hidden bg-[#111317]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#181b22] text-stone-400 border-b border-stone-800 font-semibold leading-none">
                  <tr>
                    <th className="p-3 w-16">Seq</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Akteur</th>
                    <th className="p-3">Gerät</th>
                    <th className="p-3">Modalität</th>
                    <th className="p-3">Bild-ID</th>
                    <th className="p-3">Payload Details</th>
                    <th className="p-3 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-normal leading-normal">
                  {filteredEvents.map((ev) => {
                    const isUndo = ev.event_type === 'meta.undo';
                    const isUndone = events.some(
                      (u) => u.event_type === 'meta.undo' && u.ref_event_id === ev.event_id
                    );

                    return (
                      <tr
                        key={ev.event_id}
                        className={`hover:bg-stone-800/40 transition-colors ${
                          isUndone ? 'opacity-40 line-through bg-red-950/10' : ''
                        } ${isUndo ? 'bg-amber-950/20' : ''}`}
                      >
                        <td className="p-3 text-stone-500 font-mono font-normal">{ev.seq}</td>
                        <td className="p-3">
                          <span
                            className={`font-mono px-2 py-0.5 rounded text-[11px] font-normal leading-none inline-flex items-center gap-1 ${
                              ev.event_type.startsWith('triage.pick')
                                ? 'bg-blue-950 text-blue-300 border border-blue-900'
                                : ev.event_type.startsWith('triage.reject')
                                ? 'bg-red-950 text-red-300 border border-red-900'
                                : ev.event_type.startsWith('triage.skip')
                                ? 'bg-stone-900 text-stone-300 border border-stone-800'
                                : ev.event_type.startsWith('punctum.')
                                ? 'bg-amber-950 text-amber-300 border border-amber-900'
                                : ev.event_type.startsWith('meta.undo')
                                ? 'bg-purple-950 text-purple-300 border border-purple-900'
                                : 'bg-stone-800 text-stone-300'
                            }`}
                          >
                            {ev.event_type.startsWith('triage.pick') && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            {ev.event_type.startsWith('triage.reject') && <X className="w-2.5 h-2.5 stroke-[3]" />}
                            {ev.event_type.startsWith('triage.skip') && <Minus className="w-2.5 h-2.5 stroke-[3]" />}
                            <span>{ev.event_type}</span>
                          </span>
                        </td>
                        <td className="p-3 capitalize font-normal">{ev.actor_id}</td>
                        <td className="p-3 font-normal">{ev.device || '—'}</td>
                        <td className="p-3 font-normal">{ev.input_modality || '—'}</td>
                        <td className="p-3 font-mono text-stone-400 font-normal">
                          {ev.image_id ? ev.image_id.substring(0, 8) + '...' : '—'}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-stone-400 font-normal truncate max-w-xs">
                          {JSON.stringify(ev.payload)}
                        </td>
                        <td className="p-3 text-right">
                          {!isUndo && !isUndone && (
                            <button
                              onClick={() => undoEvent(ev.event_id, 'arne', 'mac', 'mouse')}
                              className="text-[11px] text-stone-500 hover:text-amber-400 font-sans font-normal underline leading-none"
                            >
                              Kompensieren
                            </button>
                          )}
                          {isUndone && (
                            <span className="text-[10px] text-red-400 font-normal leading-none">Kompensiert</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'triage_view' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-[#14171e] rounded-xl border border-stone-800 text-xs font-mono font-normal text-stone-400 leading-normal">
              CREATE OR REPLACE VIEW v_triage_state — Materialisierte Projektion aus Triage-Events &amp; meta.undo
            </div>

            <div className="border border-stone-800 rounded-xl overflow-hidden bg-[#111317]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#181b22] text-stone-400 border-b border-stone-800 font-semibold leading-none">
                  <tr>
                    <th className="p-3">Bild</th>
                    <th className="p-3">Akteur</th>
                    <th className="p-3">Zustand (Projektion)</th>
                    <th className="p-3">Event Seq</th>
                    <th className="p-3">Letztes Gerät</th>
                    <th className="p-3">Letzte Modalität</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-normal leading-normal">
                  {Array.from(projections.triageStates.values()).map((state) => {
                    const img = images.find((i) => i.image_id === state.image_id);
                    return (
                      <tr key={`${state.image_id}:${state.actor_id}`} className="hover:bg-stone-800/40">
                        <td className="p-3 text-stone-200 font-semibold">
                          {img?.title || state.image_id.substring(0, 10)}
                        </td>
                        <td className="p-3 capitalize">{state.actor_id}</td>
                        <td className="p-3">
                          <TriageBadge state={state.state} size="xs" showLabel={true} />
                        </td>
                        <td className="p-3 text-stone-400 font-mono">{state.seq}</td>
                        <td className="p-3">{state.device}</td>
                        <td className="p-3">{state.input_modality}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'marks_view' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-[#14171e] rounded-xl border border-stone-800 text-xs font-mono font-normal text-stone-400 leading-normal">
              CREATE OR REPLACE VIEW v_punctum_marks — Gefiltert auf nicht-zurückgenommene Marken
            </div>

            <div className="border border-stone-800 rounded-xl overflow-hidden bg-[#111317]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#181b22] text-stone-400 border-b border-stone-800 font-semibold leading-none">
                  <tr>
                    <th className="p-3">Bild</th>
                    <th className="p-3">Akteur</th>
                    <th className="p-3">Gerät</th>
                    <th className="p-3">Modalität</th>
                    <th className="p-3">x_px</th>
                    <th className="p-3">y_px</th>
                    <th className="p-3">zoom_level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-normal leading-normal">
                  {projections.punctumMarks.map((m) => {
                    const img = images.find((i) => i.image_id === m.image_id);
                    return (
                      <tr key={m.event_id} className="hover:bg-stone-800/40">
                        <td className="p-3 text-stone-200 font-semibold">
                          {img?.title || m.image_id.substring(0, 10)}
                        </td>
                        <td className="p-3 capitalize">{m.actor_id}</td>
                        <td className="p-3">{m.device}</td>
                        <td className="p-3">{m.input_modality}</td>
                        <td className="p-3 font-mono text-amber-400">{m.x_px}</td>
                        <td className="p-3 font-mono text-amber-400">{m.y_px}</td>
                        <td className="p-3">{m.zoom_level}×</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'deltap_view' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-[#14171e] rounded-xl border border-stone-800 text-xs font-mono font-normal text-stone-400 leading-normal">
              CREATE OR REPLACE VIEW v_delta_p AS ||p_sys - p_subj||_2 / sqrt(W^2 + H^2)
            </div>

            <div className="border border-stone-800 rounded-xl overflow-hidden bg-[#111317]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#181b22] text-stone-400 border-b border-stone-800 font-semibold leading-none">
                  <tr>
                    <th className="p-3">Bild</th>
                    <th className="p-3">Akteur</th>
                    <th className="p-3">Estimator</th>
                    <th className="p-3">p_sys</th>
                    <th className="p-3">p_subj</th>
                    <th className="p-3 text-right">Δp (berechnet)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-normal leading-normal">
                  {projections.deltaPRecords.map((dp) => {
                    const img = images.find((i) => i.image_id === dp.image_id);
                    return (
                      <tr key={dp.mark_event_id} className="hover:bg-stone-800/40">
                        <td className="p-3 text-stone-200 font-semibold">
                          {img?.title || dp.image_id.substring(0, 10)}
                        </td>
                        <td className="p-3 capitalize">{dp.actor_id}</td>
                        <td className="p-3">{dp.estimator}</td>
                        <td className="p-3 font-mono">({dp.p_sys.x}, {dp.p_sys.y})</td>
                        <td className="p-3 font-mono">({dp.p_subj.x}, {dp.p_subj.y})</td>
                        <td className="p-3 text-right font-mono text-amber-400 font-semibold">
                          {dp.delta_p.toFixed(5)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'xmp' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-[#14171e] rounded-xl border border-stone-800 text-xs font-sans font-normal text-stone-400 leading-none">
              <span>XMP-Sidecar Export (Adobe XMP Standard + picas: Namespace)</span>
              <button
                onClick={handleCopyXmp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-semibold transition-colors leading-none"
              >
                {copiedXmp ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedXmp ? 'Kopiert!' : 'In Zwischenablage kopieren'}</span>
              </button>
            </div>

            <pre className="p-4 bg-[#111317] border border-stone-800 rounded-xl text-xs font-mono text-amber-300/90 overflow-x-auto leading-relaxed font-normal">
              {xmpXml}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
