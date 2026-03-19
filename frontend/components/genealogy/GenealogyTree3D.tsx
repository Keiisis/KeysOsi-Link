'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import {
  OrbitControls,
  Stars,
  Float,
  Text,
  Sparkles,
  useTexture,
} from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, CheckCircle2, Loader2, Sparkles as SparklesIcon } from 'lucide-react'

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */

interface FamilyMember { nom: string }

interface GenealogyData {
  client: { prenom: string; nom: string }
  pere: FamilyMember
  mere: FamilyMember
  gpPaternel: FamilyMember
  gmPaternel: FamilyMember
  gpMaternel: FamilyMember
  gmMaternel: FamilyMember
  documents: { nom: string; url: string }[]
}

const DUMMY: GenealogyData = {
  client: { prenom: 'Kossi', nom: 'Mensah' },
  pere: { nom: 'Akwasi Mensah' },
  mere: { nom: 'Adjoa Osei' },
  gpPaternel: { nom: 'Kwame Mensah' },
  gmPaternel: { nom: 'Ama Serwaa' },
  gpMaternel: { nom: 'Kojo Osei' },
  gmMaternel: { nom: 'Yaa Asantewaa' },
  documents: [
    { nom: 'Acte de Naissance', url: '#' },
    { nom: 'Certificat de Nationalité', url: '#' },
  ],
}

/* ══════════════════════════════════════════════════════════════
   3D: REALISTIC TREE BILLBOARD
══════════════════════════════════════════════════════════════ */

function SacredTree() {
  const texture = useTexture('/images/sacred-tree.png')
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      // Subtlest breathing effect
      const s = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.008
      meshRef.current.scale.set(s, s, 1)
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 1.5, -2]}>
      <planeGeometry args={[12, 12]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.95}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ══════════════════════════════════════════════════════════════
   3D: GOLDEN BRANCH CONNECTIONS
══════════════════════════════════════════════════════════════ */

function GoldenBranch({ start, end, thickness = 0.04 }: {
  start: [number, number, number]
  end: [number, number, number]
  thickness?: number
}) {
  const curve = useMemo(() => {
    const midY = (start[1] + end[1]) / 2
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(
        start[0] + (end[0] - start[0]) * 0.3,
        midY + 0.4,
        start[2] + (end[2] - start[2]) * 0.3
      ),
      new THREE.Vector3(
        start[0] + (end[0] - start[0]) * 0.7,
        midY + 0.2,
        start[2] + (end[2] - start[2]) * 0.7
      ),
      new THREE.Vector3(...end),
    ])
  }, [start, end])

  const geo = useMemo(() => new THREE.TubeGeometry(curve, 20, thickness, 6, false), [curve, thickness])

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color="#C9A84C"
        emissive="#C9A84C"
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.85}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ══════════════════════════════════════════════════════════════
   3D: FAMILY NODE ORB
══════════════════════════════════════════════════════════════ */

function FamilyNode({ position, label, sublabel, color = '#C9A84C', isClient = false }: {
  position: [number, number, number]
  label: string
  sublabel: string
  color?: string
  isClient?: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.4
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.08
    }
    if (glowRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.8) * 0.1
      glowRef.current.scale.setScalar(s)
    }
  })

  const r = isClient ? 0.35 : 0.22

  return (
    <Float speed={1.8} rotationIntensity={0.12} floatIntensity={0.35}>
      <group position={position}>
        {/* Core crystal orb */}
        <mesh
          ref={meshRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={hovered ? 1.3 : 1}
        >
          <icosahedronGeometry args={[r, 2]} />
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 2 : 0.9}
            roughness={0.05}
            metalness={0.95}
            clearcoat={1}
            clearcoatRoughness={0.05}
            toneMapped={false}
          />
        </mesh>

        {/* Aura */}
        <mesh ref={glowRef} scale={isClient ? 2.5 : 1.8}>
          <sphereGeometry args={[r, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={hovered ? 0.2 : 0.06} side={THREE.BackSide} />
        </mesh>

        {/* Orbital ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 1.7, 0.012, 8, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={0.45} toneMapped={false} />
        </mesh>

        {/* Name */}
        <Text
          position={[0, r + 0.35, 0.5]}
          fontSize={isClient ? 0.2 : 0.13}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.2}
          outlineWidth={0.012}
          outlineColor="#000000"
        >
          {label}
        </Text>

        {/* Role */}
        <Text
          position={[0, r + 0.14, 0.5]}
          fontSize={0.085}
          color={color}
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {sublabel}
        </Text>

        {/* Light emanating from node */}
        <pointLight color={color} intensity={isClient ? 5 : 2.5} distance={isClient ? 6 : 3.5} />
      </group>
    </Float>
  )
}

