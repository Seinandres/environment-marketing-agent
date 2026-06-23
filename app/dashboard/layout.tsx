'use client'

import { useState } from 'react'
import { Zap, LayoutDashboard, Sparkles, Film, Settings } from 'lucide-react'
import { VideoAgentChat } from './components/VideoAgentChat'

const NAV = [
  { id: 'resumen',       label: 'Resumen',       Icon: LayoutDashboard },
  { id: 'agente',        label: 'Agente',         Icon: Sparkles        },
  { id: 'videos',        label: 'Videos',         Icon: Film            },
  { id: 'configuracion', label: 'Configuración',  Icon: Settings        },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState('resumen')

  return (
    <div
      style={{
        background: 'var(--bg-app)',
        minHeight: '100vh',
        padding: 16,
        gap: 12,
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 180,
          flexShrink: 0,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-card)',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 16,
          minHeight: 'calc(100vh - 32px)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28 }}>
          <div
            style={{
              background: 'var(--accent-gradient)',
              borderRadius: 10,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Zap size={16} color="white" />
          </div>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, lineHeight: '1.2' }}>
            Environment
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ id, label, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: active ? 'var(--bg-sidebar-active)' : 'transparent',
                  color: active ? 'var(--accent-dark)' : 'var(--text-secondary)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  transition: 'background 0.15s ease, color 0.15s ease',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Icon
                  size={15}
                  style={{ color: active ? 'var(--accent-dark)' : 'var(--text-tertiary)', flexShrink: 0 }}
                />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Pipeline status — pushed to bottom */}
        <div
          style={{
            marginTop: 'auto',
            background: 'var(--bg-app)',
            borderRadius: 12,
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'pulse-dot 2s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }}>
              Pipeline activo
            </span>
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>Todo funcionando bien</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: 19, fontWeight: 500, margin: 0, lineHeight: '1.2' }}>
              Hola 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>¿Qué video creamos hoy?</p>
          </div>
          <button
            onClick={() => setTab('agente')}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              transition: 'opacity 0.15s ease',
            }}
            onMouseOver={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')}
            onMouseOut={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
          >
            <Sparkles size={14} />
            Generar video
          </button>
        </div>

        {/* Tab content */}
        {tab === 'resumen' && <>{children}</>}
        {tab === 'agente' && <VideoAgentChat />}
        {tab === 'videos' && (
          <Placeholder text="Próximamente: historial completo de videos generados" />
        )}
        {tab === 'configuracion' && (
          <Placeholder text="Próximamente: configuración del agente y credenciales" />
        )}
      </main>
    </div>
  )
}

function Placeholder({ text }: { text: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card)',
        padding: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
        fontSize: 14,
      }}
    >
      {text}
    </div>
  )
}
