import type { ModelName } from './model.js'
import type { APIProvider } from './providers.js'

export type ModelConfig = Record<APIProvider, ModelName>

export interface OpenAIModelMetadata {
  id: ModelName
  label: string
  description: string
  descriptionForModel: string
  displayName: string
  marketingName: string
  family: 'general' | 'codex'
  showInModelPicker: boolean
  supportedInCodexAdapter: boolean
}

// @[MODEL LAUNCH]: Add a new CLAUDE_*_CONFIG constant here. Double check the correct model strings
// here since the pattern may change.

export const CLAUDE_3_7_SONNET_CONFIG = {
  firstParty: 'claude-3-7-sonnet-20250219',
  bedrock: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
  vertex: 'claude-3-7-sonnet@20250219',
  foundry: 'claude-3-7-sonnet',
  openai: 'claude-3-7-sonnet-20250219',
} as const satisfies ModelConfig

export const CLAUDE_3_5_V2_SONNET_CONFIG = {
  firstParty: 'claude-3-5-sonnet-20241022',
  bedrock: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  vertex: 'claude-3-5-sonnet-v2@20241022',
  foundry: 'claude-3-5-sonnet',
  openai: 'claude-3-5-sonnet-20241022',
} as const satisfies ModelConfig

export const CLAUDE_3_5_HAIKU_CONFIG = {
  firstParty: 'claude-3-5-haiku-20241022',
  bedrock: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  vertex: 'claude-3-5-haiku@20241022',
  foundry: 'claude-3-5-haiku',
  openai: 'claude-3-5-haiku-20241022',
} as const satisfies ModelConfig

export const CLAUDE_HAIKU_4_5_CONFIG = {
  firstParty: 'claude-haiku-4-5-20251001',
  bedrock: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  vertex: 'claude-haiku-4-5@20251001',
  foundry: 'claude-haiku-4-5',
  openai: 'claude-haiku-4-5-20251001',
} as const satisfies ModelConfig

export const CLAUDE_SONNET_4_CONFIG = {
  firstParty: 'claude-sonnet-4-20250514',
  bedrock: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  vertex: 'claude-sonnet-4@20250514',
  foundry: 'claude-sonnet-4',
  openai: 'claude-sonnet-4-20250514',
} as const satisfies ModelConfig

export const CLAUDE_SONNET_4_5_CONFIG = {
  firstParty: 'claude-sonnet-4-5-20250929',
  bedrock: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  vertex: 'claude-sonnet-4-5@20250929',
  foundry: 'claude-sonnet-4-5',
  openai: 'claude-sonnet-4-5-20250929',
} as const satisfies ModelConfig

export const CLAUDE_OPUS_4_CONFIG = {
  firstParty: 'claude-opus-4-20250514',
  bedrock: 'us.anthropic.claude-opus-4-20250514-v1:0',
  vertex: 'claude-opus-4@20250514',
  foundry: 'claude-opus-4',
  openai: 'claude-opus-4-20250514',
} as const satisfies ModelConfig

export const CLAUDE_OPUS_4_1_CONFIG = {
  firstParty: 'claude-opus-4-1-20250805',
  bedrock: 'us.anthropic.claude-opus-4-1-20250805-v1:0',
  vertex: 'claude-opus-4-1@20250805',
  foundry: 'claude-opus-4-1',
  openai: 'claude-opus-4-1-20250805',
} as const satisfies ModelConfig

export const CLAUDE_OPUS_4_5_CONFIG = {
  firstParty: 'claude-opus-4-5-20251101',
  bedrock: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
  vertex: 'claude-opus-4-5@20251101',
  foundry: 'claude-opus-4-5',
  openai: 'claude-opus-4-5-20251101',
} as const satisfies ModelConfig

export const CLAUDE_OPUS_4_6_CONFIG = {
  firstParty: 'claude-opus-4-6',
  bedrock: 'us.anthropic.claude-opus-4-6-v1',
  vertex: 'claude-opus-4-6',
  foundry: 'claude-opus-4-6',
  openai: 'claude-opus-4-6',
} as const satisfies ModelConfig

