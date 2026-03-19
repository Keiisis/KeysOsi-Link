'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

const GenealogyTree3D = dynamic(
  () => import('@/components/genealogy/GenealogyTree3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen bg-[#030A18] flex items-center justify-center">
        <div className="text-[#C9A84C] text-center">
          <div className="w-16 h-16 border-4 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-6" />
          <p className="font-serif text-2xl tracking-[0.3em] uppercase animate-pulse">
            Chargement de l&apos;Arbre Sacré...
          </p>
        </div>
      </div>
    ),
  }
)

export default function ArbrePublicPage() {
  const params = useParams()
  const applicationRef = params.ref as string

  return <GenealogyTree3D applicationRef={applicationRef} />
}
