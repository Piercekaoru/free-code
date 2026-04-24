import { access, chmod, mkdir, rename, stat, unlink, writeFile } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { basename, dirname, join } from 'path'
import { tmpdir } from 'os'
import { gt, gte } from './semver.js'

const REPO = 'Piercekaoru/free-code'
const API_BASE = `https://api.github.com/repos/${REPO}/releases`
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

type GitHubReleaseAsset = {
  name: string
  browser_download_url: string
  size?: number
}

type GitHubRelease = {
  tag_name: string
  html_url?: string
  assets: GitHubReleaseAsset[]
}

export type GitHubUpdateInfo = {
  currentVersion: string
  latestVersion: string
  tagName: string
  releaseUrl: string
  assetName: string
  downloadUrl: string
  updateAvailable: boolean
}

export type InstallGitHubUpdateResult = GitHubUpdateInfo & {
  installPath: string
  backupPath: string | null
}

let cachedLatest:
  | {
      fetchedAt: number
      release: GitHubRelease
    }
  | null = null

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/, '')
}

function assetNameForCurrentPlatform(): string {
  if (process.platform === 'darwin') {
    if (process.arch === 'arm64') return 'arc-darwin-arm64'
    if (process.arch === 'x64') return 'arc-darwin-x64'
  }

  if (process.platform === 'linux' && process.arch === 'x64') {
    return 'arc-linux-x64'
  }

  throw new Error(`No Arc release asset for ${process.platform}-${process.arch}`)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `arc/${MACRO.VERSION}`,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub release request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

async function getRelease(version?: string, useCache = true): Promise<GitHubRelease> {
  if (!version && useCache && cachedLatest && Date.now() - cachedLatest.fetchedAt < CACHE_TTL_MS) {
    return cachedLatest.release
  }

  const release = version
    ? await fetchJson<GitHubRelease>(`${API_BASE}/tags/${version.startsWith('v') ? version : `v${version}`}`)
    : await fetchJson<GitHubRelease>(`${API_BASE}/latest`)

  if (!version) {
    cachedLatest = { fetchedAt: Date.now(), release }
  }

  return release
}

export async function checkGitHubReleaseUpdate(options: {
  version?: string
  useCache?: boolean
} = {}): Promise<GitHubUpdateInfo> {
  const release = await getRelease(options.version, options.useCache ?? true)
  const latestVersion = normalizeVersion(release.tag_name)
  const currentVersion = normalizeVersion(MACRO.VERSION)
  const assetName = assetNameForCurrentPlatform()
  const asset = release.assets.find(asset => asset.name === assetName)

  if (!asset) {
    throw new Error(`Release ${release.tag_name} does not contain ${assetName}`)
  }

  return {
    currentVersion,
    latestVersion,
    tagName: release.tag_name,
    releaseUrl: release.html_url ?? `https://github.com/${REPO}/releases/tag/${release.tag_name}`,
    assetName,
    downloadUrl: asset.browser_download_url,
    updateAvailable: gt(latestVersion, currentVersion),
  }
}

function isLikelyRuntimeLauncher(path: string): boolean {
  const name = basename(path)
  return name === 'bun' || name === 'node'
}

async function findArcOnPath(): Promise<string | null> {
  const pathValue = process.env.PATH ?? ''
  for (const dir of pathValue.split(':')) {
    if (!dir) continue
    const candidate = join(dir, 'arc')
    try {
      await access(candidate, fsConstants.X_OK)
      return candidate
    } catch {
      // Try the next PATH entry.
    }
  }
  return null
}

async function resolveInstallPath(): Promise<string> {
  if (process.execPath && !isLikelyRuntimeLauncher(process.execPath)) {
    return process.execPath
  }

  const arcPath = await findArcOnPath()
  if (arcPath) return arcPath

  throw new Error('Could not find the installed arc binary. Re-run install.sh once, then try arc update again.')
}

async function downloadAsset(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': `arc/${MACRO.VERSION}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`)
  }

  const buffer = new Uint8Array(await response.arrayBuffer())
  if (buffer.length === 0) {
    throw new Error('Downloaded update asset is empty')
  }
  return buffer
}

function verifyBinary(path: string): void {
  const proc = Bun.spawnSync({
    cmd: [path, '--version'],
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (proc.exitCode !== 0) {
    const stderr = new TextDecoder().decode(proc.stderr).trim()
    throw new Error(`Downloaded update did not pass --version check${stderr ? `: ${stderr}` : ''}`)
  }
}

export async function installGitHubReleaseUpdate(options: {
  version?: string
  force?: boolean
} = {}): Promise<InstallGitHubUpdateResult> {
  const update = await checkGitHubReleaseUpdate({
    version: options.version,
    useCache: false,
  })

  if (!options.force && !update.updateAvailable && gte(update.currentVersion, update.latestVersion)) {
    throw new Error(`Arc is already up to date (${update.currentVersion})`)
  }

  const installPath = await resolveInstallPath()
  await stat(installPath)
  await access(dirname(installPath), fsConstants.W_OK)

  const tmpDir = join(tmpdir(), `arc-update-${process.pid}-${Date.now()}`)
  await mkdir(tmpDir, { recursive: true })
  const tmpPath = join(tmpDir, update.assetName)
  await writeFile(tmpPath, await downloadAsset(update.downloadUrl))
  await chmod(tmpPath, 0o755)
  verifyBinary(tmpPath)

  const backupPath = `${installPath}.bak-${process.pid}`
  try {
    await rename(installPath, backupPath)
    await rename(tmpPath, installPath)
    await chmod(installPath, 0o755)
  } catch (error) {
    try {
      await stat(backupPath)
      await rename(backupPath, installPath)
    } catch {
      // If rollback also fails, surface the original error.
    }
    throw error
  } finally {
    await unlink(tmpPath).catch(() => {})
  }

  await unlink(backupPath).catch(() => {})

  return {
    ...update,
    installPath,
    backupPath: null,
  }
}
