// src/components/BrandOverlay.tsx
// Marca de Environment siempre visible en el video

import { interpolate } from 'remotion'

interface Palette {
  primary: string
  secondary: string
  label: string
  bg: string
  bgAlt: string
}

const PRODUCT_LABELS: Record<string, string> = {
  AGROSHIELD: 'AgroShield',
  MACHINEINSIGHT: 'MachineInsight',
  PROCESSLINK: 'ProcessLink',
  ASSETGUARD: 'AssetGuard',
  ENERGYLINK: 'EnergyLink',
  OPERATIONS_CLOUD: 'Operations Cloud',
}

interface BrandOverlayProps {
  product: string
  palette: Palette
  frame: number
  fps: number
  height: number
  width: number
}

export const BrandOverlay: React.FC<BrandOverlayProps> = ({
  product,
  palette,
  frame,
}) => {
  const brandOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const productLabel = PRODUCT_LABELS[product] ?? 'Environment'

  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          opacity: brandOpacity,
        }}
      >
        <div
          style={{
            background: `${palette.primary}22`,
            border: `1.5px solid ${palette.primary}60`,
            borderRadius: 100,
            padding: '10px 32px',
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: palette.primary,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '0.5px',
            }}
          >
            {productLabel}
          </span>
        </div>

        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '4px',
            textTransform: 'uppercase',
          }}
        >
          ENVIRONMENT
        </span>

        <span
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          environment.cl
        </span>
      </div>
    </>
  )
}
