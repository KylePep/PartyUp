import { DiscIcon } from '@phosphor-icons/react'
import { getPlatformColors } from '../../lib/platforms'

interface PlatformIconProps {
  platform: string
}

export function PlatformIcon({ platform }: PlatformIconProps) {
  const { bg, icon } = getPlatformColors(platform)
  return (
    <div
      className="w-full h-full rounded-full border-1 border-black flex items-center justify-center"
      style={{ backgroundColor: bg }}
      aria-label={`${platform} platform`}
      title={platform}
    >
      <DiscIcon weight="fill" color={icon} />
    </div>
  )
}
