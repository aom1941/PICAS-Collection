/**
 * High-Fidelity Photographic Canvas
 * Renders rich photographic compositions with procedural tonal grading,
 * film grain, edge vectors, system centers (p_sys), and punctum marks (p_subj).
 */

import React, { useId } from 'react';
import { PicasImage, EdgeVector, PunctumMark } from '../types/picas';

interface PhotographicCanvasProps {
  image: PicasImage;
  showSystemCenter?: boolean;
  showPunctumMarks?: boolean;
  showEdgeVectors?: boolean;
  showFibonacciLine?: boolean;
  showDeltaPVector?: boolean;
  punctumMarks?: PunctumMark[];
  hoverPoint?: { x: number; y: number } | null;
  onImageClick?: (point: { x: number; y: number; normalizedX: number; normalizedY: number }) => void;
  className?: string;
  zoomLevel?: number;
  panOffset?: { x: number; y: number };
}

export const PhotographicCanvas: React.FC<PhotographicCanvasProps> = ({
  image,
  showSystemCenter = true,
  showPunctumMarks = true,
  showEdgeVectors = false,
  showFibonacciLine = false,
  showDeltaPVector = true,
  punctumMarks = [],
  hoverPoint = null,
  onImageClick,
  className = '',
  zoomLevel = 1.0,
  panOffset = { x: 0, y: 0 },
}) => {
  const filterId = useId().replace(/:/g, '');

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onImageClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normalizedX = Math.max(0, Math.min(1, clickX / rect.width));
    const normalizedY = Math.max(0, Math.min(1, clickY / rect.height));

    const x_px = Math.round(normalizedX * image.width_px);
    const y_px = Math.round(normalizedY * image.height_px);

    onImageClick({ x: x_px, y: y_px, normalizedX, normalizedY });
  };

  // Relevant punctum marks for this image
  const imageMarks = punctumMarks.filter((m) => m.image_id === image.image_id);
  const primaryMark = imageMarks.length > 0 ? imageMarks[imageMarks.length - 1] : null;

  // Render composition based on render_type
  const renderComposition = () => {
    switch (image.render_type) {
      case 'architectural':
        return (
          <g>
            {/* Deep limestone textured backdrop */}
            <rect width={image.width_px} height={image.height_px} fill="#141517" />
            <path
              d={`M0 0 L${image.width_px * 0.7} 0 L${image.width_px * 0.42} ${image.height_px} L0 ${image.height_px} Z`}
              fill="#24282f"
            />
            {/* Massive brutalist arch */}
            <path
              d={`M${image.width_px * 0.15} ${image.height_px} L${image.width_px * 0.15} ${image.height_px * 0.35} Q${image.width_px * 0.38} ${image.height_px * 0.08} ${image.width_px * 0.62} ${image.height_px * 0.35} L${image.width_px * 0.62} ${image.height_px} Z`}
              fill="#181a1d"
            />
            <path
              d={`M${image.width_px * 0.22} ${image.height_px} L${image.width_px * 0.22} ${image.height_px * 0.42} Q${image.width_px * 0.38} ${image.height_px * 0.22} ${image.width_px * 0.55} ${image.height_px * 0.42} L${image.width_px * 0.55} ${image.height_px} Z`}
              fill="#0d0e10"
            />
            {/* High-contrast diagonal concrete shadow line cutting right edge */}
            <polygon
              points={`0,${image.height_px * 0.8} ${image.width_px * 0.45},0 ${image.width_px},${image.height_px * 0.42} ${image.width_px * 0.68},${image.height_px}`}
              fill="#383e48"
              opacity="0.85"
            />
            <line
              x1={0}
              y1={image.height_px * 0.8}
              x2={image.width_px}
              y2={image.height_px * 0.42}
              stroke="#e4e8ee"
              strokeWidth="6"
              opacity="0.9"
            />
            {/* Secondary concrete ribbing lines */}
            {[0.2, 0.28, 0.36, 0.44, 0.52].map((f, i) => (
              <line
                key={i}
                x1={image.width_px * f}
                y1={0}
                x2={image.width_px * (f - 0.15)}
                y2={image.height_px}
                stroke="#4a5260"
                strokeWidth="2"
                strokeDasharray="8 4"
                opacity="0.6"
              />
            ))}
          </g>
        );

      case 'coastal':
        return (
          <g>
            {/* Coastal horizon with misty sky and cold water */}
            <defs>
              <linearGradient id={`coastal_grad_${filterId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#485c74" />
                <stop offset="48%" stopColor="#96a4b5" />
                <stop offset="55%" stopColor="#2c3947" />
                <stop offset="100%" stopColor="#131920" />
              </linearGradient>
            </defs>
            <rect width={image.width_px} height={image.height_px} fill={`url(#coastal_grad_${filterId})`} />
            {/* Razor-sharp horizon line at 55% */}
            <line
              x1="0"
              y1={image.height_px * 0.55}
              x2={image.width_px}
              y2={image.height_px * 0.55}
              stroke="#c5d1de"
              strokeWidth="3"
              opacity="0.8"
            />
            {/* Soft water long-exposure bands */}
            <ellipse
              cx={image.width_px * 0.5}
              cy={image.height_px * 0.75}
              rx={image.width_px * 0.6}
              ry={image.height_px * 0.15}
              fill="#1d2630"
              opacity="0.7"
            />
            {/* Solitary weathered beacon iron stake in distance at (2750, 980) */}
            <polygon
              points={`${2745},${image.height_px * 0.55} ${2755},${image.height_px * 0.55} ${2752},${880} ${2748},${880}`}
              fill="#080b0e"
            />
            <circle cx="2750" cy="870" r="14" fill="#a43015" />
          </g>
        );

      case 'portrait':
        return (
          <g>
            {/* Chiaroscuro studio darkness */}
            <rect width={image.width_px} height={image.height_px} fill="#0e0f11" />
            {/* Warm table surface */}
            <polygon
              points={`0,${image.height_px * 0.65} ${image.width_px},${image.height_px * 0.55} ${image.width_px},${image.height_px} 0,${image.height_px}`}
              fill="#26211c"
            />
            {/* Torso shadow silhouette */}
            <ellipse
              cx={image.width_px * 0.5}
              cy={image.height_px * 0.38}
              rx={image.width_px * 0.32}
              ry={image.height_px * 0.3}
              fill="#1b1c20"
            />
            {/* Folded hands on rustic oak table */}
            <ellipse
              cx={1540}
              cy={1980}
              rx={460}
              ry={280}
              fill="#6b5744"
              opacity="0.9"
            />
            <ellipse
              cx={1480}
              cy={1920}
              rx={320}
              ry={180}
              fill="#8d725a"
              opacity="0.95"
            />
            {/* Punctum: Weathered silver ring catching directional North window light */}
            <ellipse cx="1490" cy="1890" rx="34" ry="22" fill="#e8edf2" stroke="#b0bec9" strokeWidth="6" />
            <ellipse cx="1490" cy="1890" rx="18" ry="10" fill="#2d3036" />
            {/* Subtle window light beam */}
            <polygon
              points={`0,0 ${image.width_px * 0.35},0 ${image.width_px * 0.8},${image.height_px} 0,${image.height_px}`}
              fill="#f5e6d3"
              opacity="0.06"
            />
          </g>
        );

      case 'staircase':
        return (
          <g>
            <rect width={image.width_px} height={image.height_px} fill="#181a1d" />
            {/* Concrete wall slats */}
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((pos, i) => (
              <line
                key={i}
                x1={image.width_px * pos}
                y1={0}
                x2={image.width_px * pos}
                y2={image.height_px}
                stroke="#252930"
                strokeWidth="12"
              />
            ))}
            {/* Sweeping spiral staircase helical arc */}
            <path
              d={`M0,${image.height_px * 0.42} C${image.width_px * 0.35},${image.height_px * 0.15} ${image.width_px * 0.7},${image.height_px * 0.65} ${image.width_px},${image.height_px * 0.78}`}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="24"
            />
            <path
              d={`M0,${image.height_px * 0.46} C${image.width_px * 0.35},${image.height_px * 0.19} ${image.width_px * 0.7},${image.height_px * 0.69} ${image.width_px},${image.height_px * 0.82}`}
              fill="none"
              stroke="#475569"
              strokeWidth="14"
            />
            {/* Treads radiating outwards */}
            {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((f, i) => (
              <line
                key={`tread_${i}`}
                x1={image.width_px * f}
                y1={image.height_px * (0.35 + f * 0.35)}
                x2={image.width_px * (f + 0.05)}
                y2={image.height_px * (0.45 + f * 0.35)}
                stroke="#0f1115"
                strokeWidth="8"
              />
            ))}
          </g>
        );

      case 'nocturne':
        return (
          <g>
            <rect width={image.width_px} height={image.height_px} fill="#090b10" />
            {/* Wet asphalt reflection */}
            <path
              d={`M0,${image.height_px * 0.6} L${image.width_px},${image.height_px * 0.5} L${image.width_px},${image.height_px} L0,${image.height_px} Z`}
              fill="#10141c"
            />
            {/* Sodium tungsten shopfront glow */}
            <circle cx="1420" cy="1100" r="520" fill="#e69c24" opacity="0.32" />
            <circle cx="1420" cy="1100" r="260" fill="#f8cf61" opacity="0.55" />
            <rect x="1100" y="850" width="640" height="480" fill="#fff5d6" opacity="0.18" />
            {/* Rain streaked vertical lines */}
            {[100, 450, 890, 1400, 1950, 2400, 2900, 3350].map((x, i) => (
              <line
                key={i}
                x1={x}
                y1={0}
                x2={x - 80}
                y2={image.height_px}
                stroke="#38bdf8"
                strokeWidth="1.5"
                opacity="0.35"
              />
            ))}
          </g>
        );

      case 'monolith':
        return (
          <g>
            <rect width={image.width_px} height={image.height_px} fill="#202630" />
            {/* Glacial sky */}
            <polygon
              points={`0,0 ${image.width_px},0 ${image.width_px},${image.height_px * 0.4} 0,${image.height_px * 0.65}`}
              fill="#8ca3ba"
            />
            {/* Sharp razor granite ridge */}
            <polygon
              points={`0,${image.height_px * 0.65} ${image.width_px * 0.42},${image.height_px * 0.22} ${image.width_px * 0.72},0 ${image.width_px},${image.height_px * 0.25} ${image.width_px},${image.height_px} 0,${image.height_px}`}
              fill="#16181d"
            />
            {/* Sunlight face */}
            <polygon
              points={`${image.width_px * 0.42},${image.height_px * 0.22} ${image.width_px * 0.72},0 ${image.width_px},${image.height_px * 0.25} ${image.width_px * 0.65},${image.height_px * 0.7}`}
              fill="#424b58"
              opacity="0.75"
            />
            {/* Snow couloir */}
            <polygon
              points={`${image.width_px * 0.55},${image.height_px * 0.3} ${image.width_px * 0.58},${image.height_px * 0.28} ${image.width_px * 0.64},${image.height_px * 0.65} ${image.width_px * 0.61},${image.height_px * 0.68}`}
              fill="#f1f5f9"
            />
          </g>
        );
    }
  };

  // Helper to map edge vector to coordinate
  const getEdgeVectorCoords = (v: EdgeVector) => {
    let x = 0;
    let y = 0;
    const arrowLen = 140;

    if (v.edge === 'left') {
      x = 0;
      y = v.t * image.height_px;
    } else if (v.edge === 'right') {
      x = image.width_px;
      y = v.t * image.height_px;
    } else if (v.edge === 'top') {
      x = v.t * image.width_px;
      y = 0;
    } else if (v.edge === 'bottom') {
      x = v.t * image.width_px;
      y = image.height_px;
    }

    const tipX = x + v.d[0] * arrowLen;
    const tipY = y + v.d[1] * arrowLen;

    return { x, y, tipX, tipY };
  };

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      <svg
        viewBox={`0 0 ${image.width_px} ${image.height_px}`}
        className="w-full h-full block cursor-crosshair"
        onClick={handleClick}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Film grain procedural texture */}
          <filter id={`grain_${filterId}`} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0" />
            <feComposite in2="SourceGraphic" in="glitch" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>

          {/* Marker markers */}
          <marker
            id={`arrow_${filterId}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#b87514" />
          </marker>
        </defs>

        {/* Base photographic visual rendering */}
        {renderComposition()}

        {/* Film grain overlay */}
        <rect
          width={image.width_px}
          height={image.height_px}
          filter={`url(#grain_${filterId})`}
          opacity="0.22"
          pointerEvents="none"
        />

        {/* Fibonacci-Dip-Linie (0.618 golden ratio guideline) */}
        {showFibonacciLine && (
          <g pointerEvents="none">
            {/* Horizontal 0.618 line */}
            <line
              x1={0}
              y1={image.height_px * 0.618}
              x2={image.width_px}
              y2={image.height_px * 0.618}
              stroke="#b87514"
              strokeWidth="3"
              strokeDasharray="16 8"
              opacity="0.85"
            />
            {/* Vertical 0.618 line */}
            <line
              x1={image.width_px * 0.618}
              y1={0}
              x2={image.width_px * 0.618}
              y2={image.height_px}
              stroke="#b87514"
              strokeWidth="3"
              strokeDasharray="16 8"
              opacity="0.85"
            />
            <text
              x={image.width_px * 0.618 + 12}
              y={image.height_px * 0.618 - 12}
              fill="#b87514"
              fontSize="28"
              fontFamily="Space Mono, monospace"
              fontWeight="bold"
            >
              φ = 0.618
            </text>
          </g>
        )}

        {/* Edge Vectors (Rand-Vektoren) */}
        {showEdgeVectors &&
          image.edge_vectors.map((vec) => {
            const { x, y, tipX, tipY } = getEdgeVectorCoords(vec);
            return (
              <g key={vec.id} pointerEvents="none">
                {/* Exit notch */}
                <circle cx={x} cy={y} r="16" fill="#b87514" stroke="#ffffff" strokeWidth="4" />
                {/* Tangent vector arrow pointing outward */}
                <line
                  x1={x}
                  y1={y}
                  x2={tipX}
                  y2={tipY}
                  stroke="#b87514"
                  strokeWidth="8"
                  markerEnd={`url(#arrow_${filterId})`}
                />
                <text
                  x={x > image.width_px / 2 ? x - 180 : x + 24}
                  y={y > image.height_px / 2 ? y - 20 : y + 36}
                  fill="#ffffff"
                  fontSize="24"
                  fontFamily="Space Mono, monospace"
                  className="drop-shadow-md"
                >
                  {vec.edge} (t={vec.t.toFixed(2)})
                </text>
              </g>
            );
          })}

        {/* System Center (p_sys) — Studium centroid in Indigoblau #3d5a80 */}
        {showSystemCenter && (
          <g pointerEvents="none">
            {/* Outer dashed ring */}
            <circle
              cx={image.system_center.x}
              cy={image.system_center.y}
              r="48"
              fill="none"
              stroke="#3d5a80"
              strokeWidth="3"
              strokeDasharray="8 4"
            />
            {/* Center crosshair */}
            <line
              x1={image.system_center.x - 24}
              y1={image.system_center.y}
              x2={image.system_center.x + 24}
              y2={image.system_center.y}
              stroke="#3d5a80"
              strokeWidth="4"
            />
            <line
              x1={image.system_center.x}
              y1={image.system_center.y - 24}
              x2={image.system_center.x}
              y2={image.system_center.y + 24}
              stroke="#3d5a80"
              strokeWidth="4"
            />
            <circle cx={image.system_center.x} cy={image.system_center.y} r="6" fill="#3d5a80" />
            <text
              x={image.system_center.x + 32}
              y={image.system_center.y - 18}
              fill="#ffffff"
              fontSize="20"
              fontFamily="Space Mono, monospace"
              fontWeight="normal"
              className="drop-shadow"
            >
              p_sys (Studium)
            </text>
          </g>
        )}

        {/* Hover preview (UIHoverGestureRecognizer equivalent) */}
        {hoverPoint && (
          <g pointerEvents="none">
            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="36"
              fill="none"
              stroke="#b87514"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.75"
            />
            <line
              x1={image.system_center.x}
              y1={image.system_center.y}
              x2={hoverPoint.x}
              y2={hoverPoint.y}
              stroke="#b87514"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          </g>
        )}

        {/* Subjective Punctum Marks (p_subj) — Ockergold #b87514 with shape symbol according to §7 */}
        {showPunctumMarks &&
          imageMarks.map((mark) => (
            <g key={mark.event_id} pointerEvents="none">
              {/* Distinctive Diamond Shape Symbol (Colorblind accessible) */}
              <polygon
                points={`${mark.x_px},${mark.y_px - 28} ${mark.x_px + 28},${mark.y_px} ${mark.x_px},${mark.y_px + 28} ${mark.x_px - 28},${mark.y_px}`}
                fill="#b87514"
                stroke="#ffffff"
                strokeWidth="4"
              />
              <circle cx={mark.x_px} cy={mark.y_px} r="6" fill="#ffffff" />
              <text
                x={mark.x_px + 36}
                y={mark.y_px + 8}
                fill="#b87514"
                fontSize="20"
                fontFamily="Space Mono, monospace"
                fontWeight="normal"
                className="drop-shadow"
              >
                p_subj [{mark.actor_id}]
              </text>
            </g>
          ))}

        {/* Δp Vector joining p_sys and primary p_subj */}
        {showDeltaPVector && primaryMark && (
          <g pointerEvents="none">
            <line
              x1={image.system_center.x}
              y1={image.system_center.y}
              x2={primaryMark.x_px}
              y2={primaryMark.y_px}
              stroke="#b87514"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            {/* Midpoint Δp readout badge */}
            {(() => {
              const midX = (image.system_center.x + primaryMark.x_px) / 2;
              const midY = (image.system_center.y + primaryMark.y_px) / 2;
              const dx = image.system_center.x - primaryMark.x_px;
              const dy = image.system_center.y - primaryMark.y_px;
              const dist = Math.hypot(dx, dy);
              const diag = Math.hypot(image.width_px, image.height_px);
              const dpVal = dist / diag;

              return (
                <g>
                  <rect
                    x={midX - 95}
                    y={midY - 20}
                    width="190"
                    height="40"
                    rx="4"
                    fill="#111317"
                    stroke="#b87514"
                    strokeWidth="1.5"
                    opacity="0.95"
                  />
                  <text
                    x={midX}
                    y={midY + 6}
                    fill="#b87514"
                    fontSize="18"
                    fontFamily="Space Mono, monospace"
                    fontWeight="normal"
                    textAnchor="middle"
                  >
                    Δp = {dpVal.toFixed(4)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </div>
  );
};
