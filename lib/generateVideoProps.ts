import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface VideoScene {
  text: string
  subtext?: string
  durationSec: number
  style: 'hook' | 'problem' | 'solution' | 'feature' | 'cta'
}

export interface RemotionVideoProps {
  product: string
  productColor: string
  headline: string
  scenes: VideoScene[]
  voiceover: string
  caption: string
  hashtags: string[]
}

const PRODUCT_CONTEXT: Record<string, string> = {
  AGROSHIELD: 'AgroShield — seguridad agrícola: protege pivotes, carretes, bombas y cables. Dolor: robo nocturno. Promesa: alertas tempranas.',
  MACHINEINSIGHT: 'MachineInsight — maquinaria conectada: horas reales, ubicación, uso autorizado. Dolor: falta de control. Promesa: datos reales.',
  PROCESSLINK: 'ProcessLink — digitalización de procesos: PLC, Modbus, dashboards. Dolor: datos sin visibilidad. Promesa: reportes automáticos.',
  ASSETGUARD: 'AssetGuard — activos móviles: GPS, geocercas, alertas. Dolor: activos sin trazabilidad. Promesa: localización y alertas.',
  ENERGYLINK: 'EnergyLink — energía: variables eléctricas, medidores. Dolor: consumo sin control. Promesa: detección y reportes.',
  OPERATIONS_CLOUD: 'Environment Operations Cloud — plataforma SaaS para activos y procesos en terreno.',
}

const PRODUCT_COLORS: Record<string, string> = {
  AGROSHIELD: '#10B981',
  MACHINEINSIGHT: '#3B82F6',
  PROCESSLINK: '#8B5CF6',
  ASSETGUARD: '#F59E0B',
  ENERGYLINK: '#06B6D4',
  OPERATIONS_CLOUD: '#64748B',
}

export async function generateVideoProps(
  userPrompt: string,
  forceProduct?: string
): Promise<RemotionVideoProps> {
  const product = forceProduct ?? detectProduct(userPrompt)
  const productCtx = PRODUCT_CONTEXT[product] ?? PRODUCT_CONTEXT.OPERATIONS_CLOUD
  const productColor = PRODUCT_COLORS[product] ?? '#10B981'

  const systemPrompt = `Eres el director creativo de Environment, empresa chilena de SaaS IoT.
Tu trabajo es crear videos de marketing únicos y potentes para Instagram Reels y LinkedIn.

PRODUCTO ACTUAL: ${productCtx}

REGLAS:
- Máximo 5 escenas, mínimo 3. Cada una dura entre 5 y 8 segundos.
- El texto en pantalla es CORTO: máximo 8 palabras por escena.
- Estilos disponibles: hook, problem, solution, feature, cta.
- Voiceover máximo 100 palabras en español chileno conversacional.
- Caption máximo 80 palabras con CTA a environment.cl al final.
- Sé conciso. NUNCA menciones precios.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Crea un video para: "${userPrompt}"

Responde SOLO con este JSON, sin markdown:
{
  "headline": "titular (máx 6 palabras)",
  "scenes": [{"text": "...", "subtext": "...", "durationSec": 6, "style": "hook"}],
  "voiceover": "guion completo...",
  "caption": "texto para redes...",
  "hashtags": ["Environment", "IoT"]
}`,
    }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()
  let parsed: Omit<RemotionVideoProps, 'product' | 'productColor'>

  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Respuesta de Claude no contiene JSON válido')
    parsed = JSON.parse(match[0])
  }

  return { product, productColor, headline: parsed.headline, scenes: parsed.scenes, voiceover: parsed.voiceover, caption: parsed.caption, hashtags: parsed.hashtags }
}

function detectProduct(prompt: string): string {
  const lower = prompt.toLowerCase()
  const keywords: Record<string, string[]> = {
    AGROSHIELD: ['agro', 'agroshield', 'pivote', 'riego', 'robo', 'campo', 'viña', 'bomba'],
    MACHINEINSIGHT: ['tractor', 'maquinaria', 'machine', 'flota', 'horometro', 'horas'],
    PROCESSLINK: ['plc', 'modbus', 'proceso', 'processlink', 'industrial', 'carwash'],
    ASSETGUARD: ['asset', 'assetguard', 'generador', 'remolque', 'activo', 'geocerca'],
    ENERGYLINK: ['energía', 'energy', 'eléctrico', 'medidor', 'consumo', 'potencia'],
  }
  for (const [product, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) return product
  }
  return 'AGROSHIELD'
}
