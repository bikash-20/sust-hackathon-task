import os
import asyncio
import httpx
from typing import List
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_KEYS = os.getenv('ELEVENLABS_KEYS','').split(',') if os.getenv('ELEVENLABS_KEYS') else ["key_1","key_2","key_3"]

async def stream_tts(text: str, voice_id: str='eleven_monolingual_v1'):
  # Rotate through keys
  last_exc = None
  for key in ELEVENLABS_KEYS:
    if not key: continue
    try:
      headers = { 'xi-api-key': key, 'Accept': 'audio/mpeg' }
      url = f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream'
      async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream('POST', url, headers=headers, json={'text': text}) as resp:
          if resp.status_code in (401,403,429,402):
            # try next key
            last_exc = Exception(f'Key rejected: {resp.status_code}')
            continue
          if resp.status_code >= 400:
            last_exc = Exception(f'ElevenLabs error: {resp.status_code}')
            continue
          async for chunk in resp.aiter_bytes():
            yield chunk
          return
    except Exception as e:
      last_exc = e
      continue
  raise last_exc or Exception('No ElevenLabs keys available')
