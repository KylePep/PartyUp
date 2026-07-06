import type { Character } from '../../api/endpoints/characters'

export const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile']

export const ALL_PLATFORMS: { group: string; platforms: string[] }[] = [
  { group: 'PC / Desktop', platforms: ['PC', 'macOS', 'Linux', 'Steam Deck'] },
  { group: 'Xbox', platforms: ['Xbox One', 'Xbox One S', 'Xbox One X', 'Xbox Series S', 'Xbox Series X'] },
  { group: 'PlayStation', platforms: ['PlayStation 4', 'PlayStation 4 Pro', 'PlayStation 5', 'PlayStation 5 Pro'] },
  { group: 'Nintendo', platforms: ['Nintendo Switch', 'Nintendo Switch Lite', 'Nintendo Switch OLED'] },
  { group: 'Mobile', platforms: ['iOS', 'Android'] },
]

export const ALL_PLATFORM_VALUES = ALL_PLATFORMS.flatMap(g => g.platforms)
export const TIME_ZONES = ['NA East', 'NA Central', 'NA West', 'EU West', 'EU East', 'Brazil', 'Asia Pacific', 'Japan / Korea', 'Oceania']
export const ACTIVE_TIMES = ['Morning', 'Afternoon', 'Evening', 'Late Night']
export const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Russian']

export interface CharacterFormData {
  platform: string
  platformHandle: string
  name: string
  imageUrl: string
  imageFile: File | null
  bio: string
  additionalNotes: string
  timeZone: string
  activeTimes: string[]
  usesVoiceChat: boolean | undefined
  languages: string[]
  gameFields: Record<string, string>
  cardBackgroundColor: string
  imageFocalX: number
  imageFocalY: number
}

export const defaultFormData: CharacterFormData = {
  platform: '',
  platformHandle: '',
  name: '',
  imageUrl: '',
  imageFile: null,
  bio: '',
  additionalNotes: '',
  timeZone: '',
  activeTimes: [],
  usesVoiceChat: undefined,
  languages: [],
  gameFields: {},
  cardBackgroundColor: '',
  imageFocalX: 50,
  imageFocalY: 50,
}

export function characterToFormData(c: Character): Partial<CharacterFormData> {
  return {
    platform: c.platform ?? '',
    platformHandle: c.platformHandle ?? '',
    name: c.name ?? '',
    imageUrl: c.imageUrl ?? '',
    imageFile: null,
    bio: c.bio ?? '',
    additionalNotes: c.additionalNotes ?? '',
    timeZone: c.timeZone ?? '',
    activeTimes: c.activeTimes ?? [],
    usesVoiceChat: c.usesVoiceChat,
    languages: c.languages ?? [],
    gameFields: Object.fromEntries((c.gameFields ?? []).map(f => [f.fieldDefinitionId, f.value])),
    cardBackgroundColor: c.cardBackgroundColor ?? '',
    imageFocalX: c.imageFocalX ?? 50,
    imageFocalY: c.imageFocalY ?? 50,
  }
}
