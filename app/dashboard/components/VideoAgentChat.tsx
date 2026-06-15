'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import {
  Loader2, RefreshCw, X, Play, ChevronRight,
  Volume2, Hash, Sparkles, CheckCircle2, AlertCircle,
} from 'lucide-react'

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

type Status = 'idle' | 'generating' | 'ready' | 'rendering' | 'dispatched' | 'error'

const PRODUCTS = [
  { id: 'AGROSHIELD',    label: 'AgroShield',    color: '#10B981' },
  { id: 'MACHINEINSIGHT',label: 'MachineInsight', color: '#3B82F6' },
  { id: 'PROCESSLINK',   label: 'ProcessLink',    color: '#8B5CF6' },
  { id: 'ASSETGUARD',    label: 'AssetGuard',     color: '#F59E0B' },
]

const STYLE_META: Record<VideoScene['style'], { label: string; bg: string; text: string }> = {
  hook:     { label: 'HOOK',     bg: 'rgba(239,68,68,0.15)',   text: '#F87171' },
  problem:  { label: 'PROBLEMA', bg: 'rgba(249,115,22,0.15)',  text: '#FB923C' },
  solution: { label: 'SOLUCIÓN', bg: 'rgba(16,185,129,0.15)',  text: '#34D399' },
  feature:  { label: 'FEATURE',  bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA' },
  cta:      { label: 'CTA',      bg: 'rgba(139,92,246,0.15)',  text: '#A78BFA' },
}

// ── Component ──────────────────────────────────────────────────────────────

export function VideoAgentChat() {
  const [topic, setTopic]       = useState('')
  const [product, setProduct]   = useState<string | null>(null)
  const [status, setStatus]     = useState<Status>('idle')
  const [props, setProps]       = useState<VideoProps | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [lastTopic, setLastTopic] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Helpers ────────────────────────────────────────────────────────────

  async function callApi(dispatchRender: boolean) {
    const res = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: lastTopic || topic, product, dispatch: dispatchRender }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return data.props as VideoProps
  }

  async function generate() {
    const t = topic.trim()
    if (!t || status === 'generating') return
    setLastTopic(t)
    setStatus('generating')
    setError(null)
    setProps(null)

    try {
      const result = await callApi(false)
      setProps(result)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatus('error')
    }
  }

  async function handleRender() {
    if (!props) return
    setStatus('rendering')
    setError(null)

    try {
      await callApi(true)
      setStatus('dispatched')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al disparar render')
      setStatus('error')
    }
  }

  async function handleRegenerate() {
    setStatus('generating')
    setError(null)
    try {
      const result = await callApi(false)
      setProps(result)
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
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      generate()
    }
  }

  const isLoading = status === 'generating' || status === 'rendering'
  const totalSec  = props?.scenes.reduce((a, s) => a + s.durationSec, 0) ?? 0

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
        style={{ background: '#131d35', border: '1px solid rgba(255,255,255,0.08)' }}
        className="rounded-xl overflow-hidden"
      >
        <textarea
          ref={textareaRef}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={3}
          placeholder="Describe el video que quieres generar... (Enter para enviar, Shift+Enter para nueva línea)"
          style={{ color: '#F1F5F9', caretColor: '#10B981' }}
          className="w-full bg-transparent p-4 text-sm resize-none outline-none placeholder:text-slate-600 disabled:opacity-50"
        />
        <div
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          className="flex items-center justify-between px-4 py-2"
        >
          <span style={{ color: '#475569' }} className="text-xs">
            {topic.length} caracteres
          </span>
          <button
            onClick={generate}
            disabled={!topic.trim() || isLoading}
            style={{
              background: topic.trim() && !isLoading ? '#10B981' : 'rgba(255,255,255,0.08)',
              color: topic.trim() && !isLoading ? '#fff' : '#475569',
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:cursor-not-allowed"
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
        <StatusBar status={status} error={error} product={props?.product} />
      )}

      {/* Results */}
      {props && (status === 'ready' || status === 'dispatched') && (
        <div className="space-y-4">
          {/* Headline + meta */}
          <div
            style={{ background: '#131d35', border: '1px solid rgba(255,255,255,0.06)' }}
            className="rounded-xl p-4"
          >
            <p style={{ color: '#64748B' }} className="text-xs mb-1">TITULAR</p>
            <p className="text-white font-semibold text-lg leading-snug">{props.headline}</p>
            <div className="flex gap-4 mt-2">
              <span style={{ color: '#475569' }} className="text-xs">{props.scenes.length} escenas</span>
              <span style={{ color: '#475569' }} className="text-xs">{totalSec}s de video</span>
              <span style={{ color: props.productColor ?? '#10B981' }} className="text-xs font-medium">
                {props.product}
              </span>
            </div>
          </div>

          {/* Scene cards */}
          <div className="space-y-2">
            <p style={{ color: '#475569' }} className="text-xs font-medium uppercase tracking-wider">Escenas</p>
            {props.scenes.map((scene, i) => (
              <SceneCard key={i} scene={scene} index={i} />
            ))}
          </div>

          {/* Voiceover */}
          <div
            style={{ background: '#131d35', border: '1px solid rgba(255,255,255,0.06)' }}
            className="rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Volume2 size={13} style={{ color: '#64748B' }} />
              <p style={{ color: '#64748B' }} className="text-xs font-medium uppercase tracking-wider">Voz en off</p>
            </div>
            <p style={{ color: '#CBD5E1', lineHeight: '1.6' }} className="text-sm">
              {props.voiceover}
            </p>
          </div>

          {/* Caption */}
          <div
            style={{ background: '#131d35', border: '1px solid rgba(255,255,255,0.06)' }}
            className="rounded-xl p-4"
          >
            <p style={{ color: '#64748B' }} className="text-xs font-medium uppercase tracking-wider mb-2">Caption redes</p>
            <p style={{ color: '#CBD5E1', lineHeight: '1.6' }} className="text-sm">
              {props.caption}
            </p>
            <div className="flex flex-wrap gap-1 mt-3">
              {props.hashtags.map(tag => (
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

          {/* Action buttons */}
          {status === 'ready' && (
            <ActionButtons
              onRender={handleRender}
              onRegenerate={handleRegenerate}
              onReject={handleReject}
              isLoading={isLoading}
              renderingStatus={status}
            />
          )}

          {status === 'dispatched' && (
            <div
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
              className="rounded-xl p-4 flex items-center gap-3"
            >
              <CheckCircle2 size={18} style={{ color: '#34D399' }} />
              <div>
                <p style={{ color: '#34D399' }} className="text-sm font-medium">Render iniciado en GitHub Actions</p>
                <p style={{ color: '#64748B' }} className="text-xs mt-0.5">El MP4 estará listo en ~2 minutos y subirá a Supabase</p>
              </div>
            </div>
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

function StatusBar({ status, error, product }: { status: Status; error: string | null; product?: string }) {
  const config: Record<Status, { icon: React.ReactNode; text: string; color: string; bg: string }> = {
    idle:       { icon: null, text: '', color: '', bg: '' },
    generating: { icon: <Loader2 size={13} className="animate-spin" />, text: 'Claude está generando las escenas…', color: '#60A5FA', bg: 'rgba(59,130,246,0.1)' },
    ready:      { icon: <CheckCircle2 size={13} />, text: `Props listas para ${product ?? 'el producto'}`, color: '#34D399', bg: 'rgba(16,185,129,0.1)' },
    rendering:  { icon: <Loader2 size={13} className="animate-spin" />, text: 'Disparando render en GitHub Actions…', color: '#A78BFA', bg: 'rgba(139,92,246,0.1)' },
    dispatched: { icon: <CheckCircle2 size={13} />, text: 'Render en curso · GitHub Actions', color: '#34D399', bg: 'rgba(16,185,129,0.1)' },
    error:      { icon: <AlertCircle size={13} />, text: error ?? 'Error desconocido', color: '#F87171', bg: 'rgba(239,68,68,0.1)' },
  }
  const c = config[status]
  if (!c.text) return null
  return (
    <div
      style={{ background: c.bg, border: `1px solid ${c.color}30`, color: c.color }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs"
    >
      {c.icon}
      <span>{c.text}</span>
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
