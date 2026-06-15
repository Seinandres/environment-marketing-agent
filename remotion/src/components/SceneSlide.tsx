// src/components/SceneSlide.tsx
// Renderiza cada escena del video con animaciones específicas según el estilo
// hook / problem / solution / feature / cta — cada uno tiene su propia animación

import { interpolate, spring } from 'remotion'

interface Scene {
  text: string
  subtext?: string
  durationSec: number
  style: 'hook' | 'problem' | 'solution' | 'feature' | 'cta'
}

interface Palette {
  primary: string
  secondary: string
  bg: string
  bgAlt: string
  label: string
}

interface SceneSlideProps {
  scene: Scene
  frameInScene: number
  fps: number
  primaryColor: string
  palette: Palette
  width: number
  height: number
  sceneIndex: number
  totalScenes: number
}

const STYLE_CONFIG = {
  hook: {
    textSize: 88,
    textAlign: 'center' as const,
    layout: 'center',
    accentLine: true,
    bgOpacity: 0,
  },
  problem: {
    textSize: 72,
    textAlign: 'left' as const,
    layout: 'bottom-left',
    accentLine: false,
    bgOpacity: 0.3,
  },
  solution: {
    textSize: 80,
    textAlign: 'center' as const,
    layout: 'center',
    accentLine: true,
    bgOpacity: 0,
  },
  feature: {
    textSize: 68,
    textAlign: 'left' as const,
    layout: 'center-left',
    accentLine: false,
    bgOpacity: 0.2,
  },
  cta: {
    textSize: 96,
    textAlign: 'center' as const,
    layout: 'center',
    accentLine: true,
    bgOpacity: 0,
  },
}

export const SceneSlide: React.FC<SceneSlideProps> = ({
  scene,
  frameInScene,
  fps,
  primaryColor,
  palette,
  sceneIndex,
}) => {
  const config = STYLE_CONFIG[scene.style]
  const sceneDurationFrames = Math.ceil(scene.durationSec * fps)

  const textEnterProgress = spring({
    frame: frameInScene,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
    durationInFrames: 20,
  })

  const textY = interpolate(textEnterProgress, [0, 1], [60, 0])
  const textOpacity = interpolate(textEnterProgress, [0, 1], [0, 1])

  const subtextProgress = spring({
    frame: Math.max(0, frameInScene - 8),
    fps,
    config: { damping: 20, stiffness: 100, mass: 1 },
    durationInFrames: 18,
  })

  const subtextY = interpolate(subtextProgress, [0, 1], [30, 0])
  const subtextOpacity = interpolate(subtextProgress, [0, 1], [0, 1])

  const fadeOut = interpolate(
    frameInScene,
    [sceneDurationFrames - 12, sceneDurationFrames - 2],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  const accentProgress = spring({
    frame: frameInScene,
    fps,
    config: { damping: 25, stiffness: 200 },
    durationInFrames: 15,
  })

  const accentWidth = interpolate(accentProgress, [0, 1], [0, 120])

  const layoutStyles: Record<string, React.CSSProperties> = {
    center: {
      top: '50%',
      transform: 'translateY(-50%)',
      padding: '0 80px',
    },
    'bottom-left': {
      bottom: '220px',
      padding: '0 80px',
    },
    'center-left': {
      top: '45%',
      transform: 'translateY(-50%)',
      padding: '0 80px',
    },
  }

  const bgColor = sceneIndex % 2 === 0 ? palette.bg : palette.bgAlt

  const isHook = scene.style === 'hook'
  const isCta = scene.style === 'cta'

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: bgColor,
        opacity: fadeOut,
      }}
    >
      {config.bgOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `${primaryColor}${Math.round(config.bgOpacity * 255).toString(16).padStart(2, '0')}`,
          }}
        />
      )}

      {isCta && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 800,
            height: 400,
            background: `${primaryColor}18`,
            borderRadius: 32,
            border: `2px solid ${primaryColor}40`,
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          textAlign: config.textAlign,
          ...layoutStyles[config.layout],
        }}
      >
        {config.accentLine && (
          <div
            style={{
              width: accentWidth,
              height: 5,
              background: primaryColor,
              borderRadius: 3,
              marginBottom: 32,
              ...(config.textAlign === 'center'
                ? { margin: '0 auto 32px' }
                : { marginBottom: 32 }),
            }}
          />
        )}

        <div
          style={{
            transform: `translateY(${textY}px)`,
            opacity: textOpacity,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: config.textSize,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.2,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: isHook ? '-2px' : isCta ? '-3px' : '-1px',
            }}
          >
            {scene.text}
          </p>
        </div>

        {scene.subtext && (
          <div
            style={{
              transform: `translateY(${subtextY}px)`,
              opacity: subtextOpacity,
              marginTop: 28,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: isCta ? 52 : 42,
                fontWeight: 400,
                color: isCta ? primaryColor : 'rgba(255,255,255,0.65)',
                lineHeight: 1.4,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {scene.subtext}
            </p>
          </div>
        )}

        {isHook && (
          <div
            style={{
              position: 'absolute',
              top: -80,
              left: config.textAlign === 'center' ? '50%' : 80,
              transform: config.textAlign === 'center' ? 'translateX(-50%)' : 'none',
              fontSize: 200,
              color: `${primaryColor}20`,
              fontFamily: 'Georgia, serif',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            "
          </div>
        )}
      </div>
    </div>
  )
}
