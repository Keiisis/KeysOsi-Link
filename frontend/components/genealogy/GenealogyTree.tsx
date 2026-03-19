'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, FileText, CheckCircle2, Loader2 } from 'lucide-react'

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
    { nom: "Certificat de Nationalité", url: "#" }
  ]
}

/* ══════════════════════════════════════════════════════════════
   COMPOSANT ARCHITECTURE
══════════════════════════════════════════════════════════════ */

export default function GenealogyTree() {
  const [chestOpen, setChestOpen] = useState(false)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [data, setData] = useState<GenealogyData>(DUMMY_DATA)
  const [loadingData, setLoadingData] = useState(true)

  // 1. CHERCHER LES VRAIES DONNEES EN BASE
  useEffect(() => {
    fetch('/api/genealogy/data')
        .then(res => res.json())
        .then(result => {
            if (!result.error) {
                setData(result)
            }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingData(false))
  }, [])

  // 2. GENERER LE MOT DE L'IA AU CLIC
  const handleOpenChest = async () => {
    setChestOpen(true)
    if (!aiMessage && data) {
      setLoadingMsg(true)
      try {
          const res = await fetch('/api/genealogy/message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          })
          const content = await res.json()
          setAiMessage(content.message)
      } catch (e) {
          setAiMessage(
            `Félicitations ${data.client.prenom}, vous n'avez pas seulement retrouvé votre histoire, vous l'avez ranimée. 
Le pont est désormais reconstruit. Bon retour à la maison, digne fils de l'Afrique.`
          )
      } finally {
          setLoadingMsg(false)
      }
    }
  }

  // 3. COORDONNÉES SVG ViewBox 1200 x 900
  const nodes = {
    gpp: { x: 200, y: 150, title: "Lignée Paternelle (GP)", name: data.gpPaternel.nom, delay: 0.2 },
    gmp: { x: 450, y: 150, title: "Racine Paternelle (GM)", name: data.gmPaternel.nom, delay: 0.4 },
    gpm: { x: 750, y: 150, title: "Lignée Maternelle (GP)", name: data.gpMaternel.nom, delay: 0.6 },
    gmm: { x: 1000, y: 150, title: "Racine Maternelle (GM)", name: data.gmMaternel.nom, delay: 0.8 },
    pere: { x: 325, y: 400, title: "Père", name: data.pere.nom, delay: 1.5 },
    mere: { x: 875, y: 400, title: "Mère", name: data.mere.nom, delay: 1.7 },
    client: { x: 600, y: 650, title: "Vous", name: `${data.client.prenom} ${data.client.nom}`, delay: 2.5 },
    chest: { x: 600, y: 840, title: "Votre Héritage", delay: 3.5 }
  }

  const NodeBox = ({ x, y, title, name, delay, highlight = false }: { x: number, y: number, title: string, name: string, delay: number, highlight?: boolean }) => (
    <g transform={`translate(${x - 110}, ${y - 45})`}>
      <motion.foreignObject 
        width="220" height="90"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay, duration: 0.8, ease: 'easeOut' }}
      >
        <div className={`w-full h-full flex flex-col items-center justify-center rounded-xl border ${highlight ? 'border-[#C9A84C]/80 shadow-[0_0_30px_#C9A84C30]' : 'border-[#C9A84C]/20 shadow-[0_0_15px_rgba(201,168,76,0.1)]'} bg-[#061838]/90 backdrop-blur-xl relative overflow-hidden`}>
          {highlight && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#C9A84C30,transparent)]" />}
          <span className="text-[#E2C97E]/70 text-[10px] uppercase tracking-[0.2em] mb-1 font-semibold">{title}</span>
          <span className={`text-white font-serif text-center px-2 line-clamp-2 ${highlight ? 'text-xl text-[#C9A84C]' : 'text-md lg:text-lg'}`}>
            {name}
          </span>
        </div>
      </motion.foreignObject>
    </g>
  )

  const AnimatedPath = ({ start, end, delay }: { start: { x: number, y: number }, end: { x: number, y: number }, delay: number }) => {
    const startY = start.y + 45
    const endY = end.y - 45
    const pathD = `M ${start.x},${startY} C ${start.x},${startY + 60} ${end.x},${endY - 60} ${end.x},${endY}`

    return (
      <g>
        <path d={pathD} fill="none" stroke="#C9A84C" strokeWidth="2" strokeOpacity="0.1" />
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

  if (loadingData) {
      return (
          <div className="w-full h-screen bg-[#030A18] flex items-center justify-center text-[#C9A84C]">
              <Loader2 className="w-12 h-12 animate-spin" />
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-[#030A18] relative flex flex-col items-center justify-center py-20 overflow-hidden">
      
      {/* ── FOND IMMERSIF ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0A224A_0%,#030A18_80%)] opacity-90" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />

      {/* Titre de la page */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#E2C97E] uppercase tracking-widest mb-4 filter drop-shadow-[0_0_15px_#C9A84C50]">
          L&apos;Arbre de Vie
        </h1>
        <p className="text-[#C9A84C]/80 tracking-[0.25em] uppercase text-xs md:text-sm font-light">
          La reconnexion sacrée à la terre de vos ancêtres
        </p>
      </motion.div>

      {/* ── CANVAS SVG DE L'ARBRE ── */}
      <div className="relative w-full max-w-6xl aspect-[4/3] md:aspect-[12/9] z-10 hidden md:block mt-8">
        <svg viewBox="0 0 1200 900" className="w-full h-full drop-shadow-2xl">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E2C97E" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#C9A84C" stopOpacity="1" />
              <stop offset="100%" stopColor="#8A6B29" stopOpacity="0.6" />
            </linearGradient>
            <radialGradient id="chestGlow">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* BACKGROUND VRAI LOGO ARBRE RVB (Superposée derrière, très grande) */}
          <motion.image 
            href="/images/logo-transparent.png" 
            x="200" y="50" width="800" height="800" 
            opacity="0.15" 
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none mix-blend-screen"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />

          {/* PATHS (Branches) */}
          <AnimatedPath start={nodes.gpp} end={nodes.pere} delay={1.0} />
          <AnimatedPath start={nodes.gmp} end={nodes.pere} delay={1.2} />
          <AnimatedPath start={nodes.gpm} end={nodes.mere} delay={1.0} />
          <AnimatedPath start={nodes.gmm} end={nodes.mere} delay={1.2} />

          <AnimatedPath start={nodes.pere} end={nodes.client} delay={2.0} />
          <AnimatedPath start={nodes.mere} end={nodes.client} delay={2.2} />

          {/* Lien Client -> Coffre (La racine dorée) */}
          <motion.path
            d={`M ${nodes.client.x},${nodes.client.y + 45} L ${nodes.chest.x},${nodes.chest.y - 60}`}
            fill="none"
            stroke="url(#goldGradient)"
            strokeWidth="5"
            strokeDasharray="8, 8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 3.0, duration: 1.5 }}
          />

          {/* NODES (Boîtes de nom) */}
          <NodeBox {...nodes.gpp} />
          <NodeBox {...nodes.gmp} />
          <NodeBox {...nodes.gpm} />
          <NodeBox {...nodes.gmm} />

          <NodeBox {...nodes.pere} />
          <NodeBox {...nodes.mere} />

          <NodeBox {...nodes.client} highlight={true} />

          {/* LE VRAI COFFRE (Racines) */}
          <g transform={`translate(${nodes.chest.x}, ${nodes.chest.y})`}>
            {/* Lueur pulsante */}
            <motion.circle 
              r="80" fill="url(#chestGlow)"
              animate={{ r: [60, 90, 60], opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
            {/* L'Image Hyperréaliste du coffre générée */}
            <motion.foreignObject 
              x="-60" y="-60" width="120" height="120"
              initial={{ scale: 0, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 3.5, type: 'spring', stiffness: 80 }}
            >
              <button 
                onClick={handleOpenChest}
                className="w-full h-full relative group p-2 cursor-pointer outline-none hover:scale-110 active:scale-95 transition-all duration-300"
              >
                {/* Image Coffre : remplacez l'icon par le vrai coffre */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                    src="/images/treasure-chest.png" 
                    alt="Ouvrir l'héritage" 
                    className="w-full h-full object-contain filter drop-shadow-[0_15px_25px_rgba(201,168,76,0.6)] group-hover:drop-shadow-[0_20px_40px_rgba(201,168,76,0.9)] transition-all"
                />
                
                {/* Info bulle hover */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#061838] border border-[#C9A84C]/50 text-[#C9A84C] text-xs py-1.5 px-3 rounded whitespace-nowrap shadow-xl z-50">
                  Ouvrir l&apos;Héritage Sacré
                </div>
              </button>
            </motion.foreignObject>
          </g>

        </svg>

        {/* VERSION MOBILE */}
        <div className="md:hidden flex flex-col items-center gap-8 w-full max-w-sm mx-auto px-4 mt-10 text-center">
            <p className="text-[#C9A84C] italic text-sm">Veuillez pivoter votre appareil ou utiliser un ordinateur pour visualiser l&apos;Arbre Majestueux interactif.</p>
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
            {/* Overlay sombre */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setChestOpen(false)} />

            {/* Le Parchemin */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="relative w-full max-w-5xl h-[85vh] overflow-hidden bg-[#0A1630] border border-[#C9A84C]/40 rounded-2xl shadow-[0_40px_100px_rgba(201,168,76,0.2)] flex flex-col md:flex-row p-0"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Bouton fermeture */}
              <button 
                onClick={() => setChestOpen(false)}
                className="absolute top-4 right-4 z-50 text-[#C9A84C]/70 hover:text-[#C9A84C] bg-[#030A18]/50 p-2 rounded-full backdrop-blur-md transition-colors border border-[#C9A84C]/20"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Panneau 1 : Le Message des Ancêtres (IA) */}
              <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#C9A84C]/20 relative overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-blend-overlay">
                <div className="absolute inset-0 bg-[#030A18]/90 z-0" /> {/* Pour foncer le papier */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#C9A84C10,transparent)] z-0" />
                
                <h2 className="text-3xl md:text-4xl font-serif text-[#C9A84C] mb-12 text-center uppercase tracking-[0.3em] relative z-10 filter drop-shadow-[0_0_10px_#C9A84C30]">
                  La Voix des Ancêtres
                </h2>

                {loadingMsg ? (
                  <div className="flex flex-col items-center gap-6 text-[#C9A84C]/60 relative z-10">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    >
                      <Sparkles className="w-12 h-12" />
                    </motion.div>
                    <span className="font-serif tracking-widest animate-pulse text-lg">Consultation de la terre...</span>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                    className="relative z-10 w-full"
                  >
                    <svg className="absolute -top-6 -left-8 w-12 h-12 text-[#C9A84C]/20 opacity-60" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                    <p className="text-[#E2C97E] text-xl md:text-2xl font-serif italic text-center leading-loose font-light px-4 py-8">
                      {aiMessage}
                    </p>
                    <svg className="absolute -bottom-10 -right-8 w-12 h-12 text-[#C9A84C]/20 opacity-60 transform rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                  </motion.div>
                )}
              </div>

              {/* Panneau 2 : Documents & Trésors administratifs */}
              <div className="w-full md:w-1/2 p-8 md:p-14 bg-[#0A1A3A] overflow-y-auto">
                <h3 className="text-2xl font-serif text-[#C9A84C] mb-10 tracking-[0.2em] flex items-center justify-center md:justify-start gap-4 uppercase font-light border-b border-[#C9A84C]/20 pb-6">
                  <FileText className="w-7 h-7" />
                  Vos Reliques Précieuses
                </h3>

                <div className="flex flex-col gap-6">
                  {data.documents.map((doc, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.2) }}
                      className="group flex flex-row items-center gap-5 p-5 rounded-xl border border-[#C9A84C]/30 bg-[#112852]/60 hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/60 transition-all cursor-pointer shadow-lg"
                    >
                      <div className="w-14 h-14 shrink-0 rounded-full bg-[#C9A84C]/20 flex items-center justify-center group-hover:bg-[#C9A84C]/40 transition-colors border border-[#C9A84C]/40 shadow-[0_0_15px_rgba(201,168,76,0.2)] overflow-hidden">
                        <CheckCircle2 className="w-7 h-7 text-[#E2C97E]" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-white font-serif text-lg md:text-xl truncate">{doc.nom}</p>
                        <p className="text-[#C9A84C]/70 text-[11px] tracking-widest uppercase mt-1">Sceau Approuvé / Authentifié</p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {data.documents.length === 0 && (
                     <p className="text-white/40 italic text-center mt-12 text-lg">Aucun document chargé ou identifié.</p>
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

