import { logForDebugging } from '../../utils/debug.js'

type OpenAICompatibleApiMode = 'auto' | 'responses' | 'chat_completions'

interface AnthropicContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | AnthropicContentBlock[]
  source?: {
    type?: string
    media_type?: string
    data?: string
  }
  [key: string]: unknown
}

interface AnthropicMessage {
  role: string
  content: string | AnthropicContentBlock[]
}

interface AnthropicTool {
  name: string
  description?: string
  input_schema?: Record<string, unknown>
}

export function getOpenAICompatibleModel(): string | undefined {
  return process.env.ARC_MODEL?.trim() || undefined
}

export function getOpenAICompatibleBaseURL(): string {
  return (process.env.ARC_BASE_URL || 'https://api.openai.com/v1').replace(
    /\/+$/,
    '',
  )
}

function getApiMode(): OpenAICompatibleApiMode {
  const mode = process.env.ARC_OPENAI_API_MODE?.toLowerCase()
  if (mode === 'responses' || mode === 'chat_completions') return mode
  return 'auto'
}

function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function formatDataSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

function getSystemText(
  system:
    | string
    | Array<{ type: string; text?: string; cache_control?: unknown }>
    | undefined,
): string {
  if (!system) return ''
  if (typeof system === 'string') return system
  if (!Array.isArray(system)) return ''
  return system
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
}

