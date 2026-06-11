import os
import json
import logging
import httpx
from typing import Optional

EDGE_ROUTER_URL = os.getenv('EDGE_ROUTER_URL')
OPENAI_KEY = os.getenv('OPENAI_API_KEY')

logger = logging.getLogger('llm_client')

async def call_edge_router(prompt: str | None = None, messages: list | None = None, temperature: float = 0.2, api_key: Optional[str]=None, max_tokens: int = 1000, response_mode: str = 'json', model: str | None = None):
    if not EDGE_ROUTER_URL:
        raise RuntimeError('EDGE_ROUTER_URL not configured')
    if not messages and prompt is None:
        raise ValueError('Either prompt or messages must be provided')

    if messages is None:
        messages = [{'role':'system','content':'You are a strict JSON-outputting assistant.'}, {'role':'user','content': prompt or ''}]

    payload = {
        'model': model if model else 'cf-llama',
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens
    }
    headers = {'Content-Type':'application/json'}
    if api_key:
        headers['x-api-key'] = api_key
    elif OPENAI_KEY:
        headers['x-api-key'] = OPENAI_KEY

    logger.debug('Calling edge router %s with model %s', EDGE_ROUTER_URL, payload['model'])
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(EDGE_ROUTER_URL, json=payload, headers=headers)
        text = resp.text
        if resp.status_code >= 400:
            logger.error('Edge router error %s: %s', resp.status_code, text)
            raise RuntimeError(f'Edge router error {resp.status_code}: {text}')

        if response_mode == 'raw':
            return text

        try:
            return json.loads(text)
        except Exception:
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1 and end > start:
                snippet = text[start:end+1]
                try:
                    return json.loads(snippet)
                except Exception:
                    logger.exception('Failed to parse JSON from snippet')
                    raise RuntimeError('Failed to parse JSON from model response')
            logger.error('Model response not JSON: %s', text[:200])
            raise RuntimeError('Model response not JSON')