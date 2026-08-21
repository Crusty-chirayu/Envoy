import React from 'react'

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

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_0_8px_rgba(99,102,241,0.2)]"
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
          d="M 22 75 C 30 75, 34 68, 42 62"
          stroke="url(#circ-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="75" r="5" fill="url(#circ-grad)" />
        
        <path
          d="M 32 82 C 40 82, 45 76, 50 68"
          stroke="url(#circ-grad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="82" r="5" fill="url(#circ-grad)" />

        {/* Paper Airplane Body (wireframe) */}
        <path
          d="M 82 25 L 35 48 L 58 80 L 82 25 Z"
          fill="none"
          stroke="url(#plane-grad)"
          strokeWidth="4.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Inner folds */}
        <path
          d="M 82 25 L 48 58"
          fill="none"
          stroke="url(#plane-grad)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M 35 48 L 48 58 L 58 80"
          fill="none"
          stroke="url(#plane-grad)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-sans font-extrabold tracking-[0.2em] text-[#f2f2f7] ${sizeMap[textSize]}`}>
            ENVOY
          </span>
          <span className="text-[9px] tracking-[0.15em] text-[#5c5c7a] font-semibold uppercase">
            Build. Showcase. Get Noticed.
          </span>
        </div>
      )}
    </div>
  )
}
