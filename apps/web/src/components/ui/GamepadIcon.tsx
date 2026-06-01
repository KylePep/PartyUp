interface GamepadIconProps {
  color: string
  size?: number
}

// Width-driven — height is proportional to the 22:12 aspect ratio.
export function GamepadIcon({ color, size = 22 }: GamepadIconProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * (12 / 22))}
      viewBox="0 0 22 12"
      fill="none"
      aria-hidden="true"
    >
      {/* Controller body */}
      <rect x="0" y="0" width="22" height="12" rx="6" fill={color} />
      {/* D-pad horizontal */}
      <rect x="2.5" y="5.25" width="5" height="1.5" rx="0.5" fill="#ffffff" fillOpacity="0.3" />
      {/* D-pad vertical */}
      <rect x="4.25" y="3.5" width="1.5" height="5" rx="0.5" fill="#ffffff" fillOpacity="0.3" />
      {/* Face buttons — diamond */}
      <circle cx="16.5" cy="3.5" r="1.1" fill="#ffffff" fillOpacity="0.3" />
      <circle cx="18.5" cy="5.5" r="1.1" fill="#ffffff" fillOpacity="0.3" />
      <circle cx="16.5" cy="7.5" r="1.1" fill="#ffffff" fillOpacity="0.3" />
      <circle cx="14.5" cy="5.5" r="1.1" fill="#ffffff" fillOpacity="0.3" />
      {/* Center buttons */}
      <circle cx="9.5" cy="6" r="0.7" fill="#ffffff" fillOpacity="0.2" />
      <circle cx="12.5" cy="6" r="0.7" fill="#ffffff" fillOpacity="0.2" />
    </svg>
  )
}
