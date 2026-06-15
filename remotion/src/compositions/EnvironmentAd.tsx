// src/compositions/EnvironmentAd.tsx
// Composición principal — 100% dinámica, todo viene de props generadas por Claude
// Cada render produce un video único según el prompt del usuario

import {
  AbsoluteFill,
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { z } from 'zod'
import { SceneSlide } from '../components/SceneSlide'
import { BrandOverlay } from '../components/BrandOverlay'
import { ProgressBar } from '../components/ProgressBar'

// ─────────────────────────────────────────
// SCHEMA — valida las props que llegan de Claude
// ─────────────────────────────────────────

export const sceneSchema = z.object({
  text: z.string(),
  subtext: z.string().optional(),
  durationSec: z.number().min(2).max(15),
  style: z.enum(['hook', 'problem', 'solution', 'feature', 'cta']),
})

export const environmentAdSchema = z.object({
  product: z.enum([
    'AGROSHIELD',
    'MACHINEINSIGHT',
    'PROCESSLINK',
    'ASSETGUARD',
    'ENERGYLINK',
    'OPERATIONS_CLOUD',
  ]),
  productColor: z.string(),
  headline: z.string(),
  scenes: z.array(sceneSchema).min(3).max(8),
  voiceover: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  audioUrl: z.string().optional(),
})

export type EnvironmentAdProps = z.infer<typeof environmentAdSchema>

export const PRODUCT_PALETTES: Record<string, {
  primary: string
  secondary: string
  bg: string
  bgAlt: string
  label: string
}> = {
  AGROSHIELD: {
    primary: '#10B981',
    secondary: '#06B6D4',
    bg: '#0A0F1E',
    bgAlt: '#0E1628',
    label: 'AgroShield',
  },
  MACHINEINSIGHT: {
    primary: '#3B82F6',
    secondary: '#06B6D4',
    bg: '#0A0F1E',
    bgAlt: '#0B1220',
    label: 'MachineInsight',
  },
  PROCESSLINK: {
    primary: '#8B5CF6',
    secondary: '#06B6D4',
    bg: '#0A0F1E',
    bgAlt: '#0D0E24',
    label: 'ProcessLink',
  },
  ASSETGUARD: {
    primary: '#F59E0B',
    secondary: '#EF4444',
    bg: '#0A0F1E',
    bgAlt: '#120F0A',
    label: 'AssetGuard',
  },
  ENERGYLINK: {
    primary: '#06B6D4',
    secondary: '#10B981',
    bg: '#0A0F1E',
    bgAlt: '#091520',
    label: 'EnergyLink',
  },
  OPERATIONS_CLOUD: {
    primary: '#64748B',
    secondary: '#06B6D4',
    bg: '#0A0F1E',
    bgAlt: '#0E1220',
    label: 'Environment',
  },
}

export const calculateEnvironmentAdMetadata = ({
  props,
}: {
  props: EnvironmentAdProps
  defaultProps: EnvironmentAdProps
  abortSignal: AbortSignal
}) => {
  const totalSec = props.scenes.reduce((acc: number, s: { durationSec: number }) => acc + s.durationSec, 0)
  return {
    durationInFrames: Math.ceil(totalSec * 30),
    fps: 30,
  }
}

export const EnvironmentAd: React.FC<EnvironmentAdProps> = ({
  product,
  productColor,
  scenes,
  audioUrl,
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames, width, height } = useVideoConfig()

  const palette = PRODUCT_PALETTES[product] ?? PRODUCT_PALETTES.OPERATIONS_CLOUD
  const primaryColor = productColor || palette.primary

  let sceneStart = 0
  let currentSceneIdx = 0
  let frameInScene = 0

  for (let i = 0; i < scenes.length; i++) {
    const sceneDurationFrames = Math.ceil(scenes[i].durationSec * fps)
    if (frame < sceneStart + sceneDurationFrames) {
      currentSceneIdx = i
      frameInScene = frame - sceneStart
      break
    }
    sceneStart += sceneDurationFrames
    currentSceneIdx = i
    frameInScene = frame - sceneStart
  }

  const currentScene = scenes[currentSceneIdx]

  const globalFadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const globalFadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  const globalOpacity = Math.min(globalFadeIn, globalFadeOut)

  return (
    <AbsoluteFill style={{ background: palette.bg, opacity: globalOpacity }}>

      {audioUrl && (
        <Audio src={audioUrl} startFrom={0} />
      )}

      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 8,
            background: primaryColor,
          }}
        />
      </AbsoluteFill>

      <SceneSlide
        scene={currentScene}
        frameInScene={frameInScene}
        fps={fps}
        primaryColor={primaryColor}
        palette={palette}
        width={width}
        height={height}
        sceneIndex={currentSceneIdx}
        totalScenes={scenes.length}
      />

      <BrandOverlay
        product={product}
        palette={palette}
        frame={frame}
        fps={fps}
        height={height}
        width={width}
      />

      <ProgressBar
        frame={frame}
        totalFrames={durationInFrames}
        color={primaryColor}
        width={width}
        height={height}
      />

    </AbsoluteFill>
  )
}