/* ══════════════════════════════════════════════════════════════
   3D: TREASURE CHEST
══════════════════════════════════════════════════════════════ */

function TreasureChest3D({ onClick }: { onClick: () => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const lidRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = -3.2 + Math.sin(state.clock.elapsedTime * 1.2) * 0.05
    }
    if (lidRef.current) {
      const target = hovered ? -0.35 : 0
      lidRef.current.rotation.x = THREE.MathUtils.lerp(lidRef.current.rotation.x, target, 0.06)
    }
  })

  return (
    <group
      ref={groupRef}
      position={[0, -3.2, 1.5]}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.12 : 1}
    >
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.8, 0.4, 0.5]} />
        <meshPhysicalMaterial
          color="#8B6914"
          roughness={0.2}
          metalness={0.95}
          emissive="#C9A84C"
          emissiveIntensity={hovered ? 1 : 0.3}
          clearcoat={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Lid */}
      <group position={[0, 0.2, -0.25]}>
        <mesh ref={lidRef} position={[0, 0.06, 0.25]}>
          <boxGeometry args={[0.82, 0.08, 0.52]} />
          <meshPhysicalMaterial
            color="#A67C2E"
            roughness={0.15}
            metalness={0.97}
            emissive="#E2C97E"
            emissiveIntensity={hovered ? 0.8 : 0.2}
            clearcoat={1}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Lock */}
      <mesh position={[0, 0.05, 0.26]}>
        <boxGeometry args={[0.1, 0.13, 0.04]} />
        <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.03} emissive="#FFD700" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>

      {/* Metal bands */}
      {[-0.25, 0, 0.25].map((x, i) => (
        <mesh key={`b-${i}`} position={[x, 0, 0.251]}>
          <boxGeometry args={[0.02, 0.38, 0.006]} />
          <meshStandardMaterial color="#DAA520" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}

      {/* Glow light */}
      <pointLight position={[0, 0.3, 0]} color="#FFD700" intensity={hovered ? 15 : 5} distance={4} />

      {/* Label */}
      <Text position={[0, 0.65, 0]} fontSize={0.11} color="#FFD700" anchorX="center" anchorY="middle" outlineWidth={0.008} outlineColor="#000000">
        {hovered ? '✦ Ouvrir le Trésor ✦' : '◆ Votre Héritage Sacré ◆'}
      </Text>
    </group>
  )
}

/* ══════════════════════════════════════════════════════════════
   3D: RISING PARTICLES
══════════════════════════════════════════════════════════════ */

function RisingParticles() {
  const count = 120
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.sin(i * 1.7) * 0.5) * 10
      p[i * 3 + 1] = (i / count) * 8 - 4
      p[i * 3 + 2] = (Math.cos(i * 2.3) * 0.5) * 10
    }
    return p
  }, [])

  useFrame(() => {
    if (ref.current) {
      const a = ref.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        a[i * 3 + 1] += 0.005
        if (a[i * 3 + 1] > 5) a[i * 3 + 1] = -4
      }
      ref.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#E2C97E" transparent opacity={0.6} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

/* ══════════════════════════════════════════════════════════════
   3D: GROUND
══════════════════════════════════════════════════════════════ */

function MysticGround() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.6, 0]} receiveShadow>
        <circleGeometry args={[8, 48]} />
        <meshStandardMaterial color="#080E1F" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.59, 0]}>
        <ringGeometry args={[2, 3.5, 48]} />
        <meshStandardMaterial color="#C9A84C" emissive="#C9A84C" emissiveIntensity={0.4} transparent opacity={0.12} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN SCENE
══════════════════════════════════════════════════════════════ */