export const CLAUDE_SONNET_4_6_CONFIG = {
  firstParty: 'claude-sonnet-4-6',
  bedrock: 'us.anthropic.claude-sonnet-4-6',
  vertex: 'claude-sonnet-4-6',
  foundry: 'claude-sonnet-4-6',
  openai: 'claude-sonnet-4-6',
} as const satisfies ModelConfig

// OpenAI/Codex models
export const GPT_5_5_CONFIG = {
  firstParty: 'gpt-5.5',
  bedrock: 'gpt-5.5',
  vertex: 'gpt-5.5',
  foundry: 'gpt-5.5',
  openai: 'gpt-5.5',
} as const satisfies ModelConfig

export const GPT_5_4_CONFIG = {
  firstParty: 'gpt-5.4',
  bedrock: 'gpt-5.4',
  vertex: 'gpt-5.4',
  foundry: 'gpt-5.4',
  openai: 'gpt-5.4',
} as const satisfies ModelConfig

export const GPT_5_3_CODEX_CONFIG = {
  firstParty: 'gpt-5.3-codex',
  bedrock: 'gpt-5.3-codex',
  vertex: 'gpt-5.3-codex',
  foundry: 'gpt-5.3-codex',
  openai: 'gpt-5.3-codex',
} as const satisfies ModelConfig

export const GPT_5_4_MINI_CONFIG = {
  firstParty: 'gpt-5.4-mini',
  bedrock: 'gpt-5.4-mini',
  vertex: 'gpt-5.4-mini',
  foundry: 'gpt-5.4-mini',
  openai: 'gpt-5.4-mini',
} as const satisfies ModelConfig

export const OPENAI_MODEL_METADATA = {
  gpt55: {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    description: 'GPT-5.5 · Latest general-purpose OpenAI model',
    descriptionForModel: 'GPT-5.5 - latest general-purpose OpenAI model',
    displayName: 'GPT 5.5',
    marketingName: 'GPT-5.5',
    family: 'general',
    showInModelPicker: true,
    supportedInCodexAdapter: true,
  },
  gpt54: {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    description: 'GPT-5.4 · Advanced reasoning and code generation',
    descriptionForModel: 'GPT-5.4 - advanced reasoning and code generation capabilities',
    displayName: 'GPT 5.4',
    marketingName: 'GPT-5.4',
    family: 'general',
    showInModelPicker: true,
    supportedInCodexAdapter: true,
  },
  gpt54mini: {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    description: 'GPT-5.4 Mini · Fast and efficient for simple tasks',
    descriptionForModel: 'GPT-5.4 Mini - fast and efficient for simple coding tasks',
    displayName: 'GPT 5.4 Mini',
    marketingName: 'GPT-5.4 Mini',
    family: 'general',
    showInModelPicker: true,
    supportedInCodexAdapter: true,
  },
  gpt53codex: {
    id: 'gpt-5.3-codex',
    label: 'GPT-5.3 Codex',
    description: 'GPT-5.3 Codex · Optimized for code generation and understanding',
    descriptionForModel: 'GPT-5.3 Codex - specialized for code generation and understanding',
    displayName: 'GPT 5.3 Codex',
    marketingName: 'GPT-5.3 Codex',
    family: 'codex',
    showInModelPicker: true,
    supportedInCodexAdapter: true,
  },
  gpt52codex: {
    id: 'gpt-5.2-codex',
    label: 'GPT-5.2 Codex',
    description: 'Frontier agentic coding model',
    descriptionForModel: 'GPT-5.2 Codex - frontier agentic coding model',
    displayName: 'Codex 5.2',
    marketingName: 'Codex 5.2',
    family: 'codex',
    showInModelPicker: false,
    supportedInCodexAdapter: true,
  },
  gpt51codex: {
    id: 'gpt-5.1-codex',
    label: 'GPT-5.1 Codex',
    description: 'Codex coding model',
    descriptionForModel: 'GPT-5.1 Codex - codex coding model',
    displayName: 'Codex 5.1',
    marketingName: 'Codex 5.1',
    family: 'codex',
    showInModelPicker: false,
    supportedInCodexAdapter: true,
  },
  gpt51codexmini: {
    id: 'gpt-5.1-codex-mini',
    label: 'GPT-5.1 Codex Mini',
    description: 'Fast Codex model',
    descriptionForModel: 'GPT-5.1 Codex Mini - fast Codex model',
    displayName: 'Codex 5.1 Mini',
    marketingName: 'Codex 5.1 Mini',
    family: 'codex',
    showInModelPicker: false,
    supportedInCodexAdapter: true,
  },
  gpt51codexmax: {
    id: 'gpt-5.1-codex-max',
    label: 'GPT-5.1 Codex Max',
    description: 'Max Codex model',
    descriptionForModel: 'GPT-5.1 Codex Max - max Codex model',
    displayName: 'Codex 5.1 Max',
    marketingName: 'Codex 5.1 Max',
    family: 'codex',
    showInModelPicker: false,
    supportedInCodexAdapter: true,
  },
  gpt52: {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    description: 'GPT-5.2',
    descriptionForModel: 'GPT-5.2',
    displayName: 'GPT 5.2',
    marketingName: 'GPT-5.2',
    family: 'general',
    showInModelPicker: false,
    supportedInCodexAdapter: true,
  },
} as const satisfies Record<string, OpenAIModelMetadata>

