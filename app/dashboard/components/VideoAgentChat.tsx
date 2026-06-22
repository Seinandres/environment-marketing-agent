'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import {
  Loader2, RefreshCw, X, Play, ChevronRight,
  Volume2, Hash, Sparkles, CheckCircle2, AlertCircle,
  Download, FileVideo, RotateCcw, Zap,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────

const LOADING_MSGS = [
  'Pensando en el ángulo correcto...',
  'Revisando qué le duele al cliente...',
  'Armando las escenas...',
  'Eligiendo las palabras exactas...',
]

const PLACEHOLDERS = [
  'Ej: video para AgroShield mostrando cómo detecta un robo de noche en el pivote',
  'Ej: reel de MachineInsight para dueños de flotas que no saben cuánto trabaja su tractor',
  'Ej: spot de ProcessLink en industria de carwash automatizado, sin datos en tiempo real',
  'Ej: video de AssetGuard para empresa con generadores que desaparecen en faena',
]

const QUICK_CHIPS: { label: string; instruction: string }[] = [
  { label: 'Hazlo más corto',     instruction: 'hazlo más corto, máximo 3 escenas, al grano' },
  { label: 'Más urgente',         instruction: 'hazlo más urgente, con más FOMO y sentido de riesgo' },
  { label: 'Cambia el gancho',    instruction: 'cambia completamente el gancho de apertura, que sea disruptivo' },
  { label: 'Prueba otro ángulo',  instruction: 'prueba un ángulo totalmente diferente para el mismo producto' },
]

// ── Types ──────────────────────────────────────────────────────────────────

interface VideoScene {
  text: string
  subtext?: string
  durationSec: number
  style: 'hook' | 'problem' | 'solution' | 'feature' | 'cta'
}

interface VideoProps {
  product: string
  productColor: string
  headline: string
  scenes: VideoScene[]
  voiceover: string
  caption: string
  hashtags: string[]
}

interface ArtifactInfo {
  id: number
  name: string
  sizeMB: string
}

type Status =
  | 'idle'
  | 'generating'
  | 'ready'
  | 'rendering'
  | 'dispatched'
  | 'render_complete'
  | 'render_failed'
  | 'error'

const PRODUCTS = [
  { id: 'AGROSHIELD',     label: 'AgroShield',     color: '#10B981' },
  { id: 'MACHINEINSIGHT', label: 'MachineInsight',  color: '#3B82F6' },
  { id: 'PROCESSLINK',    label: 'ProcessLink',     color: '#8B5CF6' },
  { id: 'ASSETGUARD',     label: 'AssetGuard',      color: '#F59E0B' },
]