function getTextFromContent(
  content: string | AnthropicContentBlock[] | undefined,
): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content
    .map(block => {
      if (block.type === 'text') return block.text ?? ''
      if (block.type === 'image') return '[Image data attached]'
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function anthropicContentToOpenAIContent(
  content: string | AnthropicContentBlock[],
): string | Array<Record<string, unknown>> {
  if (typeof content === 'string') return content

  const openAIContent: Array<Record<string, unknown>> = []
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') {
      openAIContent.push({ type: 'text', text: block.text })
    } else if (
      block.type === 'image' &&
      block.source?.type === 'base64' &&
      block.source.media_type &&
      block.source.data
    ) {
      openAIContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${block.source.media_type};base64,${block.source.data}`,
        },
      })
    }
  }

  if (openAIContent.length === 1 && openAIContent[0].type === 'text') {
    return openAIContent[0].text as string
  }
  return openAIContent
}

function translateToolsForResponses(
  tools: AnthropicTool[],
): Array<Record<string, unknown>> {
  return tools.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description || '',
    parameters: tool.input_schema || { type: 'object', properties: {} },
  }))
}

function translateToolsForChat(
  tools: AnthropicTool[],
): Array<Record<string, unknown>> {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.input_schema || { type: 'object', properties: {} },
    },
  }))
}

function translateMessagesForResponses(
  messages: AnthropicMessage[],
): Array<Record<string, unknown>> {
  const input: Array<Record<string, unknown>> = []

  for (const message of messages) {
    if (typeof message.content === 'string') {
      input.push({ role: message.role, content: message.content })
      continue
    }

    if (message.role === 'user') {
      const content: Array<Record<string, unknown>> = []
      for (const block of message.content) {
        if (block.type === 'tool_result') {
          input.push({
            type: 'function_call_output',
            call_id: block.tool_use_id || `call_${input.length}`,
            output: getTextFromContent(block.content),
          })
        } else if (block.type === 'text' && typeof block.text === 'string') {
          content.push({ type: 'input_text', text: block.text })
        } else if (
          block.type === 'image' &&
          block.source?.type === 'base64' &&
          block.source.media_type &&
          block.source.data
        ) {
          content.push({
            type: 'input_image',
            image_url: `data:${block.source.media_type};base64,${block.source.data}`,
          })
        }
      }
      if (content.length === 1 && content[0].type === 'input_text') {
        input.push({ role: 'user', content: content[0].text })
      } else if (content.length > 0) {
        input.push({ role: 'user', content })
      }
      continue
    }

    for (const block of message.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        input.push({
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: block.text }],
          status: 'completed',
        })
      } else if (block.type === 'tool_use') {
        input.push({
          type: 'function_call',
          call_id: block.id || `call_${input.length}`,
          name: block.name || '',
          arguments: JSON.stringify(block.input || {}),
        })
      }
    }
  }

  return input
}

function translateMessagesForChat(
  systemText: string,
  messages: AnthropicMessage[],
): Array<Record<string, unknown>> {
  const openAIMessages: Array<Record<string, unknown>> = []
  if (systemText) {
    openAIMessages.push({ role: 'system', content: systemText })
  }

  for (const message of messages) {
    if (typeof message.content === 'string') {
      openAIMessages.push({ role: message.role, content: message.content })
      continue
    }

    if (message.role === 'user') {
      const userBlocks = message.content.filter(
        block => block.type !== 'tool_result',
      )
      if (userBlocks.length > 0) {
        openAIMessages.push({
          role: 'user',
          content: anthropicContentToOpenAIContent(userBlocks),
        })
      }
      for (const block of message.content) {
        if (block.type === 'tool_result') {
          openAIMessages.push({
            role: 'tool',
            tool_call_id: block.tool_use_id || `call_${openAIMessages.length}`,
            content: getTextFromContent(block.content),
          })
        }
      }
      continue
    }

    const text = message.content
      .filter(block => block.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('\n')
    const toolCalls = message.content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        id: block.id || `call_${openAIMessages.length}`,
        type: 'function',
        function: {
          name: block.name || '',
          arguments: JSON.stringify(block.input || {}),
        },
      }))
    openAIMessages.push({
      role: 'assistant',
      content: text || null,
      ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
    })
  }

  return openAIMessages
}

function buildResponsesBody(
  anthropicBody: Record<string, unknown>,
  model: string,
): Record<string, unknown> {
  const tools = (anthropicBody.tools || []) as AnthropicTool[]
  return {
    model,
    stream: Boolean(anthropicBody.stream),
    instructions: getSystemText(
      anthropicBody.system as
        | string
        | Array<{ type: string; text?: string; cache_control?: unknown }>
        | undefined,
    ),
    input: translateMessagesForResponses(
      (anthropicBody.messages || []) as AnthropicMessage[],
    ),
    ...(anthropicBody.max_tokens && {
      max_output_tokens: anthropicBody.max_tokens,
    }),
    ...(anthropicBody.temperature !== undefined && {
      temperature: anthropicBody.temperature,
    }),
    ...(tools.length > 0 && { tools: translateToolsForResponses(tools) }),
    tool_choice: tools.length > 0 ? 'auto' : undefined,
  }
}

function buildChatBody(
  anthropicBody: Record<string, unknown>,
  model: string,
): Record<string, unknown> {
  const tools = (anthropicBody.tools || []) as AnthropicTool[]
  const systemText = getSystemText(
    anthropicBody.system as
      | string
      | Array<{ type: string; text?: string; cache_control?: unknown }>
      | undefined,
  )
  return {
    model,
    stream: Boolean(anthropicBody.stream),
    messages: translateMessagesForChat(
      systemText,
      (anthropicBody.messages || []) as AnthropicMessage[],
    ),
    ...(anthropicBody.max_tokens && { max_tokens: anthropicBody.max_tokens }),
    ...(anthropicBody.temperature !== undefined && {
      temperature: anthropicBody.temperature,
    }),
    ...(tools.length > 0 && { tools: translateToolsForChat(tools) }),
    ...(tools.length > 0 && { tool_choice: 'auto' }),
    ...(anthropicBody.stream && { stream_options: { include_usage: true } }),
  }
}

function messageStart(model: string): unknown {
  return {
    type: 'message_start',
    message: {
      id: `msg_openai_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  }
}

function textBlockStart(index: number): unknown {
  return {
    type: 'content_block_start',
    index,
    content_block: { type: 'text', text: '' },
  }
}

function textDelta(index: number, text: string): unknown {
  return {
    type: 'content_block_delta',
    index,
    delta: { type: 'text_delta', text },
  }
}

function toolBlockStart(index: number, id: string, name: string): unknown {
  return {
    type: 'content_block_start',
    index,
    content_block: { type: 'tool_use', id, name, input: {} },
  }
}

function toolDelta(index: number, partialJson: string): unknown {
  return {
    type: 'content_block_delta',
    index,
    delta: { type: 'input_json_delta', partial_json: partialJson },
  }
}

function blockStop(index: number): unknown {
  return { type: 'content_block_stop', index }
}

function messageDelta(
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens',
  outputTokens: number,
): unknown {
  return {
    type: 'message_delta',
    delta: { stop_reason: stopReason, stop_sequence: null },
    usage: { output_tokens: outputTokens },
  }
}

function messageStop(inputTokens: number, outputTokens: number): unknown {
  return {
    type: 'message_stop',
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  }
}

async function streamLines(
  response: Response,
  onData: (data: string) => void,
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') continue
      onData(data)
    }
  }
}

