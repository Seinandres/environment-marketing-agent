#!/usr/bin/env node
// scripts/render-environment-ad.mjs
// Corre dentro de GitHub Actions
// 1. Recibe las props generadas por Claude (vía payload del dispatch)
// 2. Genera la voz con Edge-TTS
// 3. Sube el audio a Supabase (para que Remotion lo use)
// 4. Renderiza con Remotion pasando todas las props
// 5. Sube el MP4 final a Supabase
// 6. Notifica a la app

import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const {
  VIDEO_PROPS,
  POST_IDS,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  WEBHOOK_URL,
  CRON_SECRET,
  RUN_ID,
} = process.env

if (!VIDEO_PROPS || !POST_IDS) {
  console.error('Faltan VIDEO_PROPS o POST_IDS')
  process.exit(1)
}

const props = JSON.parse(VIDEO_PROPS)
const postIds = JSON.parse(POST_IDS)
const WORK_DIR = '/tmp/environment-render'
const VOICE = 'es-CL-LorenzoNeural'

mkdirSync(WORK_DIR, { recursive: true })

function sh(cmd) {
  console.log(`$ ${cmd.substring(0, 120)}`)
  execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' })
}

async function main() {
  console.log(`\n🎬 Iniciando render: "${props.headline}"`)
  console.log(`📦 Producto: ${props.product}`)
  console.log(`🎭 Escenas: ${props.scenes.length}`)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // ── 1. Generar voz en off con Edge-TTS ──
  console.log('\n🎙️ Generando voz en off...')
  const voiceoverFile = `${WORK_DIR}/voiceover.mp3`
  const scriptFile = `${WORK_DIR}/script.txt`

  writeFileSync(scriptFile, props.voiceover, 'utf-8')
  sh(`edge-tts --voice "${VOICE}" --file "${scriptFile}" --write-media "${voiceoverFile}" --rate=+5%`)

  // ── 2. Subir audio a Supabase ──
  console.log('\n☁️ Subiendo audio a Supabase...')
  const audioBuffer = readFileSync(voiceoverFile)
  const audioPath = `audio/${RUN_ID}_voiceover.mp3`

  const { error: audioError } = await supabase.storage
    .from('marketing-assets')
    .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg', upsert: false })

  if (audioError) throw new Error(`Audio upload error: ${audioError.message}`)

  const { data: audioData } = supabase.storage
    .from('marketing-assets')
    .getPublicUrl(audioPath)

  const audioUrl = audioData.publicUrl
  console.log(`✅ Audio: ${audioUrl}`)

  // ── 3. Props finales para Remotion ──
  const remotionProps = { ...props, audioUrl }
  const propsFile = `${WORK_DIR}/props.json`
  writeFileSync(propsFile, JSON.stringify(remotionProps), 'utf-8')

  // ── 4. Renderizar con Remotion ──
  console.log('\n🎥 Renderizando video con Remotion...')
  const outputFile = `${WORK_DIR}/output.mp4`

  sh(
    `npx remotion render EnvironmentAd "${outputFile}" ` +
    `--props="${propsFile}" ` +
    `--concurrency=2 ` +
    `--log=verbose`
  )

  console.log('✅ Video renderizado')

  // ── 5. Subir MP4 a Supabase ──
  console.log('\n☁️ Subiendo video a Supabase...')
  const videoBuffer = readFileSync(outputFile)
  const videoPath = `videos/${RUN_ID}_${props.product.toLowerCase()}.mp4`

  const { error: videoError } = await supabase.storage
    .from('marketing-assets')
    .upload(videoPath, videoBuffer, { contentType: 'video/mp4', upsert: false })

  if (videoError) throw new Error(`Video upload error: ${videoError.message}`)

  const { data: videoData } = supabase.storage
    .from('marketing-assets')
    .getPublicUrl(videoPath)

  const videoUrl = videoData.publicUrl
  console.log(`✅ Video: ${videoUrl}`)

  // ── 6. Notificar a la app ──
  console.log('\n📡 Notificando a la app...')
  const res = await fetch(`${WEBHOOK_URL}/api/webhooks/render-complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      postIds,
      success: true,
      videoUrl,
      audioUrl,
      runId: RUN_ID,
    }),
  })

  if (!res.ok) throw new Error(`Webhook error: ${await res.text()}`)

  console.log('\n🎉 Pipeline completo. Telegram enviará el video al usuario.')
}

main().catch(async (err) => {
  console.error('\n❌ Error en el render:', err)

  try {
    await fetch(`${process.env.WEBHOOK_URL}/api/webhooks/render-complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postIds: JSON.parse(process.env.POST_IDS ?? '[]'),
        success: false,
        error: String(err),
        runId: process.env.RUN_ID,
      }),
    })
  } catch {}

  process.exit(1)
})
