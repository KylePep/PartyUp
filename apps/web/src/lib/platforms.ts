const PLATFORM_PALETTE = {
  xbox:        { bg: '#ffffff', icon: '#20d620' },
  playstation: { bg: '#ffffff', icon: '#1d67de' },
  nintendo:    { bg: '#E4000F', icon: '#ffffff' },
  pc:          { bg: '#1a1a2e', icon: '#67E8F9' },
  mobile:      { bg: '#7C3AED', icon: '#ffffff' },
  default:     { bg: '#475569', icon: '#ffffff' },
} as const

type PlatformFamily = keyof typeof PLATFORM_PALETTE

function getPlatformFamily(platform: string): PlatformFamily {
  const p = platform.toLowerCase()
  if (p.includes('xbox') || p.includes('microsoft')) return 'xbox'
  if (p.includes('playstation') || p.startsWith('ps')) return 'playstation'
  if (p.includes('nintendo') || p.includes('switch') || p.includes('wii') || p.includes('3ds')) return 'nintendo'
  if (p === 'pc' || p.includes('mac') || p.includes('linux') || p.includes('steam') || p.includes('windows')) return 'pc'
  if (p.includes('ios') || p.includes('android') || p.includes('mobile') || p.includes('iphone') || p.includes('ipad')) return 'mobile'
  return 'default'
}

export function getPlatformColors(platform: string): { bg: string; icon: string } {
  return PLATFORM_PALETTE[getPlatformFamily(platform)]
}
