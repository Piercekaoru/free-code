import type { Command } from '../../commands.js'

const update: Command = {
  type: 'local',
  name: 'update',
  aliases: ['upgrade-self'],
  description: 'Update arc from GitHub Releases',
  argumentHint: '[--check] [--version v2.1.90] [--force]',
  supportsNonInteractive: true,
  load: () => import('./update.js'),
}

export default update