function streamResponsesToAnthropic(
  response: Response,
  model: string,
): Response {
  let blockIndex = 0
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let textStarted = false
        let toolStarted = false
        let toolIndex = -1
        let outputTokens = 0
        let inputTokens = 0
        let stopReason: 'end_turn' | 'tool_use' | 'max_tokens' = 'end_turn'

        controller.enqueue(encoder.encode(formatSSE('message_start', messageStart(model))))

        await streamLines(response, data => {
          let event: Record<string, unknown>
          try {
            event = JSON.parse(data)
          } catch {
            return
          }

          if (event.type === 'response.output_text.delta') {
            const text = event.delta
            if (typeof text !== 'string' || !text) return
            if (!textStarted) {
              controller.enqueue(
                encoder.encode(formatSSE('content_block_start', textBlockStart(blockIndex))),
              )
              textStarted = true
            }
            controller.enqueue(
              encoder.encode(formatSSE('content_block_delta', textDelta(blockIndex, text))),
            )
            outputTokens += 1
          } else if (event.type === 'response.output_item.added') {
            const item = event.item as Record<string, unknown> | undefined
            if (item?.type === 'function_call') {
              if (textStarted) {
                controller.enqueue(
                  encoder.encode(formatSSE('content_block_stop', blockStop(blockIndex))),
                )
                blockIndex += 1
                textStarted = false
              }
              toolIndex = blockIndex
              toolStarted = true
              stopReason = 'tool_use'
              controller.enqueue(
                encoder.encode(
                  formatSSE(
                    'content_block_start',
                    toolBlockStart(
                      toolIndex,
                      String(item.call_id || item.id || `call_${toolIndex}`),
                      String(item.name || ''),
                    ),
                  ),
                ),
              )
            }
          } else if (event.type === 'response.function_call_arguments.delta') {
            if (!toolStarted) return
            const delta = event.delta
            if (typeof delta !== 'string' || !delta) return
            controller.enqueue(
              encoder.encode(formatSSE('content_block_delta', toolDelta(toolIndex, delta))),
            )
          } else if (event.type === 'response.output_item.done') {
            const item = event.item as Record<string, unknown> | undefined
            if (item?.type === 'function_call' && toolStarted) {
              controller.enqueue(
                encoder.encode(formatSSE('content_block_stop', blockStop(toolIndex))),
              )
              blockIndex += 1
              toolStarted = false
            }
          } else if (event.type === 'response.completed') {
            const usage = (event.response as Record<string, unknown> | undefined)
              ?.usage as Record<string, number> | undefined
            inputTokens = usage?.input_tokens ?? inputTokens
            outputTokens = usage?.output_tokens ?? outputTokens
          }
        })

        if (textStarted) {
          controller.enqueue(
            encoder.encode(formatSSE('content_block_stop', blockStop(blockIndex))),
          )
        }
        if (toolStarted) {
          controller.enqueue(
            encoder.encode(formatSSE('content_block_stop', blockStop(toolIndex))),
          )
        }
        controller.enqueue(
          encoder.encode(
            formatSSE('message_delta', messageDelta(stopReason, outputTokens)),
          ),
        )
        controller.enqueue(
          encoder.encode(formatSSE('message_stop', messageStop(inputTokens, outputTokens))),
        )
        controller.close()
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    },
  )
}

