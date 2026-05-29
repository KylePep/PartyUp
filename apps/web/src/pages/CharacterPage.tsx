import { CharacterGallery } from '../components/CharacterGallery'
import { BinderLayout } from '../components/layout/BinderLayout'

export default function CharactersPage() {
  return (
    <BinderLayout
      barColor='#991b1b'

      tabs={
        [
          { label: 'My Cards', color: '#991b1b', to: "/characters" },
          { label: 'Games', color: '#1e40af', to: "/games" },
          { label: 'Collection', color: '#166534', to: "/matches" },
        ]}
      leftContent={<h1>Selected Page</h1>}
      rightContent={<CharacterGallery />}
    >

    </BinderLayout>
  )
}
