import React, { useEffect, useRef, useState } from 'react'

interface LogoProps {
  className?: string
  showText?: boolean
  textSize?: 'sm' | 'md' | 'lg' | 'xl'
  iconSize?: number
}

export function Logo({ className = '', showText = true, textSize = 'md', iconSize = 40 }: LogoProps) {
  const sizeMap = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  }

  const [mounted, setMounted] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Trigger the entrance/draw-in animation on mount.
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      ref={rootRef}
      className={`envoy-logo-root group flex items-center gap-3 select-none ${mounted ? 'is-mounted' : ''} ${className}`}
    >
      <style>{`
        .envoy-logo-root {
          --envoy-blue: #3b82f6;
          --envoy-cyan: #00d4ff;
          --envoy-orange: #f97316;
          --envoy-peach: #fdba74;
        }

        /* ---------- Icon wrapper ---------- */
        .envoy-logo-icon-wrap {
          position: relative;
          display: inline-flex;
          line-height: 0;
          transform: translateZ(0);
        }

        .envoy-logo-svg {
          overflow: visible;
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.2));
          transition: filter 320ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .envoy-logo-root:hover .envoy-logo-svg,
        .envoy-logo-root:focus-within .envoy-logo-svg {
          filter: drop-shadow(0 0 14px rgba(59, 130, 246, 0.38))
                  drop-shadow(0 0 26px rgba(0, 212, 255, 0.18));
        }

        /* Continuous gentle "flight" motion for the plane group */
        .envoy-plane-group {
          transform-origin: 58px 52px;
          animation: envoy-fly 4.8s ease-in-out infinite;
        }

        @keyframes envoy-fly {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          25%  { transform: translate(1.4px, -2px) rotate(0.6deg); }
          50%  { transform: translate(0px, -3.2px) rotate(0deg); }
          75%  { transform: translate(-1.2px, -1px) rotate(-0.6deg); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }

        .envoy-logo-root:hover .envoy-plane-group,
        .envoy-logo-root:focus-within .envoy-plane-group {
          animation-duration: 1.6s;
        }

        /* Draw-in entrance for the wireframe plane */
        .envoy-draw-path {
          stroke-dasharray: 260;
          stroke-dashoffset: 260;
          opacity: 0;
          transition: opacity 200ms ease-out;
        }

        .envoy-logo-root.is-mounted .envoy-draw-path {
          opacity: 1;
          animation: envoy-draw 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .envoy-logo-root.is-mounted .envoy-draw-path.envoy-delay-1 { animation-delay: 90ms; }
        .envoy-logo-root.is-mounted .envoy-draw-path.envoy-delay-2 { animation-delay: 180ms; }

        @keyframes envoy-draw {
          to { stroke-dashoffset: 0; }
        }

        /* Circuit trail: draw-in + subtle pulse traveling along the line */
        .envoy-circuit-path {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          opacity: 0;
        }

        .envoy-logo-root.is-mounted .envoy-circuit-path {
          opacity: 1;
          animation: envoy-draw-circuit 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .envoy-logo-root.is-mounted .envoy-circuit-path.envoy-delay-1 { animation-delay: 260ms; }
        .envoy-logo-root.is-mounted .envoy-circuit-path.envoy-delay-2 { animation-delay: 340ms; }

        @keyframes envoy-draw-circuit {
          to { stroke-dashoffset: 0; }
        }

        .envoy-circuit-dot {
          opacity: 0;
          transform: scale(0.4);
          transform-box: fill-box;
          transform-origin: center;
        }

        .envoy-logo-root.is-mounted .envoy-circuit-dot {
          animation: envoy-dot-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .envoy-logo-root.is-mounted .envoy-circuit-dot.envoy-delay-1 { animation-delay: 620ms; }
        .envoy-logo-root.is-mounted .envoy-circuit-dot.envoy-delay-2 { animation-delay: 700ms; }

        @keyframes envoy-dot-in {
          to { opacity: 1; transform: scale(1); }
        }

        /* ---------- Wordmark ---------- */
        .envoy-wordmark {
          display: flex;
          flex-direction: column;
        }

        .envoy-title {
          opacity: 0;
          transform: translateX(-6px);
        }

        .envoy-logo-root.is-mounted .envoy-title {
          animation: envoy-slide-in 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 160ms;
        }

        .envoy-tagline {
          opacity: 0;
          transform: translateX(-6px);
        }

        .envoy-logo-root.is-mounted .envoy-tagline {
          animation: envoy-slide-in 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 260ms;
        }

        @keyframes envoy-slide-in {
          to { opacity: 1; transform: translateX(0); }
        }

        .envoy-logo-root:hover .envoy-title,
        .envoy-logo-root:focus-within .envoy-title {
          letter-spacing: 0.24em;
        }

        .envoy-title {
          transition: letter-spacing 320ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* ---------- Accessibility: respect reduced motion ---------- */
        @media (prefers-reduced-motion: reduce) {
          .envoy-plane-group {
            animation: none !important;
            transform: none !important;
          }
          .envoy-draw-path,
          .envoy-circuit-path {
            animation: none !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
            opacity: 1 !important;
          }
          .envoy-circuit-dot {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .envoy-title,
          .envoy-tagline {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .envoy-logo-root:hover .envoy-title,
          .envoy-logo-root:focus-within .envoy-title {
            letter-spacing: 0.2em;
          }
        }
      `}</style>

      <span className="envoy-logo-icon-wrap">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="envoy-logo-svg"
          role="img"
          aria-label="Envoy logo"
        >
          <defs>
            <linearGradient id="plane-grad" x1="30" y1="20" x2="80" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#00d4ff" />
            </linearGradient>
            <linearGradient id="circ-grad" x1="10" y1="50" x2="50" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
          </defs>

          {/* Tail Connection Circuits */}
          <path
            className="envoy-circuit-path envoy-delay-1"
            d="M 22 75 C 30 75, 34 68, 42 62"
            stroke="url(#circ-grad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle className="envoy-circuit-dot envoy-delay-1" cx="22" cy="75" r="5" fill="url(#circ-grad)" />

          <path
            className="envoy-circuit-path envoy-delay-2"
            d="M 32 82 C 40 82, 45 76, 50 68"
            stroke="url(#circ-grad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle className="envoy-circuit-dot envoy-delay-2" cx="32" cy="82" r="5" fill="url(#circ-grad)" />

          {/* Paper Airplane Body (wireframe) — animated as one group so it "flies" as a unit */}
          <g className="envoy-plane-group">
            <path
              className="envoy-draw-path"
              d="M 82 25 L 35 48 L 58 80 L 82 25 Z"
              fill="none"
              stroke="url(#plane-grad)"
              strokeWidth="4.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Inner folds */}
            <path
              className="envoy-draw-path envoy-delay-1"
              d="M 82 25 L 48 58"
              fill="none"
              stroke="url(#plane-grad)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              className="envoy-draw-path envoy-delay-2"
              d="M 35 48 L 48 58 L 58 80"
              fill="none"
              stroke="url(#plane-grad)"
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </span>

      {showText && (
        <div className="envoy-wordmark">
          <span className={`envoy-title font-sans font-extrabold tracking-[0.2em] text-[#f2f2f7] ${sizeMap[textSize]}`}>
            ENVOY
          </span>
          <span className="envoy-tagline text-[9px] tracking-[0.15em] text-[#5c5c7a] font-semibold uppercase">
            Build. Showcase. Get Noticed.
          </span>
        </div>
      )}
    </div>
  )
}