const STYLE_META: Record<VideoScene['style'], { label: string; bg: string; text: string }> = {
  hook:     { label: 'HOOK',     bg: 'rgba(239,68,68,0.15)',   text: '#F87171' },
  problem:  { label: 'PROBLEMA', bg: 'rgba(249,115,22,0.15)',  text: '#FB923C' },
  solution: { label: 'SOLUCIÓN', bg: 'rgba(16,185,129,0.15)',  text: '#34D399' },
  feature:  { label: 'FEATURE',  bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' },
  cta:      { label: 'CTA',      bg: 'rgba(139,92,246,0.15)',  text: '#A78BFA' },
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Block reveal animation: each section fades + slides in based on its index
function B(idx: number, visible: number): React.CSSProperties {
  const shown = visible > idx
  return {
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0)' : 'translateY(7px)',
    transition: 'opacity 0.32s ease, transform 0.32s ease',
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function VideoAgentChat() {
  const [topic, setTopic]           = useState('')
  const [product, setProduct]       = useState<string | null>(null)
  const [status, setStatus]         = useState<Status>('idle')
  const [props, setProps]           = useState<VideoProps | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [lastTopic, setLastTopic]   = useState('')
  const [runId, setRunId]           = useState<string | null>(null)
  const [artifact, setArtifact]     = useState<ArtifactInfo | null>(null)
  // UX state
  const [visibleBlocks, setVisibleBlocks] = useState(0)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [btnPressing, setBtnPressing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Polling for render status ──────────────────────────────────────────

  useEffect(() => {
    if (status !== 'dispatched' || !runId) return
    let cancelled = false
    async function checkStatus() {
      if (cancelled) return
      try {
        const res = await fetch(`/api/render-status/${runId}`)
        if (!res.ok || cancelled) return
        const data = await res.json() as {
          status: 'in_progress' | 'completed' | 'failed'
          artifact?: ArtifactInfo | null
        }
        if (cancelled) return
        if (data.status === 'completed') {
          setArtifact(data.artifact ?? null)
          setStatus('render_complete')
        } else if (data.status === 'failed') {
          setError('El render falló en GitHub Actions')
          setStatus('render_failed')
        }
      } catch { /* keep polling */ }
    }
    checkStatus()
    const timer = setInterval(checkStatus, 15_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [status, runId])

  // ── Stagger reveal when props arrive ──────────────────────────────────

  useEffect(() => {
    if (!props) return
    const total = props.scenes.length + 5  // headline + scenes + voiceover + caption + chips + actions
    const timers = Array.from({ length: total }, (_, i) =>
      setTimeout(() => setVisibleBlocks(i + 1), i * 80)
    )
    return () => timers.forEach(clearTimeout)
  }, [props])

  // ── Loading message rotation ───────────────────────────────────────────

  useEffect(() => {
    if (status !== 'generating') { setLoadingMsgIdx(0); return }
    const timer = setInterval(
      () => setLoadingMsgIdx(i => (i + 1) % LOADING_MSGS.length),
      2000
    )
    return () => clearInterval(timer)
  }, [status])

  // ── Placeholder rotation ──────────────────────────────────────────────

  useEffect(() => {
    const timer = setInterval(
      () => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length),
      4000
    )
    return () => clearInterval(timer)
  }, [])

  // ── Core API call ──────────────────────────────────────────────────────

  async function callApi(topicStr: string, dispatchRender: boolean) {
    const res = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topicStr, product, dispatch: dispatchRender }),
    })
    const data = await res.json() as { props: VideoProps; runId?: string | null; error?: string }
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { videoProps: data.props, runId: data.runId ?? null }
  }

  // ── Action handlers ────────────────────────────────────────────────────

  async function generate() {
    const newTopic = topic.trim()
    if (!newTopic || status === 'generating') return

    // Conversational context: if there's a previous result, weave it in
    const effectiveTopic = props
      ? `Producto: ${props.product}. Video previo: "${props.headline}". Nueva instrucción: ${newTopic}`
      : newTopic

    setLastTopic(newTopic)
    setStatus('generating')
    setError(null)
    setProps(null)
    setRunId(null)
    setArtifact(null)
    setVisibleBlocks(0)

    try {
      const { videoProps } = await callApi(effectiveTopic, false)
      setProps(videoProps)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatus('error')
    }
  }

  async function handleChip(instruction: string) {
    const contextTopic = props
      ? `Producto: ${props.product}. Video previo: "${props.headline}". Ahora: ${instruction}`
      : instruction
    setLastTopic(instruction)
    setStatus('generating')
    setError(null)
    setProps(null)
    setRunId(null)
    setArtifact(null)
    setVisibleBlocks(0)
    try {
      const { videoProps } = await callApi(contextTopic, false)
      setProps(videoProps)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setStatus('error')
    }
  }

  async function handleRender() {
    if (!props) return
    setStatus('rendering')
    setError(null)
    setRunId(null)
    setArtifact(null)
    try {
      const { runId: id } = await callApi(lastTopic, true)
      setRunId(id)
      setStatus('dispatched')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al disparar render')
      setStatus('error')
    }
  }

  async function handleRegenerate() {
    setStatus('generating')
    setError(null)
    setRunId(null)
    setArtifact(null)
    setVisibleBlocks(0)
    try {
      const { videoProps } = await callApi(lastTopic, false)
      setProps(videoProps)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar')
      setStatus('error')
    }
  }

  function handleReject() {
    setProps(null)
    setStatus('idle')
    setError(null)
    setRunId(null)
    setArtifact(null)
    setVisibleBlocks(0)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function handleRetryRender() {
    setStatus('ready')
    setError(null)
    setRunId(null)
    setArtifact(null)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      generate()
    }
  }

  const isLoading = status === 'generating' || status === 'rendering'
  const totalSec  = props?.scenes.reduce((a, s) => a + s.durationSec, 0) ?? 0
  const showProps = props && ['ready', 'dispatched', 'render_complete', 'render_failed'].includes(status)
  const sceneCount = props?.scenes.length ?? 0

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <section
      style={{ background: '#0E1628', border: '1px solid rgba(255,255,255,0.08)' }}
      className="rounded-2xl p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
          className="p-2 rounded-lg"
        >
          <Sparkles size={18} style={{ color: '#10B981' }} />
        </div>
        <div>
          <h2 className="font-semibold text-white text-sm">Video Agent</h2>
          <p style={{ color: '#64748B' }} className="text-xs">Claude genera las escenas · Remotion renderiza en GitHub Actions</p>
        </div>
      </div>

      {/* Product pills */}
      <div className="flex flex-wrap gap-2">
        {PRODUCTS.map(p => {
          const active = product === p.id
          return (
            <button
              key={p.id}
              onClick={() => setProduct(active ? null : p.id)}
              disabled={isLoading}
              style={{
                background: active ? `${p.color}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? p.color + '60' : 'rgba(255,255,255,0.1)'}`,
                color: active ? p.color : '#94A3B8',
              }}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
            >
              {p.label}
            </button>
          )
        })}
        {product && (
          <button
            onClick={() => setProduct(null)}
            style={{ color: '#64748B' }}
            className="px-3 py-1 rounded-full text-xs"
          >
            Auto-detectar
          </button>
        )}
      </div>

      {/* Textarea */}
      <div
        style={{
          background: '#131d35',
          border: `1px solid ${status === 'generating' ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
          transition: 'border-color 0.3s ease',
        }}
        className="rounded-xl overflow-hidden"
      >
        <textarea
          ref={textareaRef}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={3}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          style={{ color: '#F1F5F9', caretColor: '#10B981' }}
          className="w-full bg-transparent p-4 text-sm resize-none outline-none placeholder:text-slate-600 disabled:opacity-50"
        />
        <div
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          className="flex items-center justify-between px-4 py-2"
        >
          <span style={{ color: '#475569' }} className="text-xs">
            {topic.length > 0 ? `${topic.length} caracteres` : (props ? '↑ itera sobre el video anterior' : 'Enter para enviar')}
          </span>
          <button
            onClick={generate}
            disabled={!topic.trim() || isLoading}
            onMouseDown={() => setBtnPressing(true)}
            onMouseUp={() => setBtnPressing(false)}
            onMouseLeave={() => setBtnPressing(false)}
            style={{
              background: topic.trim() && !isLoading ? '#10B981' : 'rgba(255,255,255,0.08)',
              color: topic.trim() && !isLoading ? '#fff' : '#475569',
              transform: btnPressing && !isLoading ? 'scale(0.94)' : 'scale(1)',
              transition: 'transform 0.1s ease, background 0.2s ease',
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:cursor-not-allowed"
          >
            {status === 'generating' ? (
              <><Loader2 size={12} className="animate-spin" /> Generando…</>
            ) : (
              <><ChevronRight size={12} /> Generar</>
            )}
          </button>
        </div>
      </div>

      {/* Status bar */}
      {status !== 'idle' && (
        <StatusBar
          status={status}
          error={error}
          product={props?.product}
          loadingMsg={LOADING_MSGS[loadingMsgIdx]}
        />
      )}

      {/* Results */}
      {showProps && (
        <div className="space-y-4">
          {/* Headline + meta */}
          <div style={B(0, visibleBlocks)}>
            <div
              style={{ background: '#131d35', border: '1px solid rgba(255,255,255,0.06)' }}
              className="rounded-xl p-4"
            >
              <p style={{ color: '#64748B' }} className="text-xs mb-1">TITULAR</p>
              <p className="text-white font-semibold text-lg leading-snug">{props!.headline}</p>
              <div className="flex gap-4 mt-2">
                <span style={{ color: '#475569' }} className="text-xs">{sceneCount} escenas</span>
                <span style={{ color: '#475569' }} className="text-xs">{totalSec}s de video</span>
                <span style={{ color: props!.productColor ?? '#10B981' }} className="text-xs font-medium">
                  {props!.product}
                </span>
              </div>
            </div>
          </div>

          {/* Scene cards — each staggers individually */}
          <div className="space-y-2">
            <p style={{ color: '#475569' }} className="text-xs font-medium uppercase tracking-wider">Escenas</p>
            {props!.scenes.map((scene, i) => (
              <div key={i} style={B(i + 1, visibleBlocks)}>
                <SceneCard scene={scene} index={i} />
              </div>
            ))}
          </div>

          {/* Voiceover */}
          <div style={B(sceneCount + 1, visibleBlocks)}>
            <div
              style={{ background: '#131d35', border: '1px solid rgba(255,255,255,0.06)' }}
              className="rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Volume2 size={13} style={{ color: '#64748B' }} />
                <p style={{ color: '#64748B' }} className="text-xs font-medium uppercase tracking-wider">Voz en off</p>
              </div>
              <p style={{ color: '#CBD5E1', lineHeight: '1.6' }} className="text-sm">
                {props!.voiceover}
              </p>
            </div>
          </div>

          {/* Caption */}
          <div style={B(sceneCount + 2, visibleBlocks)}>
            <div
              style={{ background: '#131d35', border: '1px solid rgba(255,255,255,0.06)' }}
              className="rounded-xl p-4"
            >
              <p style={{ color: '#64748B' }} className="text-xs font-medium uppercase tracking-wider mb-2">Caption redes</p>
              <p style={{ color: '#CBD5E1', lineHeight: '1.6' }} className="text-sm">
                {props!.caption}
              </p>
              <div className="flex flex-wrap gap-1 mt-3">
                {props!.hashtags.map(tag => (
                  <span
                    key={tag}
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#34D399' }}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded text-xs"
                  >
                    <Hash size={10} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick chips — only when ready */}
          {status === 'ready' && (
            <div style={B(sceneCount + 3, visibleBlocks)}>
              <QuickChips onChip={handleChip} />
            </div>
          )}

          {/* Action buttons */}
          {status === 'ready' && (
            <div style={B(sceneCount + 4, visibleBlocks)}>
              <ActionButtons
                onRender={handleRender}
                onRegenerate={handleRegenerate}
                onReject={handleReject}
                isLoading={isLoading}
                renderingStatus={status}
              />
            </div>
          )}

          {/* Rendering progress */}
          {status === 'dispatched' && (
            <RenderProgress runId={runId} />
          )}

          {/* Render complete */}
          {status === 'render_complete' && (
            <DownloadCard runId={runId!} artifact={artifact} onReset={handleReject} />
          )}

          {/* Render failed */}
          {status === 'render_failed' && (
            <RenderFailedCard error={error} onRetry={handleRetryRender} onReset={handleReject} />
          )}
        </div>
      )}
    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SceneCard({ scene, index }: { scene: VideoScene; index: number }) {
  const meta = STYLE_META[scene.style]
  return (
    <div
      style={{ background: '#131d35', border: '1px solid rgba(255,255,255,0.06)' }}
      className="rounded-xl p-4 flex gap-4"
    >
      <div
        style={{ background: 'rgba(255,255,255,0.06)', color: '#64748B' }}
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            style={{ background: meta.bg, color: meta.text }}
            className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
          >
            {meta.label}
          </span>
          <span style={{ color: '#475569' }} className="text-xs">{scene.durationSec}s</span>
        </div>
        <p className="text-white text-sm font-medium">{scene.text}</p>
        {scene.subtext && (
          <p style={{ color: '#64748B' }} className="text-xs mt-1">{scene.subtext}</p>
        )}
      </div>
    </div>
  )
}

function QuickChips({ onChip }: { onChip: (instruction: string) => void }) {
  const [activeChip, setActiveChip] = useState<string | null>(null)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Zap size={11} style={{ color: '#64748B' }} />
        <p style={{ color: '#64748B' }} className="text-[11px] font-medium uppercase tracking-wider">Refinar rápido</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip.label}
            onClick={() => { setActiveChip(chip.label); onChip(chip.instruction) }}
            disabled={activeChip !== null}
            style={{
              background: activeChip === chip.label ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${activeChip === chip.label ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: activeChip === chip.label ? '#A78BFA' : '#94A3B8',
              transition: 'all 0.2s ease',
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium hover:opacity-90 disabled:cursor-not-allowed"
          >
            {activeChip === chip.label && <Loader2 size={10} className="animate-spin" />}
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StatusBar({
  status, error, product, loadingMsg,
}: {
  status: Status
  error: string | null
  product?: string
  loadingMsg: string
}) {
  const config: Partial<Record<Status, { icon: React.ReactNode; text: string; color: string; bg: string }>> = {
    generating:      { icon: <Loader2 size={13} className="animate-spin" />, text: loadingMsg,                                color: '#60A5FA', bg: 'rgba(59,130,246,0.1)'  },
    ready:           { icon: <CheckCircle2 size={13} />,                     text: `Props listas para ${product ?? 'el producto'}`, color: '#34D399', bg: 'rgba(16,185,129,0.1)' },
    rendering:       { icon: <Loader2 size={13} className="animate-spin" />, text: 'Disparando render en GitHub Actions…',    color: '#A78BFA', bg: 'rgba(139,92,246,0.1)' },
    dispatched:      { icon: <Loader2 size={13} className="animate-spin" />, text: 'Renderizando en GitHub Actions…',         color: '#60A5FA', bg: 'rgba(59,130,246,0.1)'  },
    render_complete: { icon: <CheckCircle2 size={13} />,                     text: 'Video listo para descargar',               color: '#34D399', bg: 'rgba(16,185,129,0.1)' },
    render_failed:   { icon: <AlertCircle size={13} />,                      text: error ?? 'El render falló',                 color: '#F87171', bg: 'rgba(239,68,68,0.1)'  },
    error:           { icon: <AlertCircle size={13} />,                      text: error ?? 'Error desconocido',               color: '#F87171', bg: 'rgba(239,68,68,0.1)'  },
  }
  const c = config[status]
  if (!c) return null
  return (
    <div
      style={{ background: c.bg, border: `1px solid ${c.color}30`, color: c.color, transition: 'all 0.3s ease' }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs"
    >
      {c.icon}
      <span style={{ transition: 'opacity 0.2s ease' }}>{c.text}</span>
    </div>
  )
}

function RenderProgress({ runId }: { runId: string | null }) {
  return (
    <div
      style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
      className="rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 size={15} style={{ color: '#60A5FA' }} className="animate-spin" />
          <span style={{ color: '#93C5FD' }} className="text-sm font-medium">Renderizando… (~2 min)</span>
        </div>
        {runId && (
          <span style={{ color: '#475569' }} className="text-xs font-mono">run #{runId}</span>
        )}
      </div>
      <div
        style={{ background: 'rgba(59,130,246,0.15)', height: '4px' }}
        className="rounded-full overflow-hidden"
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, #3B82F6 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s ease-in-out infinite',
          }}
        />
      </div>
      <p style={{ color: '#475569' }} className="text-xs">
        Chequeando cada 15 segundos · Edge-TTS → Remotion → GitHub Artifact
      </p>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  )
}

function DownloadCard({
  runId, artifact, onReset,
}: {
  runId: string
  artifact: ArtifactInfo | null
  onReset: () => void
}) {
  return (
    <div
      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
      className="rounded-xl p-4 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
          className="p-2.5 rounded-lg"
        >
          <CheckCircle2 size={18} style={{ color: '#34D399' }} />
        </div>
        <div>
          <p style={{ color: '#34D399' }} className="text-sm font-semibold">¡Video renderizado!</p>
          <p style={{ color: '#64748B' }} className="text-xs mt-0.5">Listo para descargar</p>
        </div>
      </div>
      {artifact && (
        <div
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          className="rounded-lg p-3 flex items-center gap-3"
        >
          <FileVideo size={18} style={{ color: '#64748B' }} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{artifact.name}.mp4</p>
            <p style={{ color: '#475569' }} className="text-xs mt-0.5">{artifact.sizeMB} MB · MP4</p>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <a
          href={`/api/download-artifact/${runId}`}
          download
          style={{ background: '#10B981', color: '#fff' }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 justify-center transition-opacity hover:opacity-90"
        >
          <Download size={15} />
          Descargar MP4
        </a>
        <button
          onClick={onReset}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
        >
          <RefreshCw size={14} />
          Nuevo
        </button>
      </div>
    </div>
  )
}

function RenderFailedCard({
  error, onRetry, onReset,
}: {
  error: string | null
  onRetry: () => void
  onReset: () => void
}) {
  return (
    <div
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
      className="rounded-xl p-4 space-y-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={18} style={{ color: '#F87171' }} className="mt-0.5 flex-shrink-0" />
        <div>
          <p style={{ color: '#F87171' }} className="text-sm font-semibold">El render falló</p>
          <p style={{ color: '#94A3B8' }} className="text-xs mt-1">
            {error ?? 'Error desconocido en GitHub Actions. Revisa la pestaña Actions del repositorio.'}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          style={{ background: '#10B981', color: '#fff' }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 justify-center transition-opacity hover:opacity-90"
        >
          <RotateCcw size={14} />
          Reintentar render
        </button>
        <button
          onClick={onReset}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
        >
          <X size={14} />
          Descartar
        </button>
      </div>
    </div>
  )
}

function ActionButtons({
  onRender, onRegenerate, onReject, isLoading, renderingStatus,
}: {
  onRender: () => void
  onRegenerate: () => void
  onReject: () => void
  isLoading: boolean
  renderingStatus: Status
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onRender}
        disabled={isLoading}
        style={{ background: '#10B981', color: '#fff' }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 justify-center transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {renderingStatus === 'rendering' ? (
          <><Loader2 size={14} className="animate-spin" /> Renderizando…</>
        ) : (
          <><Play size={14} /> Renderizar con Remotion</>
        )}
      </button>
      <button
        onClick={onRegenerate}
        disabled={isLoading}
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8' }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50"
      >
        <RefreshCw size={14} />
        Regenerar
      </button>
      <button
        onClick={onReject}
        disabled={isLoading}
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50"
      >
        <X size={14} />
        Rechazar
      </button>
    </div>
  )
}
