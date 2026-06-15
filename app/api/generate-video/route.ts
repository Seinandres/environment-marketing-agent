import { NextRequest, NextResponse } from 'next/server'
import { generateVideoProps } from '@/lib/generateVideoProps'

export async function POST(req: NextRequest) {
  try {
    const { topic, product, dispatch } = await req.json()

    if (!topic || typeof topic !== 'string' || topic.trim().length < 5) {
      return NextResponse.json({ error: 'topic es requerido (mínimo 5 caracteres)' }, { status: 400 })
    }

    const props = await generateVideoProps(topic.trim(), product ?? undefined)

    if (dispatch) {
      await triggerGitHubRender(props)
    }

    return NextResponse.json({ props })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[generate-video]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function triggerGitHubRender(props: object) {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO

  if (!token || !repo) {
    console.warn('[generate-video] GITHUB_TOKEN o GITHUB_REPO no configurados — render omitido')
    return
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      event_type: 'render-environment-ad',
      client_payload: {
        videoProps: props,
        postIds: [`dashboard-${Date.now()}`],
      },
    }),
  })

  if (!res.ok && res.status !== 204) {
    const body = await res.text()
    throw new Error(`GitHub dispatch falló: ${res.status} ${body}`)
  }
}
