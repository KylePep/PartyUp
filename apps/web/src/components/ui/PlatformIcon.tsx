import { getPlatformColors } from '../../lib/platforms'
import { GamepadIcon } from './GamepadIcon'

interface PlatformIconProps {
  platform: string
  size?: number
}

export function PlatformIcon({ platform, size = 28 }: PlatformIconProps) {
  const { bg, icon } = getPlatformColors(platform)
  return (
    <div
      className="rounded-full border-1 border-black flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: bg }}
      aria-label={`${platform} platform`}
      title={platform}
    >
      <GamepadIcon color={icon} size={Math.round(size * 0.62)} />
    </div>
  )
}
