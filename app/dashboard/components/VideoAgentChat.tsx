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
  'Eligiendo las palabras justas...',
]

const PLACEHOLDERS = [
  'video sobre robo de cables en pivotes durante la cosecha',
  'post para LinkedIn sobre control de horas en maquinaria',
  'campaña de AssetGuard para constructoras',
  'muestra cómo ProcessLink digitaliza un car wash',
]

const QUICK_CHIPS: { label: string; refinement: string }[] = [
  { label: 'Hazlo más corto',    refinement: 'hazlo más corto, máximo 3 escenas, al grano' },
  { label: 'Más urgente',        refinement: 'hazlo más urgente, con más FOMO y sentido de riesgo' },
  { label: 'Cambia el gancho',   refinement: 'cambia completamente el gancho de apertura, que sea disruptivo' },
  { label: 'Otro ángulo',        refinement: 'prueba un ángulo totalmente diferente para el mismo producto' },
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
  { id: 'AGROSHIELD',     label: 'AgroShield',    color: '#10B981' },
  { id: 'MACHINEINSIGHT', label: 'MachineInsight', color: '#3B82F6' },
  { id: 'PROCESSLINK',    label: 'ProcessLink',    color: '#8B5CF6' },
  { id: 'ASSETGUARD',     label: 'AssetGuard',     color: '#F59E0B' },
]

