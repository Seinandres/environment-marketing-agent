import { NextRequest, NextResponse } from 'next/server'
import { unzipSync } from 'fflate'

interface GitHubArtifact {
  id: number
  name: string
  archive_download_url: string
}

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

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // Get artifact list for this run
  const artifactsRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}/artifacts`,
    { headers }
  )

  if (!artifactsRes.ok) {
    return NextResponse.json({ error: 'No se pudo obtener los artifacts' }, { status: 502 })
  }

  const { artifacts } = await artifactsRes.json() as { artifacts: GitHubArtifact[] }

  if (!artifacts?.length) {
    return NextResponse.json({ error: 'No hay artifacts para este run' }, { status: 404 })
  }

  // Download the zip (GitHub redirects to a pre-signed URL — fetch follows it automatically)
  const zipRes = await fetch(artifacts[0].archive_download_url, { headers })

  if (!zipRes.ok) {
    return NextResponse.json({ error: 'Error descargando el artifact' }, { status: 502 })
  }

  const zipBytes = new Uint8Array(await zipRes.arrayBuffer())

  // Extract the MP4 from the zip
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(zipBytes)
  } catch {
    return NextResponse.json({ error: 'El archivo ZIP está corrupto' }, { status: 502 })
  }

  const mp4Entry = Object.entries(unzipped).find(([name]) => name.endsWith('.mp4'))

  if (!mp4Entry) {
    return NextResponse.json({ error: 'No se encontró MP4 en el artifact' }, { status: 404 })
  }

  const [filename, mp4Bytes] = mp4Entry
  const mp4Buffer = Buffer.from(mp4Bytes)

  return new NextResponse(mp4Buffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(mp4Buffer.byteLength),
    },
  })
}