export type OpenAIModelKey = keyof typeof OPENAI_MODEL_METADATA
export type OpenAIModelId = (typeof OPENAI_MODEL_METADATA)[OpenAIModelKey]['id']
export const OPENAI_MODEL_LIST = Object.values(OPENAI_MODEL_METADATA)
export const OPENAI_MODEL_ID_SET = new Set<ModelName>(
  OPENAI_MODEL_LIST.map(model => model.id),
)

export function getOpenAIModelMetadata(model: string): OpenAIModelMetadata | null {
  return OPENAI_MODEL_LIST.find(metadata => metadata.id === model) ?? null
}

// @[MODEL LAUNCH]: Register the new config here.
export const ALL_MODEL_CONFIGS = {
  haiku35: CLAUDE_3_5_HAIKU_CONFIG,
  haiku45: CLAUDE_HAIKU_4_5_CONFIG,
  sonnet35: CLAUDE_3_5_V2_SONNET_CONFIG,
  sonnet37: CLAUDE_3_7_SONNET_CONFIG,
  sonnet40: CLAUDE_SONNET_4_CONFIG,
  sonnet45: CLAUDE_SONNET_4_5_CONFIG,
  sonnet46: CLAUDE_SONNET_4_6_CONFIG,
  opus40: CLAUDE_OPUS_4_CONFIG,
  opus41: CLAUDE_OPUS_4_1_CONFIG,
  opus45: CLAUDE_OPUS_4_5_CONFIG,
  opus46: CLAUDE_OPUS_4_6_CONFIG,
  // OpenAI/Codex models
  gpt55: GPT_5_5_CONFIG,
  gpt54: GPT_5_4_CONFIG,
  gpt53codex: GPT_5_3_CODEX_CONFIG,
  gpt54mini: GPT_5_4_MINI_CONFIG,
} as const satisfies Record<string, ModelConfig>

export type ModelKey = keyof typeof ALL_MODEL_CONFIGS

/** Union of all canonical first-party model IDs, e.g. 'claude-opus-4-6' | 'claude-sonnet-4-5-20250929' | … */
export type CanonicalModelId =
  (typeof ALL_MODEL_CONFIGS)[ModelKey]['firstParty']

/** Runtime list of canonical model IDs — used by comprehensiveness tests. */
export const CANONICAL_MODEL_IDS = Object.values(ALL_MODEL_CONFIGS).map(
  c => c.firstParty,
) as [CanonicalModelId, ...CanonicalModelId[]]

/** Map canonical ID → internal short key. Used to apply settings-based modelOverrides. */
export const CANONICAL_ID_TO_KEY: Record<CanonicalModelId, ModelKey> =
  Object.fromEntries(
    (Object.entries(ALL_MODEL_CONFIGS) as [ModelKey, ModelConfig][]).map(
      ([key, cfg]) => [cfg.firstParty, key],
    ),
  ) as Record<CanonicalModelId, ModelKey>