function GenealogyScene({ data, onOpenChest }: { data: GenealogyData; onOpenChest: () => void }) {
  // Node positions mapped onto the tree's branches
  const pos = useMemo(() => ({
    gpP:  [-3.8, 4.5, 0.5] as [number, number, number],
    gmP:  [-1.8, 5.0, 0.8] as [number, number, number],
    gpM:  [1.8, 5.0, 0.8] as [number, number, number],
    gmM:  [3.8, 4.5, 0.5] as [number, number, number],
    pere: [-2.2, 2.2, 1.2] as [number, number, number],
    mere: [2.2, 2.2, 1.2] as [number, number, number],
    client: [0, -0.5, 2.0] as [number, number, number],
  }), [])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.1} color="#0a0a2a" />
      <directionalLight position={[3, 8, 5]} intensity={0.4} color="#FFF8DC" />
      <pointLight position={[0, 6, 2]} intensity={4} color="#C9A84C" distance={18} decay={2} />
      <pointLight position={[-5, 3, 3]} intensity={1.2} color="#4A90D9" distance={12} decay={2} />
      <pointLight position={[5, 3, -2]} intensity={1.2} color="#8B5CF6" distance={12} decay={2} />
      <pointLight position={[0, -2, 3]} intensity={2} color="#DAA520" distance={8} decay={2} />

      {/* Star field */}
      <Stars radius={100} depth={60} count={3000} factor={3} saturation={0} fade speed={0.8} />

      {/* Sparkles */}
      <Sparkles count={80} scale={14} size={2.5} speed={0.3} color="#C9A84C" opacity={0.35} />
      <RisingParticles />

      {/* Ground */}
      <MysticGround />

      {/* THE REALISTIC SACRED TREE (billboard texture) */}
      <SacredTree />

      {/* ── GOLDEN BRANCH CONNECTIONS ── */}
      <GoldenBranch start={pos.gpP} end={pos.pere} thickness={0.03} />
      <GoldenBranch start={pos.gmP} end={pos.pere} thickness={0.03} />
      <GoldenBranch start={pos.gpM} end={pos.mere} thickness={0.03} />
      <GoldenBranch start={pos.gmM} end={pos.mere} thickness={0.03} />
      <GoldenBranch start={pos.pere} end={pos.client} thickness={0.045} />
      <GoldenBranch start={pos.mere} end={pos.client} thickness={0.045} />
      <GoldenBranch start={pos.client} end={[0, -2.5, 1.5]} thickness={0.06} />

      {/* ── FAMILY NODES ── */}
      <FamilyNode position={pos.gpP} label={data.gpPaternel.nom} sublabel="Grand-Père Pat." color="#6B8FCC" />
      <FamilyNode position={pos.gmP} label={data.gmPaternel.nom} sublabel="Grand-Mère Pat." color="#9B6BCB" />
      <FamilyNode position={pos.gpM} label={data.gpMaternel.nom} sublabel="Grand-Père Mat." color="#CB6B9B" />
      <FamilyNode position={pos.gmM} label={data.gmMaternel.nom} sublabel="Grand-Mère Mat." color="#6BCB9B" />
      <FamilyNode position={pos.pere} label={data.pere.nom} sublabel="Père" color="#5588EE" />
      <FamilyNode position={pos.mere} label={data.mere.nom} sublabel="Mère" color="#EE5588" />
      <FamilyNode
        position={pos.client}
        label={`${data.client.prenom} ${data.client.nom}`}
        sublabel="Vous — Enfant de l'Afrique"
        color="#FFD700"
        isClient
      />

      {/* Treasure Chest */}
      <TreasureChest3D onClick={onOpenChest} />

      {/* Post-processing */}
      <EffectComposer multisampling={4}>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.85} intensity={1.2} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>

      {/* Orbit Controls */}
      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate
        autoRotateSpeed={0.25}
        enableDamping
        dampingFactor={0.04}
        target={[0, 1, 0]}
      />
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN WRAPPER
══════════════════════════════════════════════════════════════ */