function streamChatToAnthropic(response: Response, model: string): Response {
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let blockIndex = 0
        let textIndex = -1
        let textStarted = false
        let outputTokens = 0
        let inputTokens = 0
        let stopReason: 'end_turn' | 'tool_use' | 'max_tokens' = 'end_turn'
        const toolIndexes = new Map<number, number>()

        controller.enqueue(encoder.encode(formatSSE('message_start', messageStart(model))))

        await streamLines(response, data => {
          let chunk: Record<string, unknown>
          try {
            chunk = JSON.parse(data)
          } catch {
            return
          }

          const usage = chunk.usage as Record<string, number> | undefined
          if (usage) {
            inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? inputTokens
            outputTokens =
              usage.completion_tokens ?? usage.output_tokens ?? outputTokens
          }

          const choice = (chunk.choices as Array<Record<string, unknown>> | undefined)?.[0]
          if (!choice) return
          const finishReason = choice.finish_reason
          if (finishReason === 'tool_calls') stopReason = 'tool_use'
          if (finishReason === 'length') stopReason = 'max_tokens'

          const delta = choice.delta as Record<string, unknown> | undefined
          if (!delta) return

          if (typeof delta.content === 'string' && delta.content) {
            if (!textStarted) {
              textIndex = blockIndex++
              textStarted = true
              controller.enqueue(
                encoder.encode(formatSSE('content_block_start', textBlockStart(textIndex))),
              )
            }
            outputTokens += 1
            controller.enqueue(
              encoder.encode(
                formatSSE('content_block_delta', textDelta(textIndex, delta.content)),
              ),
            )
          }

          const toolCalls = delta.tool_calls as
            | Array<Record<string, unknown>>
            | undefined
          if (toolCalls) {
            if (textStarted) {
              controller.enqueue(
                encoder.encode(formatSSE('content_block_stop', blockStop(textIndex))),
              )
              textStarted = false
            }
            stopReason = 'tool_use'
            for (const toolCall of toolCalls) {
              const index =
                typeof toolCall.index === 'number' ? toolCall.index : toolIndexes.size
              let apiBlockIndex = toolIndexes.get(index)
              const fn = toolCall.function as Record<string, unknown> | undefined
              if (apiBlockIndex === undefined) {
                apiBlockIndex = blockIndex++
                toolIndexes.set(index, apiBlockIndex)
                controller.enqueue(
                  encoder.encode(
                    formatSSE(
                      'content_block_start',
                      toolBlockStart(
                        apiBlockIndex,
                        String(toolCall.id || `call_${index}`),
                        String(fn?.name || ''),
                      ),
                    ),
                  ),
                )
              }
              if (typeof fn?.arguments === 'string' && fn.arguments) {
                controller.enqueue(
                  encoder.encode(
                    formatSSE(
                      'content_block_delta',
                      toolDelta(apiBlockIndex, fn.arguments),
                    ),
                  ),
                )
              }
            }
          }
        })

        if (textStarted) {
          controller.enqueue(
            encoder.encode(formatSSE('content_block_stop', blockStop(textIndex))),
          )
        }
        for (const apiBlockIndex of toolIndexes.values()) {
          controller.enqueue(
            encoder.encode(formatSSE('content_block_stop', blockStop(apiBlockIndex))),
          )
        }
        controller.enqueue(
          encoder.encode(
            formatSSE('message_delta', messageDelta(stopReason, outputTokens)),
          ),
        )
        controller.enqueue(
          encoder.encode(formatSSE('message_stop', messageStop(inputTokens, outputTokens))),
        )
        controller.close()
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    },
  )
}

