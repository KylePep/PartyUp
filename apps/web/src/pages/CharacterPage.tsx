import { CharacterGallery } from '../components/CharacterGallery'
import { PageLayout } from '../components/layout/PageLayout'

export default function CharactersPage() {
  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-text">Characters</h1>
      </div>
      <CharacterGallery />
    </PageLayout>
  )
}