export default function GenealogyTree3D({ applicationRef }: { applicationRef?: string }) {
  const [data, setData] = useState<GenealogyData>(DUMMY)
  const [loading, setLoading] = useState(true)
  const [chestOpen, setChestOpen] = useState(false)
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(false)

  useEffect(() => {
    const url = applicationRef
      ? `/api/genealogy/data?ref=${encodeURIComponent(applicationRef)}`
      : '/api/genealogy/data'

    fetch(url)
      .then(r => r.json())
      .then(result => { if (!result.error) setData(result) })
      .catch(err => console.error('[GENEALOGY]', err))
      .finally(() => setLoading(false))
  }, [applicationRef])

  const handleOpenChest = useCallback(async () => {
    setChestOpen(true)
    if (!aiMessage) {
      setLoadingMsg(true)
      try {
        const res = await fetch('/api/genealogy/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const content = await res.json()
        setAiMessage(content.message)
      } catch {
        setAiMessage(`Félicitations ${data.client.prenom}, le pont est désormais reconstruit. Bon retour à la maison.`)
      } finally {
        setLoadingMsg(false)
      }
    }
  }, [aiMessage, data])

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#030A18] flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-[#C9A84C] animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-[#030A18] overflow-hidden" suppressHydrationWarning>

      {/* Title overlay */}
      <div className="absolute top-6 left-0 right-0 z-20 text-center pointer-events-none select-none">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif text-[#E2C97E] uppercase tracking-[0.35em] drop-shadow-[0_0_25px_rgba(201,168,76,0.5)]">
          L&apos;Arbre de Vie
        </h1>
        <p className="text-[#C9A84C]/60 text-[10px] md:text-xs tracking-[0.3em] uppercase mt-3 font-light">
          Explorez votre lignée sacrée en 3D · Cliquez &amp; Tournez
        </p>
      </div>

      {/* THREE.JS CANVAS */}
      <Canvas
        camera={{ position: [0, 2, 12], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#030A18']} />
        <fog attach="fog" args={['#030A18', 16, 40]} />
        <GenealogyScene data={data} onOpenChest={handleOpenChest} />
      </Canvas>

      {/* Bottom hint */}
      <div className="absolute bottom-6 left-0 right-0 z-20 text-center pointer-events-none select-none">
        <p className="text-[#C9A84C]/40 text-[10px] tracking-[0.25em] uppercase animate-pulse">
          ◈ Glissez pour explorer · Cliquez le coffre pour votre héritage ◈
        </p>
      </div>

      {/* ── HERITAGE MODAL ── */}
      <AnimatePresence>
        {chestOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={() => setChestOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 90 }}
              className="relative w-full max-w-5xl h-[85vh] overflow-hidden bg-gradient-to-br from-[#0A1630] to-[#061020] border border-[#C9A84C]/30 rounded-3xl shadow-[0_60px_120px_rgba(201,168,76,0.15)] flex flex-col md:flex-row"
            >
              <button onClick={() => setChestOpen(false)} className="absolute top-5 right-5 z-50 text-[#C9A84C]/60 hover:text-white bg-black/40 p-2.5 rounded-full backdrop-blur-md transition-all border border-[#C9A84C]/20">
                <X className="w-5 h-5" />
              </button>

              {/* AI Message */}
              <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#C9A84C]/15 relative overflow-y-auto">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#C9A84C08,transparent)] pointer-events-none" />
                <h2 className="text-2xl md:text-3xl font-serif text-[#C9A84C] mb-12 text-center uppercase tracking-[0.3em] relative z-10 drop-shadow-[0_0_10px_rgba(201,168,76,0.3)]">
                  La Voix des Ancêtres
                </h2>
                {loadingMsg ? (
                  <div className="flex flex-col items-center gap-6 text-[#C9A84C]/50 relative z-10">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}>
                      <SparklesIcon className="w-12 h-12" />
                    </motion.div>
                    <span className="font-serif tracking-[0.2em] animate-pulse">Les ancêtres murmurent...</span>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative z-10 w-full">
                    <svg className="absolute -top-6 -left-3 w-12 h-12 text-[#C9A84C]/15" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                    <p className="text-[#E2C97E] text-lg md:text-xl font-serif italic text-center leading-[2] font-light px-4 py-8">
                      {aiMessage}
                    </p>
                    <svg className="absolute -bottom-6 -right-3 w-12 h-12 text-[#C9A84C]/15 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                  </motion.div>
                )}
              </div>

              {/* Documents */}
              <div className="w-full md:w-1/2 p-10 md:p-14 bg-[#071228]/80 overflow-y-auto">
                <h3 className="text-xl font-serif text-[#C9A84C] mb-10 tracking-[0.2em] flex items-center gap-3 uppercase font-light border-b border-[#C9A84C]/15 pb-5">
                  <FileText className="w-5 h-5" />
                  Reliques Précieuses
                </h3>
                <div className="flex flex-col gap-4">
                  {data.documents.map((doc, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.12 }} className="group flex items-center gap-4 p-4 rounded-xl border border-[#C9A84C]/20 bg-[#0D1F42]/50 hover:bg-[#C9A84C]/8 hover:border-[#C9A84C]/50 transition-all cursor-pointer">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-[#C9A84C]/15 flex items-center justify-center group-hover:bg-[#C9A84C]/30 transition-all border border-[#C9A84C]/30">
                        <CheckCircle2 className="w-5 h-5 text-[#E2C97E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-serif truncate">{doc.nom}</p>
                        <p className="text-[#C9A84C]/50 text-[10px] tracking-[0.2em] uppercase mt-0.5">Sceau Authentifié</p>
                      </div>
                    </motion.div>
                  ))}
                  {data.documents.length === 0 && (
                    <p className="text-white/30 italic text-center mt-14 font-serif">Aucun document identifié.</p>
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
