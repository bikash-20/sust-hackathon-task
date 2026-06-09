import os
import json
import logging
import httpx
from typing import Optional

EDGE_ROUTER_URL = os.getenv('EDGE_ROUTER_URL')

logger = logging.getLogger('llm_client')

async def call_edge_router(prompt: str, temperature: float = 0.2, api_key: Optional[str]=None, max_tokens: int = 1000):
    if not EDGE_ROUTER_URL:
        raise RuntimeError('EDGE_ROUTER_URL not configured')
    payload = {
        'model': 'gpt-4o-mini',
        'messages': [{'role':'system','content':'You are a strict JSON-outputting assistant.'}, {'role':'user','content': prompt}],
        'temperature': temperature,
        'max_tokens': max_tokens
    }
    headers = {'Content-Type':'application/json'}
    if api_key:
        headers['x-api-key'] = api_key

    logger.debug('Calling edge router %s', EDGE_ROUTER_URL)
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(EDGE_ROUTER_URL, json=payload, headers=headers)
        text = resp.text
        if resp.status_code >= 400:
            logger.error('Edge router error %s: %s', resp.status_code, text)
            raise RuntimeError(f'Edge router error {resp.status_code}: {text}')

    # Try to extract JSON from response text
    try:
        return json.loads(text)
    except Exception:
        # attempt to find JSON substring
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            snippet = text[start:end+1]
            try:
                return json.loads(snippet)
            except Exception as e:
                logger.exception('Failed to parse JSON from snippet')
                raise RuntimeError('Failed to parse JSON from model response')
        logger.error('Model response not JSON: %s', text[:200])
        raise RuntimeError('Model response not JSON')
