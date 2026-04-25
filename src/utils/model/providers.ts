import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { existsSync, readFileSync, statSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'openai'

let codexOAuthCache: { key: string; value: boolean } | null = null

function hasSavedCodexOAuth(): boolean {
  const configHome = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
  const candidates = [
    join(configHome, '.config.json'),
    join(process.env.CLAUDE_CONFIG_DIR || homedir(), '.claude.json'),
  ]

  const cacheKey = candidates
    .map((file) => {
      try {
        return `${file}:${statSync(file).mtimeMs}`
      } catch {
        return `${file}:missing`
      }
    })
    .join('|')

  if (codexOAuthCache?.key === cacheKey) {
    return codexOAuthCache.value
  }

  for (const file of candidates) {
    try {
      if (!existsSync(file)) continue
      const config = JSON.parse(readFileSync(file, 'utf8')) as {
        codexOAuth?: {
          accessToken?: string
          refreshToken?: string
          expiresAt?: number
          accountId?: string
        }
      }
      if (
        config.codexOAuth?.accessToken &&
        config.codexOAuth.refreshToken &&
        config.codexOAuth.expiresAt &&
        config.codexOAuth.accountId
      ) {
        codexOAuthCache = { key: cacheKey, value: true }
        return true
      }
    } catch {
      // Invalid config should not break provider selection; fall back to 1P.
    }
  }

  codexOAuthCache = { key: cacheKey, value: false }
  return false
}

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : isCustomOpenAICompatibleProvider() ||
            isEnvTruthy(process.env.CLAUDE_CODE_USE_OPENAI)
          ? 'openai'
          : hasSavedCodexOAuth()
            ? 'openai'
            : 'firstParty'
}

export function isCustomOpenAICompatibleProvider(): boolean {
  return (
    process.env.ARC_MODEL_PROVIDER?.toLowerCase() === 'openai-compatible'
  )
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
