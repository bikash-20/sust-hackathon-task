const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech'
const OPENROUTER_URL = 'https://api.openrouter.ai/v1/chat/completions'
const CLOUDFLARE_AI_URL = 'https://api.cloudflare.com/client/v4/ai/generate'

const OPENAI_KEY = globalThis.OPENAI_API_KEY || ''
const CF_AI_KEY = globalThis.CLOUDFLARE_API_TOKEN || ''
const OPENROUTER_KEY = globalThis.OPENROUTER_API_KEY || ''
const OPENROUTER_MODELS = (globalThis.OPENROUTER_MODELS || 'meta-llama/llama-3.1-8b-instruct:free').split(',').map(s => s.trim()).filter(Boolean)
const CF_AI_MODELS = (globalThis.CF_AI_MODELS || '@cf/meta/llama-3.1-8b-instruct').split(',').map(s => s.trim()).filter(Boolean)
const DEFAULT_CF_MODEL = '@cf/meta/llama-3.1-8b-instruct'
const CF_MODEL_ALIASES = {
  'cf-claude': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  'cf-llama': '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  'cf-qwen': '@cf/meta/llama-3.1-8b-instruct',
  'cf-gemma': '@cf/google/gemma-3-12b-it',
  'cf-mistral': '@cf/mistral/mistral-7b-instruct-v0.2',
  'cf-deepseek': '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
}

const SYSTEM_PROMPT = `You are NEXORA, a highly qualified medical AI assistant with PhD-level clinical knowledge. Provide safe, accurate, and practical guidance to rural health workers. Be concise, factual, and do not hallucinate. If the user asks in Bengali, answer in Bengali.`
const TTS_MODEL = '@cf/myshell-ai/melotts'

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return cors(JSON.stringify({ status: 'ok' }), 204)
    }

    const url = new URL(request.url)
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return cors(JSON.stringify({
        status: 'ok',
        worker: 'NEXORA Cloudflare AI Proxy',
        ai_binding: Boolean(env.AI),
        models: Array.from(new Set([...CF_AI_MODELS, ...OPENROUTER_MODELS, DEFAULT_CF_MODEL])),
      }))
    }

    if (request.method !== 'POST') {
      return cors(JSON.stringify({ error: 'Method not allowed' }), 405)
    }

    const pathname = new URL(request.url).pathname
    if (pathname === '/tts') {
      return handleTTS(request, env)
    }

    return handleChat(request, env)
  }
}

function normalizeMessages(payload) {
  if (Array.isArray(payload.messages)) {
    return payload.messages
  }
  if (payload.prompt) {
    return [{ role: 'user', content: payload.prompt }]
  }
  if (payload.input) {
    return [{ role: 'user', content: String(payload.input) }]
  }
  return []
}

function ensureSystemMessage(messages) {
  if (messages.some(m => m.role === 'system')) {
    return messages
  }
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
}

function aliasToCFModel(alias) {
  if (!alias) return null
  return CF_MODEL_ALIASES[alias] || alias
}

function buildTextFromMessages(messages) {
  return messages.map(({ role, content }) => `${role}: ${content}`).join('\n')
}

