// src/components/ProgressBar.tsx
// Barra de progreso animada en la parte superior del video

import { interpolate } from 'remotion'

interface ProgressBarProps {
  frame: number
  totalFrames: number
  color: string
  width: number
  height: number
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  frame,
  totalFrames,
  color,
  width,
}) => {
  const progress = interpolate(frame, [0, totalFrames], [0, width], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 8,
        background: 'rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: progress,
          background: color,
          borderRadius: '0 4px 4px 0',
        }}
      />
    </div>
  )
}
