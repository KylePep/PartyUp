import { GameControllerIcon } from '@phosphor-icons/react'
import { getPlatformColors } from '../../lib/platforms'

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
      <GameControllerIcon size={28} weight="fill" color={icon} />
    </div>
  )
}
