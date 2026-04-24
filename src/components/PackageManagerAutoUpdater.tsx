import * as React from 'react'
import { useState } from 'react'
import { useInterval } from 'usehooks-ts'
import { Text } from '../ink.js'
import type { AutoUpdaterResult } from '../utils/autoUpdater.js'
import { isAutoUpdaterDisabled } from '../utils/config.js'
import { logForDebugging } from '../utils/debug.js'
import { checkGitHubReleaseUpdate } from '../utils/githubReleaseUpdater.js'

type Props = {
  isUpdating: boolean
  onChangeIsUpdating: (isUpdating: boolean) => void
  onAutoUpdaterResult: (autoUpdaterResult: AutoUpdaterResult) => void
  autoUpdaterResult: AutoUpdaterResult | null
  showSuccessMessage: boolean
  verbose: boolean
}

export function PackageManagerAutoUpdater({
  verbose,
}: Props): React.ReactNode {
  const [update, setUpdate] = useState<{
    currentVersion: string
    latestVersion: string
  } | null>(null)

  const checkForUpdates = React.useCallback(async () => {
    if (isAutoUpdaterDisabled()) {
      return
    }

    try {
      const latest = await checkGitHubReleaseUpdate()
      setUpdate(
        latest.updateAvailable
          ? {
              currentVersion: latest.currentVersion,
              latestVersion: latest.latestVersion,
            }
          : null,
      )

      if (latest.updateAvailable) {
        logForDebugging(
          `ArcUpdater: Update available ${latest.currentVersion} -> ${latest.latestVersion}`,
        )
      }
    } catch (error) {
      logForDebugging(
        `ArcUpdater: Update check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }, [])

  React.useEffect(() => {
    void checkForUpdates()
  }, [checkForUpdates])

  useInterval(checkForUpdates, 30 * 60 * 1000)

  if (!update) {
    return null
  }

  return (
    <>
      {verbose && (
        <Text dimColor wrap="truncate">
          currentVersion: {update.currentVersion} - latestVersion:{' '}
          {update.latestVersion}
        </Text>
      )}
      <Text color="warning" wrap="truncate">
        Update available: {update.currentVersion} -&gt; {update.latestVersion}.
        Run: <Text bold>arc update</Text>
      </Text>
    </>
  )
}
