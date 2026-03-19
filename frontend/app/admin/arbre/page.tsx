import GenealogyTree from "@/components/genealogy/GenealogyTree"

export const metadata = {
  title: "Arbre Généalogique Immersif | Retour Gagnant",
}

export default function ArbrePage() {
  return (
    <div className="w-full h-screen overflow-hidden">
      <GenealogyTree />
    </div>
  )
}
