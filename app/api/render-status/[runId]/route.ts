import { NextRequest, NextResponse } from 'next/server'

interface GitHubRun {
  status: string
  conclusion: string | null
}

interface GitHubArtifact {
  id: number
  name: string
  size_in_bytes: number
}

const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github.v3+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO

  if (!token || !repo) {
    return NextResponse.json({ error: 'GitHub no configurado' }, { status: 500 })
  }

  const headers = GH_HEADERS(token)

  // Check run status
  const runRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}`,
    { headers, next: { revalidate: 0 } }
  )

  if (!runRes.ok) {
    // Run may not exist yet if GitHub hasn't registered it
    return NextResponse.json({ status: 'in_progress' })
  }

  const run = await runRes.json() as GitHubRun

  if (run.status !== 'completed') {
    return NextResponse.json({ status: 'in_progress' })
  }

  if (run.conclusion !== 'success') {
    return NextResponse.json({ status: 'failed', conclusion: run.conclusion })
  }

  // Fetch artifacts for this run
  const artifactsRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}/artifacts`,
    { headers, next: { revalidate: 0 } }
  )

  if (!artifactsRes.ok) {
    return NextResponse.json({ status: 'completed', artifact: null })
  }

  const { artifacts } = await artifactsRes.json() as { artifacts: GitHubArtifact[] }

  if (!artifacts?.length) {
    return NextResponse.json({ status: 'completed', artifact: null })
  }

  const artifact = artifacts[0]
  return NextResponse.json({
    status: 'completed',
    artifact: {
      id: artifact.id,
      name: artifact.name,
      sizeMB: (artifact.size_in_bytes / 1024 / 1024).toFixed(2),
    },
  })
}
