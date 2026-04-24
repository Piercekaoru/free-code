import { feature } from 'bun:bundle'
import * as React from 'react'
import type { AutoUpdaterResult } from '../utils/autoUpdater.js'
import { isAutoUpdaterDisabled } from '../utils/config.js'
import { logForDebugging } from '../utils/debug.js'
import { getCurrentInstallationType } from '../utils/doctorDiagnostic.js'
import { AutoUpdater } from './AutoUpdater.js'
import { NativeAutoUpdater } from './NativeAutoUpdater.js'
import { PackageManagerAutoUpdater } from './PackageManagerAutoUpdater.js'

type Props = {
  isUpdating: boolean
  onChangeIsUpdating: (isUpdating: boolean) => void
  onAutoUpdaterResult: (autoUpdaterResult: AutoUpdaterResult) => void
  autoUpdaterResult: AutoUpdaterResult | null
  showSuccessMessage: boolean
  verbose: boolean
}

export function AutoUpdaterWrapper(props: Props): React.ReactNode {
  const [useNativeInstaller, setUseNativeInstaller] = React.useState<
    boolean | null
  >(null)
  const [isPackageManager, setIsPackageManager] = React.useState<
    boolean | null
  >(null)

  React.useEffect(() => {
    if (process.env.USER_TYPE !== 'ant') {
      setUseNativeInstaller(false)
      setIsPackageManager(true)
      return
    }

    async function checkInstallation() {
      if (
        feature('SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED') &&
        isAutoUpdaterDisabled()
      ) {
        logForDebugging(
          'AutoUpdaterWrapper: Skipping detection, auto-updates disabled',
        )
        return
      }

      const installationType = await getCurrentInstallationType()
      logForDebugging(
        `AutoUpdaterWrapper: Installation type: ${installationType}`,
      )
      setUseNativeInstaller(installationType === 'native')
      setIsPackageManager(installationType === 'package-manager')
    }

    void checkInstallation()
  }, [])

  if (useNativeInstaller === null || isPackageManager === null) {
    return null
  }

  if (process.env.USER_TYPE !== 'ant') {
    return <PackageManagerAutoUpdater {...props} />
  }

  if (isPackageManager) {
    return null
  }

  const Updater = useNativeInstaller ? NativeAutoUpdater : AutoUpdater

  return <Updater {...props} />
}