async function fetchOpenAI(payload, apiKey) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
  return fetch(OPENAI_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

async function fetchCloudflareAI(messages, payload, model) {
  if (!CF_AI_KEY) {
    throw new Error('Cloudflare AI token not configured')
  }
  const input = buildTextFromMessages(messages)
  const body = {
    model: model || payload.model || CF_AI_MODELS[0],
    input,
    max_output_tokens: payload.max_tokens || 900,
  }
  return fetch(CLOUDFLARE_AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CF_AI_KEY}`,
    },
    body: JSON.stringify(body),
  })
}

async function fetchOpenRouter(payload, model) {
  const headers = { 'Content-Type': 'application/json' }
  if (OPENROUTER_KEY) {
    headers.Authorization = `Bearer ${OPENROUTER_KEY}`
  }
  const routerPayload = {
    model: model || payload.model || OPENROUTER_MODELS[0],
    messages: normalizeMessages(payload),
    temperature: payload.temperature ?? 0.7,
    max_tokens: payload.max_tokens ?? 900,
  }
  return fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(routerPayload),
  })
}

async function fetchOpenRouterWithFallback(payload) {
  const errors = []
  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetchOpenRouter(payload, model)
      if (response.ok) {
        return await parseModelResponse(response)
      }
      const body = await response.text()
      errors.push(`OpenRouter model ${model} failed ${response.status}: ${body}`)
    } catch (err) {
      errors.push(`OpenRouter model ${model} error: ${err.message}`)
    }
  }
  throw new Error(errors.join(' | '))
}

async function parseModelResponse(response) {
  const text = await response.text()
  if (response.ok) {
    try {
      const json = JSON.parse(text)
      if (json.choices?.[0]?.message?.content) {
        return json.choices[0].message.content
      }
      if (json.output?.[0]?.content) {
        return json.output[0].content
      }
      return text
    } catch (_e) {
      return text
    }
  }
  throw new Error(`Provider returned ${response.status}: ${text}`)
}

async function runWorkersAI(payload, env) {
  const messages = ensureSystemMessage(normalizeMessages(payload))
  const alias = payload.model
  const modelName = aliasToCFModel(alias) || payload.model || DEFAULT_CF_MODEL
  const temperature = payload.temperature ?? 0.7
  const max_tokens = payload.max_tokens || 900

  const result = await env.AI.run(modelName, {
    messages,
    temperature,
    max_tokens,
  })

  const text = (result?.response || result?.result?.response || '').trim()
  if (!text) {
    throw new Error('Workers AI binding returned empty response')
  }
  return text
}

async function routeWithFallback(request, payload, env) {
  const errors = []

  if (env?.AI) {
    try {
      return await runWorkersAI(payload, env)
    } catch (err) {
      errors.push(`Workers AI binding failed: ${err.message}`)
    }
  }

  if (request.headers.get('x-api-key') || OPENAI_KEY) {
    const apiKey = request.headers.get('x-api-key') || OPENAI_KEY
    try {
      const response = await fetchOpenAI(payload, apiKey)
      if (response.ok) {
        return await response.text()
      }
      const body = await response.text()
      errors.push(`OpenAI failed ${response.status}: ${body}`)
    } catch (err) {
      errors.push(`OpenAI error: ${err.message}`)
    }
  }

  if (CF_AI_KEY) {
    const cfModels = payload.model ? [payload.model] : CF_AI_MODELS
    for (const model of cfModels) {
      try {
        const response = await fetchCloudflareAI(ensureSystemMessage(normalizeMessages(payload)), payload, model)
        if (response.ok) {
          const json = await response.json()
          if (json?.result?.output?.[0]?.content) {
            return json.result.output[0].content
          }
          if (json?.result?.output) {
            return JSON.stringify(json.result.output)
          }
          return JSON.stringify(json)
        }
        const body = await response.text()
        errors.push(`Cloudflare AI model ${model} failed ${response.status}: ${body}`)
      } catch (err) {
        errors.push(`Cloudflare AI model ${model} error: ${err.message}`)
      }
    }
  }

  try {
    return await fetchOpenRouterWithFallback(payload)
  } catch (err) {
    errors.push(`OpenRouter failed: ${err.message}`)
  }

  throw new Error(errors.join(' | '))
}

async function handleChat(request, env) {
  let payload
  try {
    payload = await request.json()
  } catch (err) {
    return cors(JSON.stringify({ error: 'Invalid JSON payload', detail: err.message }), 400)
  }

  try {
    const text = await routeWithFallback(request, payload, env)
    return new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  } catch (err) {
    return cors(JSON.stringify({ error: 'All providers failed', detail: err.message }), 502)
  }
}

async function handleTTS(request, env) {
  let payload
  try {
    payload = await request.json()
  } catch (err) {
    return cors(JSON.stringify({ error: 'Invalid JSON payload', detail: err.message }), 400)
  }

  const text = payload?.text || ''
  if (!text.trim()) {
    return cors(JSON.stringify({ error: 'text is required' }), 400)
  }

  if (!env.AI && !OPENAI_KEY) {
    return cors(JSON.stringify({ error: 'No TTS provider configured', detail: 'Missing Workers AI binding or OpenAI key' }), 500)
  }

  try {
    if (env.AI) {
      const result = await env.AI.run(TTS_MODEL, {
        prompt: text.trim(),
        lang: payload?.lang || 'en',
      })
      let bytes
      if (result instanceof ArrayBuffer) {
        bytes = new Uint8Array(result)
      } else if (result instanceof Uint8Array) {
        bytes = result
      } else {
        const audioB64 = typeof result === 'string' ? result : (result?.audio || result?.result?.audio || '')
        if (!audioB64) {
          throw new Error('TTS binding returned empty audio')
        }
        bytes = Uint8Array.from(atob(audioB64), c => c.charCodeAt(0))
      }
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(bytes.length),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
      Accept: 'audio/mpeg',
    }
    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: payload?.model || 'gpt-4o-mini-tts',
        voice: payload?.voice || 'alloy',
        input: text.trim(),
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      return cors(JSON.stringify({ error: 'OpenAI TTS failed', detail: body }), response.status)
    }
    const arrayBuffer = await response.arrayBuffer()
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (err) {
    return cors(JSON.stringify({ error: 'TTS failed', detail: err.message }), 502)
  }
}

function cors(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
