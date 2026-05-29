import { MatchGallery } from '../components/MatchGallery'
import { BinderLayout } from '../components/layout/BinderLayout'

export default function MatchesPage() {
  return (
    <BinderLayout
      barColor='#166534'

      tabs={
        [
          { label: 'My Cards', color: '#991b1b', to: "/characters" },
          { label: 'Games', color: '#1e40af', to: "/games" },
          { label: 'Collection', color: '#166534', to: "/matches" },
        ]}
      leftContent={<h1>Selected Page</h1>}
      rightContent={<MatchGallery />}
    >

    </BinderLayout>
  )
}
