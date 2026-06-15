import { VideoAgentChat } from './components/VideoAgentChat'
import { Video, TrendingUp, Clock, CheckCircle } from 'lucide-react'

// ── Mock data — reemplazar con fetch real a Supabase cuando esté listo ──

const MOCK_POSTS = [
  { id: '1', product: 'AGROSHIELD',     headline: 'Tu pivote no duerme. Nosotros tampoco.', scenes: 5, createdAt: '2026-06-14 19:35', status: 'rendered',   sizeMB: 2.26, color: '#10B981' },
  { id: '2', product: 'MACHINEINSIGHT', headline: '¿Sabes cuántas horas trabajó tu tractor?', scenes: 4, createdAt: '2026-06-13 11:20', status: 'rendered',   sizeMB: 1.94, color: '#3B82F6' },
  { id: '3', product: 'PROCESSLINK',    headline: 'Tus datos industriales, en tiempo real.', scenes: 5, createdAt: '2026-06-12 09:00', status: 'dispatched', sizeMB: 0,    color: '#8B5CF6' },
]

const STATUS_META = {
  rendered:   { label: 'Renderizado', color: '#34D399', bg: 'rgba(16,185,129,0.12)' },
  dispatched: { label: 'Procesando',  color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
  error:      { label: 'Error',       color: '#F87171', bg: 'rgba(239,68,68,0.12)'  },
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div style={{ background: '#0A0F1E', minHeight: '100vh' }} className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Marketing Agent</h1>
            <p style={{ color: '#64748B' }} className="text-sm mt-1">Environment · Generación de videos con IA</p>
          </div>
          <div
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            className="px-3 py-1.5 rounded-full flex items-center gap-2"
          >
            <span style={{ background: '#10B981' }} className="w-2 h-2 rounded-full" />
            <span style={{ color: '#34D399' }} className="text-xs font-medium">Pipeline activo</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Video size={16} />}       label="Videos generados" value="3"      color="#10B981" />
          <StatCard icon={<CheckCircle size={16} />} label="Renderizados"     value="2"      color="#3B82F6" />
          <StatCard icon={<TrendingUp size={16} />}  label="Productos usados" value="3"      color="#8B5CF6" />
          <StatCard icon={<Clock size={16} />}       label="Último render"    value="~2 min" color="#F59E0B" />
        </div>

        {/* Post history */}
        <section>
          <h2 className="text-white font-semibold text-sm mb-3">Videos recientes</h2>
          <div className="space-y-2">
            {MOCK_POSTS.map(post => (
              <PostRow key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* ── Video Agent Chat ── */}
        <VideoAgentChat />

      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string
}) {
  return (
    <div
      style={{ background: '#0E1628', border: '1px solid rgba(255,255,255,0.07)' }}
      className="rounded-xl p-4"
    >
      <div style={{ color }} className="mb-2">{icon}</div>
      <p className="text-white font-bold text-xl">{value}</p>
      <p style={{ color: '#64748B' }} className="text-xs mt-0.5">{label}</p>
    </div>
  )
}

function PostRow({ post }: { post: typeof MOCK_POSTS[0] }) {
  const sm = STATUS_META[post.status as keyof typeof STATUS_META]
  return (
    <div
      style={{ background: '#0E1628', border: '1px solid rgba(255,255,255,0.07)' }}
      className="rounded-xl p-4 flex items-center gap-4"
    >
      <div
        style={{ background: `${post.color}18`, border: `1px solid ${post.color}30` }}
        className="w-2 self-stretch rounded-full flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{post.headline}</p>
        <div className="flex items-center gap-3 mt-1">
          <span style={{ color: post.color }} className="text-xs font-medium">{post.product}</span>
          <span style={{ color: '#475569' }} className="text-xs">{post.scenes} escenas</span>
          <span style={{ color: '#475569' }} className="text-xs">{post.createdAt}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {post.sizeMB > 0 && (
          <span style={{ color: '#475569' }} className="text-xs">{post.sizeMB} MB</span>
        )}
        <span
          style={{ background: sm.bg, color: sm.color }}
          className="px-2.5 py-1 rounded-full text-xs font-medium"
        >
          {sm.label}
        </span>
      </div>
    </div>
  )
}
