import { ShieldCheck, Truck, BarChart3, MapPin, Zap, Film } from 'lucide-react'

// ── Mock data — reemplazar con fetch real a Supabase cuando esté listo ──

const MOCK_POSTS = [
  { id: '1', product: 'AGROSHIELD',     headline: 'Tu pivote no duerme. Nosotros tampoco.',     createdAt: '14 jun · 19:35', status: 'rendered',   sizeMB: 2.26 },
  { id: '2', product: 'MACHINEINSIGHT', headline: '¿Sabes cuántas horas trabajó tu tractor?',  createdAt: '13 jun · 11:20', status: 'rendered',   sizeMB: 1.94 },
  { id: '3', product: 'PROCESSLINK',    headline: 'Tus datos industriales, en tiempo real.',    createdAt: '12 jun · 09:00', status: 'dispatched', sizeMB: 0    },
]

const PRODUCT_CFG: Record<string, { bg: string; fg: string; Icon: React.ElementType; label: string }> = {
  AGROSHIELD:     { bg: 'var(--product-agroshield-bg)',     fg: 'var(--product-agroshield-fg)',     Icon: ShieldCheck, label: 'AgroShield'     },
  MACHINEINSIGHT: { bg: 'var(--product-machineinsight-bg)', fg: 'var(--product-machineinsight-fg)', Icon: Truck,       label: 'MachineInsight' },
  PROCESSLINK:    { bg: 'var(--product-processlink-bg)',    fg: 'var(--product-processlink-fg)',    Icon: BarChart3,   label: 'ProcessLink'    },
  ASSETGUARD:     { bg: 'var(--product-assetguard-bg)',     fg: 'var(--product-assetguard-fg)',     Icon: MapPin,      label: 'AssetGuard'     },
  ENERGYLINK:     { bg: 'var(--product-energylink-bg)',     fg: 'var(--product-energylink-fg)',     Icon: Zap,         label: 'EnergyLink'     },
}

const STATUS_META: Record<string, { label: string; bg: string; fg: string; pulse: boolean }> = {
  rendered:   { label: 'Renderizado', bg: 'var(--accent-light)', fg: 'var(--accent-dark)', pulse: false },
  dispatched: { label: 'Procesando',  bg: '#DBEAFE',             fg: '#1D4ED8',             pulse: true  },
  error:      { label: 'Error',       bg: '#FEE2E2',             fg: '#991B1B',             pulse: false },
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const total      = MOCK_POSTS.length
  const rendered   = MOCK_POSTS.filter(p => p.status === 'rendered').length
  const processing = MOCK_POSTS.filter(p => p.status === 'dispatched').length
  const rate       = Math.round((rendered / total) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Stat row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12 }}>

        {/* Gradient card */}
        <div
          style={{
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-card)',
            padding: '22px 26px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: 400, margin: 0 }}>
              Videos esta semana
            </p>
            <Film size={20} color="rgba(255,255,255,0.3)" />
          </div>
          <p style={{ color: '#fff', fontSize: 32, fontWeight: 600, margin: '10px 0 4px', lineHeight: 1 }}>
            {total}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, margin: 0 }}>
            {rendered} renderizados · {processing} procesando
          </p>
        </div>

        {/* Donut card */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <DonutChart pct={rate} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>Tasa de render</p>
        </div>
      </div>

      {/* ── Recent videos ── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card)',
          padding: '20px 22px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h2 style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, margin: 0 }}>
            Videos recientes
          </h2>
          <button
            style={{
              color: 'var(--accent)',
              fontSize: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Ver todos
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_POSTS.map(post => (
            <PostRow key={post.id} post={post} />
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DonutChart({ pct }: { pct: number }) {
  const r    = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg width="76" height="76" viewBox="0 0 76 76">
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--accent-light)" strokeWidth="7" />
      <circle
        cx="38" cy="38" r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text
        x="38" y="43"
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill="var(--text-primary)"
        fontFamily="inherit"
      >
        {pct}%
      </text>
    </svg>
  )
}

function PostRow({ post }: { post: typeof MOCK_POSTS[0] }) {
  const cfg = PRODUCT_CFG[post.product]
  const sm  = STATUS_META[post.status] ?? STATUS_META.error
  const Icon = cfg?.Icon ?? Film

  return (
    <div
      style={{
        background: 'var(--bg-card-soft)',
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Product icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-icon)',
          background: cfg?.bg ?? '#F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: cfg?.fg ?? 'var(--text-secondary)' }} />
      </div>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 500,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {post.headline}
        </p>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 11, margin: '3px 0 0' }}>
          {cfg?.label ?? post.product} · {post.createdAt}
          {post.sizeMB > 0 ? ` · ${post.sizeMB} MB` : ''}
        </p>
      </div>

      {/* Status pill */}
      <div
        style={{
          background: sm.bg,
          color: sm.fg,
          borderRadius: 999,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
        }}
      >
        {sm.pulse && (
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: sm.fg,
              animation: 'pulse-dot 2s ease-in-out infinite',
            }}
          />
        )}
        {sm.label}
      </div>
    </div>
  )
}
