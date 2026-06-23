import { NextRequest, NextResponse } from 'next/server'
import { generateVideoProps } from '@/lib/generateVideoProps'

export async function POST(req: NextRequest) {
  try {
    const { topic, product, dispatch, refinement } = await req.json()

    if (!topic || typeof topic !== 'string' || topic.trim().length < 5) {
      return NextResponse.json({ error: 'topic es requerido (mínimo 5 caracteres)' }, { status: 400 })
    }

    const props = await generateVideoProps(topic.trim(), product ?? undefined, refinement ?? undefined)

    let runId: string | null = null
    if (dispatch) {
      runId = await triggerGitHubRender(props)
    }

    return NextResponse.json({ props, runId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[generate-video]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function triggerGitHubRender(props: object): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO

  if (!token || !repo) {
    console.warn('[generate-video] GITHUB_TOKEN o GITHUB_REPO no configurados — render omitido')
    return null
  }

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: ghHeaders,
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

  // Wait for GitHub to register the run (usually 2-3s)
  await new Promise(r => setTimeout(r, 4000))

  const runsRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/render-environment-ad.yml/runs?event=repository_dispatch&per_page=1`,
    { headers: ghHeaders }
  )

  if (!runsRes.ok) return null
  const { workflow_runs } = await runsRes.json() as { workflow_runs: Array<{ id: number }> }
  return workflow_runs?.[0]?.id?.toString() ?? null
}