const STYLE_META: Record<VideoScene['style'], { label: string; bg: string; text: string }> = {
  hook:     { label: 'HOOK',     bg: 'rgba(239,68,68,0.15)',   text: '#EF4444' },
  problem:  { label: 'PROBLEMA', bg: 'rgba(249,115,22,0.15)',  text: '#EA580C' },
  solution: { label: 'SOLUCIÓN', bg: 'rgba(16,185,129,0.15)',  text: 'var(--accent-dark)' },
  feature:  { label: 'FEATURE',  bg: 'rgba(59,130,246,0.15)',  text: '#1D4ED8' },
  cta:      { label: 'CTA',      bg: 'rgba(139,92,246,0.15)',  text: '#7C3AED' },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function stagger(idx: number): React.CSSProperties {
  return { animation: `fadein 0.35s ease both`, animationDelay: `${idx * 60}ms` }
}

// ── Component ──────────────────────────────────────────────────────────────

export function VideoAgentChat() {
  const [topic, setTopic]         = useState('')
  const [product, setProduct]     = useState<string | null>(null)
  const [status, setStatus]       = useState<Status>('idle')
  const [videoProps, setVideoProps] = useState<VideoProps | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [lastTopic, setLastTopic] = useState('')
  const [runId, setRunId]         = useState<string | null>(null)
  const [artifact, setArtifact]   = useState<ArtifactInfo | null>(null)
  // UX state
  const [loadingMsgIdx, setLoadingMsgIdx]   = useState(0)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [inputFocused, setInputFocused]     = useState(false)
  const [btnPressing, setBtnPressing]       = useState(false)
  const [isRefining, setIsRefining]         = useState(false)
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

  // ── Loading message rotation (pauses when not generating) ─────────────

  useEffect(() => {
    if (status !== 'generating') { setLoadingMsgIdx(0); return }
    const timer = setInterval(
      () => setLoadingMsgIdx(i => (i + 1) % LOADING_MSGS.length),
      2000
    )
    return () => clearInterval(timer)
  }, [status])

  // ── Placeholder rotation (pauses when input has focus) ────────────────

  useEffect(() => {
    if (inputFocused) return
    const timer = setInterval(
      () => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length),
      4000
    )
    return () => clearInterval(timer)
  }, [inputFocused])

  // ── Core API call ──────────────────────────────────────────────────────

  async function callApi(topicStr: string, dispatchRender: boolean, refinement?: string) {
    const res = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topicStr, product, dispatch: dispatchRender, refinement }),
    })
    const data = await res.json() as { props: VideoProps; runId?: string | null; error?: string }
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return { props: data.props, runId: data.runId ?? null }
  }

  // ── Action handlers ────────────────────────────────────────────────────

  function resetGenState() {
    setError(null)
    setVideoProps(null)
    setRunId(null)
    setArtifact(null)
    setIsRefining(false)
  }

  async function generate() {
    const newTopic = topic.trim()
    if (!newTopic || status === 'generating') return
    setLastTopic(newTopic)
    setStatus('generating')
    resetGenState()
    try {
      const { props } = await callApi(newTopic, false)
      setVideoProps(props)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatus('error')
    }
  }

  async function handleChip(refinement: string) {
    if (!lastTopic) return
    setStatus('generating')
    setIsRefining(true)
    setError(null)
    setVideoProps(null)
    setRunId(null)
    setArtifact(null)
    try {
      const { props } = await callApi(lastTopic, false, refinement)
      setVideoProps(props)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setStatus('error')
    } finally {
      setIsRefining(false)
    }
  }

  async function handleRender() {
    if (!videoProps) return
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
    resetGenState()
    try {
      const { props } = await callApi(lastTopic, false)
      setVideoProps(props)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar')
      setStatus('error')
    }
  }

  function handleReject() {
    setVideoProps(null)
    setStatus('idle')
    setError(null)
    setRunId(null)
    setArtifact(null)
    setIsRefining(false)
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

  const isLoading  = status === 'generating' || status === 'rendering'
  const totalSec   = videoProps?.scenes.reduce((a, s) => a + s.durationSec, 0) ?? 0
  const showProps  = videoProps && ['ready', 'dispatched', 'render_complete', 'render_failed'].includes(status)
  const sceneCount = videoProps?.scenes.length ?? 0
  const loadingMsg = isRefining ? 'Ajustando el guion...' : LOADING_MSGS[loadingMsgIdx]

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <section
      style={{
        background: 'var(--bg-card)',
        border: '1px solid #E5E7EB',
        borderRadius: 'var(--radius-card)',
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              background: 'var(--accent-light)',
              border: '1px solid #6EE7B7',
              borderRadius: 10,
              padding: 8,
              display: 'flex',
            }}
          >
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, margin: 0 }}>Video Agent</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '2px 0 0' }}>
              Claude genera las escenas · Remotion renderiza en GitHub Actions
            </p>
          </div>
        </div>

        {/* Product pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRODUCTS.map(p => {
            const active = product === p.id
            return (
              <button
                key={p.id}
                onClick={() => setProduct(active ? null : p.id)}
                disabled={isLoading}
                style={{
                  background: active ? `${p.color}18` : '#F3F4F6',
                  border: `1px solid ${active ? p.color + '60' : '#E5E7EB'}`,
                  color: active ? p.color : 'var(--text-secondary)',
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
                className="disabled:opacity-50"
              >
                {p.label}
              </button>
            )
          })}
          {product && (
            <button
              onClick={() => setProduct(null)}
              style={{
                color: 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Auto-detectar
            </button>
          )}
        </div>

        {/* Textarea */}
        <div
          style={{
            background: 'var(--bg-card-soft)',
            border: `1px solid ${status === 'generating' ? 'rgba(59,130,246,0.4)' : '#E5E7EB'}`,
            borderRadius: 14,
            overflow: 'hidden',
            transition: 'border-color 0.3s ease',
          }}
        >
          <textarea
            ref={textareaRef}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            disabled={isLoading}
            rows={3}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            style={{ color: 'var(--text-primary)', caretColor: 'var(--accent)' }}
            className="w-full bg-transparent p-4 text-sm resize-none outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <div
            style={{
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
            }}
          >
            <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
              {topic.length > 0
                ? `${topic.length} caracteres`
                : videoProps ? '↑ itera sobre el video anterior' : 'Enter para enviar'}
            </span>
            <button
              onClick={generate}
              disabled={!topic.trim() || isLoading}
              onMouseDown={() => setBtnPressing(true)}
              onMouseUp={() => setBtnPressing(false)}
              onMouseLeave={() => setBtnPressing(false)}
              style={{
                background: topic.trim() && !isLoading ? 'var(--accent)' : '#E5E7EB',
                color: topic.trim() && !isLoading ? '#fff' : 'var(--text-tertiary)',
                transform: btnPressing && !isLoading ? 'scale(0.97)' : 'scale(1)',
                transition: 'transform 0.1s ease, background 0.2s ease',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              className="disabled:cursor-not-allowed"
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
          <StatusBar status={status} error={error} product={videoProps?.product} loadingMsg={loadingMsg} />
        )}

        {/* Results */}
        {showProps && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Headline + meta */}
            <div style={stagger(0)}>
              <div
                style={{
                  background: 'var(--bg-card-soft)',
                  border: '1px solid #E5E7EB',
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <p style={{ color: 'var(--text-tertiary)', fontSize: 11, margin: '0 0 4px', fontWeight: 500, letterSpacing: '0.06em' }}>
                  TITULAR
                </p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 17, lineHeight: 1.3, margin: 0 }}>
                  {videoProps!.headline}
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{sceneCount} escenas</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{totalSec}s de video</span>
                  <span style={{ color: videoProps!.productColor ?? 'var(--accent)', fontSize: 12, fontWeight: 500 }}>
                    {videoProps!.product}
                  </span>
                </div>
              </div>
            </div>

            {/* Scene cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', margin: 0, ...stagger(1) }}>
                ESCENAS
              </p>
              {videoProps!.scenes.map((scene, i) => (
                <div key={i} style={stagger(i + 2)}>
                  <SceneCard scene={scene} index={i} />
                </div>
              ))}
            </div>

            {/* Voiceover */}
            <div style={stagger(sceneCount + 2)}>
              <div
                style={{
                  background: 'var(--bg-card-soft)',
                  border: '1px solid #E5E7EB',
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <Volume2 size={13} style={{ color: 'var(--text-secondary)' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', margin: 0 }}>
                    VOZ EN OFF
                  </p>
                </div>
                <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: 13, margin: 0 }}>
                  {videoProps!.voiceover}
                </p>
              </div>
            </div>

            {/* Caption */}
            <div style={stagger(sceneCount + 3)}>
              <div
                style={{
                  background: 'var(--bg-card-soft)',
                  border: '1px solid #E5E7EB',
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <p style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  CAPTION REDES
                </p>
                <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: 13, margin: 0 }}>
                  {videoProps!.caption}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                  {videoProps!.hashtags.map(tag => (
                    <span
                      key={tag}
                      style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)' }}
                      className="flex items-center gap-0.5 px-2 py-0.5 rounded text-xs"
                    >
                      <Hash size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick refinement chips */}
            {status === 'ready' && (
              <div style={stagger(sceneCount + 4)}>
                <QuickChips onChip={handleChip} />
              </div>
            )}

            {/* Action buttons */}
            {status === 'ready' && (
              <div style={stagger(sceneCount + 5)}>
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
            {status === 'dispatched' && <RenderProgress runId={runId} />}

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

      </div>
    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SceneCard({ scene, index }: { scene: VideoScene; index: number }) {
  const meta = STYLE_META[scene.style]
  return (
    <div
      style={{
        background: 'var(--bg-card-soft)',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        gap: 14,
      }}
    >
      <div
        style={{
          background: '#F3F4F6',
          color: 'var(--text-secondary)',
          width: 24,
          height: 24,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span
            style={{ background: meta.bg, color: meta.text, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}
          >
            {meta.label}
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{scene.durationSec}s</span>
        </div>
        <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, margin: 0 }}>{scene.text}</p>
        {scene.subtext && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 0' }}>{scene.subtext}</p>
        )}
      </div>
    </div>
  )
}

function QuickChips({ onChip }: { onChip: (refinement: string) => void }) {
  const [activeChip, setActiveChip] = useState<string | null>(null)

  function handleClick(chip: typeof QUICK_CHIPS[0]) {
    setActiveChip(chip.label)
    onChip(chip.refinement)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Zap size={11} style={{ color: 'var(--text-tertiary)' }} />
        <p style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', margin: 0 }}>
          REFINAR RÁPIDO
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip.label}
            onClick={() => handleClick(chip)}
            disabled={activeChip !== null}
            style={{
              background: activeChip === chip.label ? 'rgba(139,92,246,0.12)' : '#F3F4F6',
              border: `1px solid ${activeChip === chip.label ? 'rgba(139,92,246,0.35)' : '#E5E7EB'}`,
              color: activeChip === chip.label ? '#7C3AED' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            className="hover:opacity-90 disabled:cursor-not-allowed"
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
    generating:      { icon: <Loader2 size={13} className="animate-spin" />, text: loadingMsg,                                    color: '#2563EB', bg: '#EFF6FF' },
    ready:           { icon: <CheckCircle2 size={13} />,                     text: `Props listas para ${product ?? 'el producto'}`, color: 'var(--accent-dark)', bg: 'var(--accent-light)' },
    rendering:       { icon: <Loader2 size={13} className="animate-spin" />, text: 'Disparando render en GitHub Actions…',          color: '#7C3AED', bg: '#F5F3FF' },
    dispatched:      { icon: <Loader2 size={13} className="animate-spin" />, text: 'Renderizando en GitHub Actions…',               color: '#2563EB', bg: '#EFF6FF' },
    render_complete: { icon: <CheckCircle2 size={13} />,                     text: 'Video listo para descargar',                    color: 'var(--accent-dark)', bg: 'var(--accent-light)' },
    render_failed:   { icon: <AlertCircle size={13} />,                      text: error ?? 'El render falló',                      color: '#DC2626', bg: '#FEF2F2' },
    error:           { icon: <AlertCircle size={13} />,                      text: error ?? 'Error desconocido',                    color: '#DC2626', bg: '#FEF2F2' },
  }
  const c = config[status]
  if (!c) return null
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.color}30`,
        color: c.color,
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 10,
        fontSize: 12,
      }}
    >
      {c.icon}
      <span>{c.text}</span>
    </div>
  )
}

function RenderProgress({ runId }: { runId: string | null }) {
  return (
    <div
      style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader2 size={15} style={{ color: '#2563EB' }} className="animate-spin" />
          <span style={{ color: '#1D4ED8', fontSize: 13, fontWeight: 500 }}>Renderizando… (~2 min)</span>
        </div>
        {runId && (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'monospace' }}>run #{runId}</span>
        )}
      </div>
      <div style={{ background: '#DBEAFE', height: 4, borderRadius: 999, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, #3B82F6 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s ease-in-out infinite',
          }}
        />
      </div>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 12, margin: '10px 0 0' }}>
        Chequeando cada 15 segundos · Edge-TTS → Remotion → GitHub Artifact
      </p>
    </div>
  )
}

function DownloadCard({ runId, artifact, onReset }: {
  runId: string; artifact: ArtifactInfo | null; onReset: () => void
}) {
  return (
    <div
      style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 14, padding: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ background: 'var(--accent-light)', border: '1px solid #6EE7B7', borderRadius: 10, padding: 8, display: 'flex' }}>
          <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p style={{ color: 'var(--accent-dark)', fontSize: 13, fontWeight: 600, margin: 0 }}>¡Video renderizado!</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '2px 0 0' }}>Listo para descargar</p>
        </div>
      </div>
      {artifact && (
        <div
          style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}
        >
          <FileVideo size={18} style={{ color: 'var(--text-secondary)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {artifact.name}.mp4
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 11, margin: '2px 0 0' }}>{artifact.sizeMB} MB · MP4</p>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={`/api/download-artifact/${runId}`}
          download
          style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none', transition: 'opacity 0.15s ease' }}
          className="hover:opacity-90"
        >
          <Download size={15} />
          Descargar MP4
        </a>
        <button
          onClick={onReset}
          style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: 'var(--text-secondary)', borderRadius: 12, padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'opacity 0.15s ease' }}
          className="hover:opacity-90"
        >
          <RefreshCw size={14} />
          Nuevo
        </button>
      </div>
    </div>
  )
}

function RenderFailedCard({ error, onRetry, onReset }: {
  error: string | null; onRetry: () => void; onReset: () => void
}) {
  return (
    <div
      style={{ background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 14, padding: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <AlertCircle size={18} style={{ color: '#DC2626', marginTop: 1, flexShrink: 0 }} />
        <div>
          <p style={{ color: '#DC2626', fontSize: 13, fontWeight: 600, margin: 0 }}>El render falló</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 0' }}>
            {error ?? 'Error desconocido en GitHub Actions. Revisa la pestaña Actions del repositorio.'}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRetry}
          style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s ease' }}
          className="hover:opacity-90"
        >
          <RotateCcw size={14} />
          Reintentar render
        </button>
        <button
          onClick={onReset}
          style={{ background: '#FFF1F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 12, padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'opacity 0.15s ease' }}
          className="hover:opacity-90"
        >
          <X size={14} />
          Descartar
        </button>
      </div>
    </div>
  )
}

function ActionButtons({ onRender, onRegenerate, onReject, isLoading, renderingStatus }: {
  onRender: () => void; onRegenerate: () => void; onReject: () => void
  isLoading: boolean; renderingStatus: Status
}) {
  return (
    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
      <button
        onClick={onRender}
        disabled={isLoading}
        style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s ease' }}
        className="hover:opacity-90 disabled:opacity-50"
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
        style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: 'var(--text-secondary)', borderRadius: 12, padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'opacity 0.15s ease' }}
        className="hover:opacity-90 disabled:opacity-50"
      >
        <RefreshCw size={14} />
        Regenerar
      </button>
      <button
        onClick={onReject}
        disabled={isLoading}
        style={{ background: '#FFF1F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 12, padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'opacity 0.15s ease' }}
        className="hover:opacity-90 disabled:opacity-50"
      >
        <X size={14} />
        Rechazar
      </button>
    </div>
  )
}
