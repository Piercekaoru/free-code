import type { LocalCommandResult } from '../../types/command.js'
import {
  checkGitHubReleaseUpdate,
  installGitHubReleaseUpdate,
} from '../../utils/githubReleaseUpdater.js'

type UpdateArgs = {
  check: boolean
  force: boolean
  version?: string
}

function parseArgs(args: string): UpdateArgs {
  const parsed: UpdateArgs = {
    check: false,
    force: false,
  }

  const parts = args.trim().split(/\s+/).filter(Boolean)
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]

    if (part === '--check') {
      parsed.check = true
      continue
    }

    if (part === '--force') {
      parsed.force = true
      continue
    }

    if (part === '--version' && parts[i + 1]) {
      parsed.version = parts[i + 1]
      i += 1
      continue
    }

    if (part?.startsWith('--version=')) {
      parsed.version = part.slice('--version='.length)
      continue
    }

    if (part && !part.startsWith('-') && !parsed.version) {
      parsed.version = part
      continue
    }

    throw new Error(`Unknown update argument: ${part}`)
  }

  return parsed
}

export async function call(args: string): Promise<LocalCommandResult> {
  try {
    const options = parseArgs(args)

    if (options.check) {
      const update = await checkGitHubReleaseUpdate({
        version: options.version,
        useCache: false,
      })

      return {
        type: 'text',
        value: update.updateAvailable
          ? [
              `Update available: ${update.currentVersion} -> ${update.latestVersion}`,
              `Asset: ${update.assetName}`,
              `Run: arc update${options.version ? ` --version ${update.tagName}` : ''}`,
            ].join('\n')
          : `Arc is up to date (${update.currentVersion})`,
      }
    }

    const result = await installGitHubReleaseUpdate({
      version: options.version,
      force: options.force,
    })

    return {
      type: 'text',
      value: [
        `Updated arc: ${result.currentVersion} -> ${result.latestVersion}`,
        `Asset: ${result.assetName}`,
        `Installed: ${result.installPath}`,
        'Restart arc to use the new version.',
      ].join('\n'),
    }
  } catch (error) {
    return {
      type: 'text',
      value: `Update failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
