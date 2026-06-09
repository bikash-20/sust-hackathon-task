addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(req){
  try{
    const url = new URL(req.url)
    const providerKey = req.headers.get('x-api-key')
    const body = await req.clone().json().catch(()=>null)

    if(providerKey){
      // Route to paid OpenAI endpoint
      try{
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${providerKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if(!res.ok) throw new Error('primary provider failed')
        return res
      }catch(err){
        console.warn('Primary provider failed, falling back', err)
      }
    }

    // Fallback to OpenRouter free model
    const openrouterKey = 'OPENROUTER_PUBLIC_OR_PLACEHOLDER'
    const fallbackRes = await fetch('https://api.openrouter.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return fallbackRes
  }catch(e){
    return new Response(JSON.stringify({error: e.message}), {status:500, headers:{'Content-Type':'application/json'}})
  }
}
