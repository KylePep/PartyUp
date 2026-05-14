import { MatchGallery } from '../components/MatchGallery'
import { PageLayout } from '../components/layout/PageLayout'

export default function MatchesPage() {
  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-text">Matches</h1>
      </div>
      <MatchGallery />
    </PageLayout>
  )
}