async function jsonResponseToAnthropic(
  response: Response,
  model: string,
  mode: Exclude<OpenAICompatibleApiMode, 'auto'>,
): Promise<Response> {
  const json = (await response.json()) as Record<string, unknown>
  let text = ''
  let inputTokens = 0
  let outputTokens = 0

  if (mode === 'responses') {
    const output = json.output as Array<Record<string, unknown>> | undefined
    text =
      output
        ?.flatMap(item => (item.content as Array<Record<string, unknown>>) ?? [])
        .filter(item => item.type === 'output_text')
        .map(item => item.text)
        .join('') ?? ''
    const usage = json.usage as Record<string, number> | undefined
    inputTokens = usage?.input_tokens ?? 0
    outputTokens = usage?.output_tokens ?? 0
  } else {
    const choice = (json.choices as Array<Record<string, unknown>> | undefined)?.[0]
    const message = choice?.message as Record<string, unknown> | undefined
    text = String(message?.content ?? '')
    const usage = json.usage as Record<string, number> | undefined
    inputTokens = usage?.prompt_tokens ?? 0
    outputTokens = usage?.completion_tokens ?? 0
  }

  return new Response(
    JSON.stringify({
      id: `msg_openai_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model,
      content: text ? [{ type: 'text', text }] : [],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

function shouldFallbackToChat(response: Response): boolean {
  return response.status === 400 || response.status === 404 || response.status === 405
}

async function callOpenAICompatible(
  mode: Exclude<OpenAICompatibleApiMode, 'auto'>,
  anthropicBody: Record<string, unknown>,
  model: string,
  apiKey: string,
): Promise<Response> {
  const baseUrl = getOpenAICompatibleBaseURL()
  const endpoint =
    mode === 'responses'
      ? `${baseUrl}/responses`
      : `${baseUrl}/chat/completions`
  const body =
    mode === 'responses'
      ? buildResponsesBody(anthropicBody, model)
      : buildChatBody(anthropicBody, model)

  logForDebugging(
    `[OpenAI compatible] ${mode} ${new URL(endpoint).host} model=${model}`,
  )

  return globalThis.fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: anthropicBody.stream ? 'text/event-stream' : 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
}

function getProviderErrorMessage(text: string): string {
  try {
    const body = JSON.parse(text) as Record<string, unknown>
    const nested = body.error
    if (nested && typeof nested === 'object') {
      const message = (nested as Record<string, unknown>).message
      if (typeof message === 'string' && message.trim()) {
        return message
      }
    }
    const message = body.message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  } catch {
    // Fall through to raw text.
  }
  return text.trim() || responseTextFallback
}

const responseTextFallback = 'request failed'

function errorResponse(response: Response, text: string): Response {
  const retryAfter = response.headers.get('retry-after')
  const shouldRetry = response.status === 429 && retryAfter !== null

  return new Response(
    JSON.stringify({
      type: 'error',
      error: {
        type: 'api_error',
        message: getProviderErrorMessage(text),
      },
    }),
    {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...(retryAfter && { 'retry-after': retryAfter }),
        ...(!shouldRetry && { 'x-should-retry': 'false' }),
      },
    },
  )
}

export function createOpenAICompatibleFetch(): (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response> {
  const apiKey = process.env.ARC_API_KEY
  if (!apiKey) {
    throw new Error('ARC_API_KEY is required when ARC_MODEL_PROVIDER=openai-compatible')
  }

  const configuredModel = getOpenAICompatibleModel()
  if (!configuredModel) {
    throw new Error('ARC_MODEL is required when ARC_MODEL_PROVIDER=openai-compatible')
  }

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input)
    if (!url.includes('/v1/messages')) {
      return globalThis.fetch(input, init)
    }

    let anthropicBody: Record<string, unknown>
    try {
      const bodyText =
        init?.body instanceof ReadableStream
          ? await new Response(init.body).text()
          : typeof init?.body === 'string'
            ? init.body
            : '{}'
      anthropicBody = JSON.parse(bodyText) as Record<string, unknown>
    } catch {
      anthropicBody = {}
    }

    const model =
      typeof anthropicBody.model === 'string' && anthropicBody.model.trim()
        ? anthropicBody.model
        : configuredModel
    const apiMode = getApiMode()
    const stream = Boolean(anthropicBody.stream)
    let response: Response
    let mode: Exclude<OpenAICompatibleApiMode, 'auto'>

    if (apiMode === 'chat_completions') {
      mode = 'chat_completions'
      response = await callOpenAICompatible(mode, anthropicBody, model, apiKey)
    } else {
      mode = 'responses'
      response = await callOpenAICompatible(mode, anthropicBody, model, apiKey)
      if (apiMode === 'auto' && shouldFallbackToChat(response)) {
        logForDebugging(
          `[OpenAI compatible] /responses returned ${response.status}; falling back to /chat/completions`,
        )
        mode = 'chat_completions'
        response = await callOpenAICompatible(mode, anthropicBody, model, apiKey)
      }
    }

    if (!response.ok) {
      return errorResponse(response, await response.text())
    }

    if (!stream) {
      return jsonResponseToAnthropic(response, model, mode)
    }

    return mode === 'responses'
      ? streamResponsesToAnthropic(response, model)
      : streamChatToAnthropic(response, model)
  }
}
