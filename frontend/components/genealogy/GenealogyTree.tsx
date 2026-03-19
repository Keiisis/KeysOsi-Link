'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, FileText, CheckCircle2 } from 'lucide-react'

/* ══════════════════════════════════════════════════════════════
   TYPES & DATA
══════════════════════════════════════════════════════════════ */

export interface GenealogyData {
  client: { prenom: string; nom: string }
  pere: { nom: string }
  mere: { nom: string }
  gpPaternel: { nom: string }
  gmPaternel: { nom: string }
  gpMaternel: { nom: string }
  gmMaternel: { nom: string }
  documents: { nom: string; url: string }[]
}

const DUMMY_DATA: GenealogyData = {
  client: { prenom: "Kossi", nom: "Mensah" },
  pere: { nom: "Akwasi Mensah" },
  mere: { nom: "Adjoa Osei" },
  gpPaternel: { nom: "Kwame Mensah" },
  gmPaternel: { nom: "Ama Serwaa" },
  gpMaternel: { nom: "Kojo Osei" },
  gmMaternel: { nom: "Yaa Asantewaa" },
  documents: [
    { nom: "Acte de Naissance (Aïeul)", url: "#" },
    { nom: "Certificat de Nationalité", url: "#" },
    { nom: "Décret d'Approbation", url: "#" },
  ]
}

/* ══════════════════════════════════════════════════════════════
   COMPOSANT ARCHITECTURE
══════════════════════════════════════════════════════════════ */

