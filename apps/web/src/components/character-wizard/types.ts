export const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile']
export const ROLES = ['Tank', 'DPS', 'Support', 'Healer', 'Assassin', 'Marksman', 'Flex']
export const PREFERRED_MODES = ['Ranked', 'Casual', 'Co-op', 'Story', 'PvP', 'PvE', 'Battle Royale']
export const PLAYSTYLES = ['Casual', 'Competitive', 'Hybrid', 'Hardcore', 'Story-focused']
export const RANKS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Legend', 'Mythic']
export const REGIONS = ['NA East', 'NA West', 'EU', 'Asia', 'OCE', 'SA', 'Global']
export const ACTIVE_TIMES = ['Morning', 'Afternoon', 'Evening', 'Late Night']
export const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Russian']

export interface CharacterFormData {
  platform: string
  platformHandle: string
  name: string
  imageUrl: string
  imageFile: File | null
  bio: string
  mainRole: string
  secondaryRole: string
  preferredModes: string[]
  playstyle: string
  rank: string
  region: string
  timeZone: string
  activeTimes: string[]
  usesVoiceChat: boolean | undefined
  languages: string[]
  gameFields: Record<string, string>
}

export const defaultFormData: CharacterFormData = {
  platform: '',
  platformHandle: '',
  name: '',
  imageUrl: '',
  imageFile: null,
  bio: '',
  mainRole: '',
  secondaryRole: '',
  preferredModes: [],
  playstyle: '',
  rank: '',
  region: '',
  timeZone: '',
  activeTimes: [],
  usesVoiceChat: undefined,
  languages: [],
  gameFields: {},
}
