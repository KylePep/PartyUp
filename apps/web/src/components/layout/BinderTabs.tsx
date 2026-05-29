export type BinderTabDef = {
  label: string
  color: string
  active?: boolean
  onClick: () => void
}

interface BinderTabsProps {
  tabs: BinderTabDef[]
}

export function BinderTabs({ tabs }: BinderTabsProps) {
  return (
    <section className="flex rotate-90 origin-bottom-right absolute right-0 top-3/4 gap-12 z-10">
      {tabs.map(tab => (
        <button
          key={tab.label}
          onClick={tab.onClick}
          className="w-32 rounded-t border-white border-b-2 py-1 text-xs font-mono text-white uppercase tracking-widest"
          style={{ backgroundColor: tab.color }}
        >
          {tab.label}
        </button>
      ))}
    </section>
  )
}

// <section className='flex rotate-90 origin-bottom-right absolute right-0 top-3/4 gap-12'>
//   <button className='bg-red-800 w-32 rounded-t border-white border-b-2'>
//     tab 1
//   </button>
//   <button className='bg-blue-800 w-32 rounded-t border-white border-b-2'>
//     tab 2
//   </button>
//   <button className='bg-green-800 w-32 rounded-t border-white border-b-2'>
//     tab 3
//   </button>
// </section>