export default function GenealogyTree({ data = DUMMY_DATA }: { data?: GenealogyData }) {
  const [chestOpen, setChestOpen] = useState(false)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(false)

  // Simulation d'un appel IA pour générer le mot
  const handleOpenChest = () => {
    setChestOpen(true)
    if (!aiMessage) {
      setLoadingMsg(true)
      setTimeout(() => {
        setAiMessage(
            `Félicitations ${data.client.prenom}, vous n'avez pas seulement retrouvé votre histoire, vous l'avez ranimée. 
Le sang de la famille Mensah et Osei pulse avec la terre béninoise. Vos ancêtres, depuis ${data.gmPaternel.nom} jusqu'à ${data.pere.nom}, vous accueillent. 

Le pont est désormais reconstruit. Bon retour à la maison, digne fils de l'Afrique.`
        )
        setLoadingMsg(false)
      }, 2000)
    }
  }

  /*
   * COORDONNÉES SVG
   * ViewBox 1200 x 900
   */
  const nodes = {
    // Grands-parents (Niveau 1 : y = 150)
    gpp: { x: 200, y: 150, title: "Grand-Père Paternel", name: data.gpPaternel.nom, delay: 0.2 },
    gmp: { x: 450, y: 150, title: "Grand-Mère Paternelle", name: data.gmPaternel.nom, delay: 0.4 },
    gpm: { x: 750, y: 150, title: "Grand-Père Maternel", name: data.gpMaternel.nom, delay: 0.6 },
    gmm: { x: 1000, y: 150, title: "Grand-Mère Maternelle", name: data.gmMaternel.nom, delay: 0.8 },
    // Parents (Niveau 2 : y = 400)
    pere: { x: 325, y: 400, title: "Père", name: data.pere.nom, delay: 1.5 },
    mere: { x: 875, y: 400, title: "Mère", name: data.mere.nom, delay: 1.7 },
    // Client (Niveau 3 : y = 650)
    client: { x: 600, y: 650, title: "Vous", name: `${data.client.prenom} ${data.client.nom}`, delay: 2.5 },
    // Coffre (Niveau 4 : y = 820)
    chest: { x: 600, y: 840, title: "Votre Héritage", delay: 3.5 }
  }

  const NodeBox = ({ x, y, title, name, delay, highlight = false }: any) => (
    <g transform={`translate(${x - 110}, ${y - 45})`}>
      <motion.foreignObject 
        width="220" height="90"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay, duration: 0.8, ease: 'easeOut' }}
      >
        <div className={`w-full h-full flex flex-col items-center justify-center rounded-xl border ${highlight ? 'border-[#C9A84C]' : 'border-[#C9A84C]/30'} bg-[#061838]/80 backdrop-blur-md relative overflow-hidden shadow-[0_0_20px_rgba(201,168,76,0.15)]`}>
          {highlight && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#C9A84C30,transparent)]" />}
          <span className="text-[#E2C97E]/70 text-[10px] uppercase tracking-[0.2em] mb-1 font-semibold">{title}</span>
          <span className={`text-white font-serif text-center px-2 ${highlight ? 'text-xl text-[#C9A84C]' : 'text-lg'}`}>
            {name}
          </span>
        </div>
      </motion.foreignObject>
    </g>
  )

  const AnimatedPath = ({ start, end, delay }: { start: any, end: any, delay: number }) => {
    // Calcul de la courbe de Bézier (verticale fluide)
    const startY = start.y + 45
    const endY = end.y - 45
    const pathD = `M ${start.x},${startY} C ${start.x},${startY + 60} ${end.x},${endY - 60} ${end.x},${endY}`

    return (
      <g>
        {/* Trace fantôme statique */}
        <path d={pathD} fill="none" stroke="#C9A84C" strokeWidth="2" strokeOpacity="0.1" />
        {/* Trace animée incandescente */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay, duration: 1.5, ease: "easeInOut" }}
        />
      </g>
    )
  }

  return (
    <div className="min-h-screen bg-[#030A18] relative flex flex-col items-center justify-center py-20 overflow-hidden">
      
      {/* ── FOND IMMERSIF ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0A224A_0%,#030A18_70%)] opacity-80" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />

      {/* Titre de la page */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#E2C97E] uppercase tracking-widest mb-4">
          L'Arbre de Vie
        </h1>
        <p className="text-[#C9A84C]/70 tracking-[0.2em] uppercase text-sm">
          La reconnexion sacrée à la terre béninoise
        </p>
      </motion.div>

      {/* ── CANVAS SVG DE L'ARBRE ── */}
      <div className="relative w-full max-w-5xl aspect-[4/3] md:aspect-[12/9] z-10 hidden md:block">
        <svg viewBox="0 0 1200 900" className="w-full h-full drop-shadow-2xl">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E2C97E" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#C9A84C" stopOpacity="1" />
              <stop offset="100%" stopColor="#8A6B29" stopOpacity="0.6" />
            </linearGradient>
            <radialGradient id="chestGlow">
              <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* PATHS (Branches) */}
          <AnimatedPath start={nodes.gpp} end={nodes.pere} delay={1.0} />
          <AnimatedPath start={nodes.gmp} end={nodes.pere} delay={1.2} />
          <AnimatedPath start={nodes.gpm} end={nodes.mere} delay={1.0} />
          <AnimatedPath start={nodes.gmm} end={nodes.mere} delay={1.2} />

          <AnimatedPath start={nodes.pere} end={nodes.client} delay={2.0} />
          <AnimatedPath start={nodes.mere} end={nodes.client} delay={2.2} />

          {/* Lien Client -> Coffre (Racines profondes) */}
          <motion.path
            d={`M ${nodes.client.x},${nodes.client.y + 45} L ${nodes.chest.x},${nodes.chest.y - 40}`}
            fill="none"
            stroke="url(#goldGradient)"
            strokeWidth="4"
            strokeDasharray="5, 5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 3.0, duration: 1 }}
          />

          {/* NODES (Nœuds HTML encapsulés) */}
          <NodeBox {...nodes.gpp} />
          <NodeBox {...nodes.gmp} />
          <NodeBox {...nodes.gpm} />
          <NodeBox {...nodes.gmm} />

          <NodeBox {...nodes.pere} />
          <NodeBox {...nodes.mere} />

          <NodeBox {...nodes.client} highlight={true} />

          {/* COFFRE (Racines) */}
          <g transform={`translate(${nodes.chest.x}, ${nodes.chest.y})`}>
            {/* Lueur pulsante derrière le coffre */}
            <motion.circle 
              r="60" fill="url(#chestGlow)"
              animate={{ r: [50, 70, 50], opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            {/* Icone / Bouton interagissable */}
            <motion.foreignObject 
              x="-40" y="-40" width="80" height="80"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 3.5, type: 'spring' }}
            >
              <button 
                onClick={handleOpenChest}
                className="w-full h-full flex items-center justify-center bg-[#11264E] border-2 border-[#C9A84C] rounded-2xl shadow-[0_0_30px_#C9A84C50] hover:scale-110 active:scale-95 transition-transform cursor-pointer relative group"
              >
                <Sparkles className="text-[#C9A84C] w-8 h-8 group-hover:animate-spin-slow" />
                {/* Info bulle hover */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[#061838] border border-[#C9A84C]/50 text-[#C9A84C] text-xs py-1 px-3 rounded whitespace-nowrap shadow-lg">
                  Ouvrir l'Héritage
                </div>
              </button>
            </motion.foreignObject>
          </g>

        </svg>

        {/* VERSION MOBILE (Fallback simplifié) */}
        <div className="md:hidden flex flex-col items-center gap-8 w-full max-w-sm mx-auto px-4 mt-10 text-center">
            <p className="text-[#C9A84C] italic text-sm">Veuillez pivoter votre appareil ou utiliser un ordinateur pour visualiser l'Arbre Majestueux interactif.</p>
            <button 
                onClick={handleOpenChest}
                className="py-4 px-8 bg-[#C9A84C] text-[#030A18] font-bold rounded-lg shadow-[0_0_20px_#C9A84C50] flex items-center gap-3 w-full justify-center"
            >
                <Sparkles />
                Ouvrir mon Héritage
            </button>
        </div>
      </div>

      {/* ── MODALE COFFRE AU TRÉSOR (HÉRITAGE) ── */}
      <AnimatePresence>
        {chestOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10"
          >
            {/* Overlay sombre et flou */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setChestOpen(false)} />

            {/* Le Parchemin / Contenu */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0A1630] border-2 border-[#C9A84C]/50 rounded-2xl shadow-[0_40px_100px_rgba(201,168,76,0.15)] flex flex-col md:flex-row p-0"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Bouton fermeture */}
              <button 
                onClick={() => setChestOpen(false)}
                className="absolute top-4 right-4 z-20 text-[#C9A84C]/70 hover:text-[#C9A84C] bg-[#030A18]/50 p-2 rounded-full backdrop-blur transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Panneau 1 : Le Message des Ancêtres (IA) */}
              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#C9A84C]/20 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#C9A84C10,transparent)]" />
                <h2 className="text-3xl font-serif text-[#C9A84C] mb-8 text-center uppercase tracking-widest">
                  La Voix des Ancêtres
                </h2>

                {loadingMsg ? (
                  <div className="flex flex-col items-center gap-4 text-[#C9A84C]/60">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    >
                      <Sparkles className="w-10 h-10" />
                    </motion.div>
                    <span className="font-serif tracking-widest animate-pulse">Consultation de la terre...</span>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="relative"
                  >
                    <svg className="absolute -top-4 -left-6 w-8 h-8 text-[#C9A84C]/30 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                    <p className="text-[#E2C97E]/90 text-lg md:text-xl font-serif italic text-center leading-relaxed">
                      {aiMessage}
                    </p>
                    <svg className="absolute -bottom-8 -right-6 w-8 h-8 text-[#C9A84C]/30 opacity-50 transform rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                  </motion.div>
                )}
              </div>

              {/* Panneau 2 : Documents & Trésors administratifs */}
              <div className="w-full md:w-1/2 p-8 md:p-12 bg-[#061838]">
                <h3 className="text-xl md:text-2xl font-serif text-[#C9A84C] mb-8 tracking-wider flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  Vos Reliques Précieuses
                </h3>

                <div className="flex flex-col gap-4">
                  {data.documents.map((doc, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.2) }}
                      className="group flex items-center gap-4 p-4 rounded-xl border border-[#C9A84C]/20 bg-[#11264E]/50 hover:bg-[#C9A84C]/10 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#C9A84C]/20 flex items-center justify-center group-hover:bg-[#C9A84C]/40 transition-colors border border-[#C9A84C]/30">
                        <CheckCircle2 className="w-6 h-6 text-[#E2C97E]" />
                      </div>
                      <div>
                        <p className="text-white font-serif">{doc.nom}</p>
                        <p className="text-[#C9A84C]/60 text-xs tracking-wider uppercase">Document validé</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {data.documents.length === 0 && (
                     <p className="text-white/50 italic text-center mt-10">Aucun document chargé pour le moment.</p>
                  )}
                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
