#!/usr/bin/env node
// scripts/render-environment-ad.mjs
// Corre dentro de GitHub Actions
// 1. Recibe las props generadas por Claude (vía payload del dispatch)
// 2. Genera la voz con Edge-TTS
// 3. Si SUPABASE_URL existe: sube audio + video a Supabase y notifica webhook
//    Si no: guarda el MP4 como artifact de GitHub Actions (descarga manual)
// 4. Renderiza con Remotion pasando todas las props
// 5. Siempre copia el MP4 a remotion/out/ para el artifact step del workflow

import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs'
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
// process.cwd() es remotion/ (working-directory del workflow), así el artifact step
// encuentra el MP4 en remotion/out/*.mp4
const OUT_DIR = `${process.cwd()}/out`
const VOICE = 'es-CL-LorenzoNeural'

mkdirSync(WORK_DIR, { recursive: true })
mkdirSync(OUT_DIR, { recursive: true })

function sh(cmd) {
  console.log(`$ ${cmd.substring(0, 120)}`)
  execSync(cmd, { stdio: 'inherit', shell: '/bin/bash' })
}

async function main() {
  console.log(`\n🎬 Iniciando render: "${props.headline}"`)
  console.log(`📦 Producto: ${props.product}`)
  console.log(`🎭 Escenas: ${props.scenes.length}`)
  console.log(SUPABASE_URL ? '☁️  Modo: Supabase activo' : '⚠️  Modo: sin Supabase — se usará artifact de GitHub Actions')

  // ── 1. Generar voz en off con Edge-TTS ──
  console.log('\n🎙️ Generando voz en off...')
  const voiceoverFile = `${WORK_DIR}/voiceover.mp3`
  const scriptFile = `${WORK_DIR}/script.txt`

  writeFileSync(scriptFile, props.voiceover, 'utf-8')
  sh(`edge-tts --voice "${VOICE}" --file "${scriptFile}" --write-media "${voiceoverFile}" --rate=+5%`)

  let audioUrl
  let supabase

  if (SUPABASE_URL) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── 2a. Subir audio a Supabase ──
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

    audioUrl = audioData.publicUrl
    console.log(`✅ Audio en Supabase: ${audioUrl}`)
  } else {
    // Sin Supabase: Remotion usa el archivo local directamente durante el render
    audioUrl = `file://${voiceoverFile}`
    console.log(`📁 Audio local (render only): ${voiceoverFile}`)
  }

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

  // ── 5. Copiar MP4 a remotion/out/ (el artifact step del workflow lo recoge siempre) ──
  const artifactName = `${RUN_ID}_${props.product.toLowerCase()}.mp4`
  const artifactFile = `${OUT_DIR}/${artifactName}`
  copyFileSync(outputFile, artifactFile)
  console.log(`📁 MP4 copiado a remotion/out/${artifactName}`)

  if (SUPABASE_URL) {
    // ── 6. Subir MP4 a Supabase ──
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
    console.log(`✅ Video en Supabase: ${videoUrl}`)

    // ── 7. Notificar a la app vía webhook ──
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
  } else {
    console.log('\n⚠️ Supabase no configurado — video guardado como artifact de GitHub Actions')
    console.log('💡 Descarga el MP4 desde: Actions > esta ejecución > Artifacts')
  }
}

main().catch(async (err) => {
  console.error('\n❌ Error en el render:', err)

  if (SUPABASE_URL && WEBHOOK_URL) {
    try {
      await fetch(`${WEBHOOK_URL}/api/webhooks/render-complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postIds: JSON.parse(POST_IDS ?? '[]'),
          success: false,
          error: String(err),
          runId: RUN_ID,
        }),
      })
    } catch {}
  }

  process.exit(1)
})
