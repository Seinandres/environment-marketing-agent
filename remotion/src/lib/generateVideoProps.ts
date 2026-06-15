// src/lib/generateVideoProps.ts
// Claude convierte un prompt libre en props para Remotion

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

async function detectProduct(prompt: string): Promise<string> {
  const keywords: Record<string, string[]> = {
    AGROSHIELD: ['agro', 'agroshield', 'pivote', 'riego', 'cable', 'robo', 'campo', 'viña', 'frutícola', 'bomba', 'agricultor'],
    MACHINEINSIGHT: ['tractor', 'maquinaria', 'machine', 'machineinsight', 'flota', 'equipo', 'horometro', 'contratista', 'horas'],
    PROCESSLINK: ['plc', 'modbus', 'proceso', 'processlink', 'industrial', 'carwash', 'car wash', 'controlador', 'dashboard'],
    ASSETGUARD: ['asset', 'assetguard', 'generador', 'remolque', 'activo', 'geocerca', 'gps', 'móvil'],
    ENERGYLINK: ['energía', 'energy', 'eléctrico', 'medidor', 'consumo', 'potencia'],
  }

  const lower = prompt.toLowerCase()
  for (const [product, words] of Object.entries(keywords)) {
    if (words.some((w) => lower.includes(w))) return product
  }

  return 'AGROSHIELD'
}

export async function generateVideoProps(
  userPrompt: string,
  forceProduct?: string
): Promise<RemotionVideoProps> {
  const product = forceProduct ?? (await detectProduct(userPrompt))
  const productCtx = PRODUCT_CONTEXT[product] ?? PRODUCT_CONTEXT.OPERATIONS_CLOUD
  const productColor = PRODUCT_COLORS[product] ?? '#10B981'

  const systemPrompt = `Eres el director creativo de Environment, empresa chilena de SaaS IoT.
Tu trabajo es crear videos de marketing únicos y potentes para Instagram Reels y LinkedIn.

PRODUCTO ACTUAL: ${productCtx}

REGLAS DE DISEÑO DE VIDEO:
- Cada video debe ser diferente al anterior — varía la estructura, el gancho, el ángulo.
- El gancho (escena 1) debe ser impactante: una pregunta, un dato, una afirmación desafiante.
- Máximo 6 escenas, mínimo 4. Cada una dura entre 5 y 8 segundos.
- El texto en pantalla es CORTO: máximo 8 palabras por escena.
- El subtext complementa sin repetir el texto principal.
- Los estilos disponibles son: hook, problem, solution, feature, cta.
- La voz en off es la narración completa en español chileno, natural y conversacional.
- El copy de caption es diferente a la voz — es el texto para acompañar el post en redes.
- NUNCA menciones precios.
- SIEMPRE cierra con CTA a environment.cl
- Sé conciso. Máximo 5 escenas. Voiceover máximo 100 palabras. Caption máximo 80 palabras.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Crea un video de marketing para este prompt:

"${userPrompt}"

Responde ÚNICAMENTE con este JSON válido, sin markdown, sin texto adicional:
{
  "headline": "titular principal del video (máx 6 palabras)",
  "scenes": [
    {
      "text": "texto en pantalla (máx 8 palabras)",
      "subtext": "complemento corto opcional",
      "durationSec": 6,
      "style": "hook"
    }
  ],
  "voiceover": "guion completo de voz en off, narración natural en español chileno, entre 80 y 120 palabras",
  "caption": "texto para acompañar el post en Instagram y LinkedIn, entre 80 y 120 palabras con CTA al final",
  "hashtags": ["Environment", "IoT", "otros", "hashtags", "relevantes"]
}`,
      },
    ],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()

  let parsed: Omit<RemotionVideoProps, 'product' | 'productColor'>

  try {
    parsed = JSON.parse(raw)
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude no retornó JSON válido')
    parsed = JSON.parse(jsonMatch[0])
  }

  return {
    product,
    productColor,
    headline: parsed.headline,
    scenes: parsed.scenes,
    voiceover: parsed.voiceover,
    caption: parsed.caption,
    hashtags: parsed.hashtags,
  }
}
