/* eslint-disable @typescript-eslint/no-explicit-any */
import { Composition } from 'remotion'
import {
  EnvironmentAd,
  environmentAdSchema,
  calculateEnvironmentAdMetadata,
} from './compositions/EnvironmentAd'

const REELS = { width: 1080, height: 1920 }

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="EnvironmentAd"
      component={EnvironmentAd as any}
      durationInFrames={900}
      fps={30}
      width={REELS.width}
      height={REELS.height}
      schema={environmentAdSchema}
      calculateMetadata={calculateEnvironmentAdMetadata}
      defaultProps={{
        product: 'AGROSHIELD' as const,
        productColor: '#10B981',
        headline: 'Preview',
        scenes: [
          { text: 'Escena 1', durationSec: 5, style: 'hook' as const },
          { text: 'Escena 2', durationSec: 5, style: 'problem' as const },
          { text: 'Escena 3', durationSec: 5, style: 'cta' as const },
        ],
        voiceover: '',
        caption: '',
        hashtags: [],
      }}
    />
  </>
)
