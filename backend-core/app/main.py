import os
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import openai
from langdetect import detect
from .ml_engine import analyze_vitals
from .services.ocr_service import extract_text_from_image
from .services.voice_service import stream_tts
from . import llm_client
from .schemas import OCRParseResult, TriageResponse
import logging

logger = logging.getLogger('backend')
logging.basicConfig(level=logging.INFO)

load_dotenv()

OPENAI_KEY = os.getenv('OPENAI_API_KEY')
EDGE_ROUTER_URL = os.getenv('EDGE_ROUTER_URL')

def create_app():
  app = FastAPI()
  app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

  @app.post('/api/audio/intake')
  async def audio_intake(file: UploadFile = File(...)):
    # save temp
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
      content = await file.read()
      tmp.write(content)
      tmp_path = tmp.name

    # Send to OpenAI Whisper
    openai.api_key = OPENAI_KEY
    try:
      with open(tmp_path, 'rb') as f:
        resp = openai.Audio.transcriptions.create(file=f, model='whisper-1')
      text = resp.get('text') if isinstance(resp, dict) else getattr(resp,'text', '')
    except Exception as e:
      return JSONResponse({'error': str(e)}, status_code=500)

    # detect language
    lang = 'en'
    try:
      lang = detect(text)
    except:
      lang = 'en'

    # If Bengali, translate using Google Translate
    if lang and lang.startswith('bn'):
      from google.cloud import translate_v2 as translate
      client = translate.Client()
      translated = client.translate(text, target_language='en')
      normalized = translated['translatedText']
    else:
      normalized = text

    return {'raw_text': text, 'normalized': normalized, 'lang': lang}

  @app.post('/api/ocr/upload')
  async def ocr_upload(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
      content = await file.read()
      tmp.write(content)
      tmp_path = tmp.name
    try:
      raw = extract_text_from_image(tmp_path)
      # send raw to LLM for NER parsing via Edge Router
      prompt = f"Extract medications, dosages, diagnoses, and lab results from the following medical text. Return ONLY valid JSON matching this schema: {OCRParseResult.schema_json()}\n\nText:\n{raw}"
      try:
        parsed = await llm_client.call_edge_router(prompt)
        # validate
        result = OCRParseResult(**parsed, raw_text=raw)
        return result.dict()
      except Exception as e:
        logger.exception('OCR parsing failed')
        return JSONResponse({'error': 'Failed to parse OCR text', 'detail': str(e), 'raw_text': raw}, status_code=500)
    except Exception as e:
      return JSONResponse({'error': str(e)}, status_code=500)

  @app.post('/api/ocr/parse')
  async def ocr_parse(payload: Request):
    data = await payload.json()
    raw = data.get('raw_text')
    if not raw:
      return JSONResponse({'error': 'raw_text required'}, status_code=400)
    prompt = f"Extract medications, dosages, diagnoses, and lab results from the following medical text. Return ONLY valid JSON matching this schema: {OCRParseResult.schema_json()}\n\nText:\n{raw}"
    try:
      parsed = await llm_client.call_edge_router(prompt)
      result = OCRParseResult(**parsed, raw_text=raw)
      return result.dict()
    except Exception as e:
      logger.exception('OCR parse API failed')
      return JSONResponse({'error': 'Failed to parse OCR text', 'detail': str(e)}, status_code=500)

  @app.post('/api/triage')
  async def triage_endpoint(payload: Request):
    data = await payload.json()
    normalized = data.get('normalized_text')
    vitals_anomaly = data.get('vitals_anomaly')
    history = data.get('history')
    if not normalized or vitals_anomaly is None or history is None:
      return JSONResponse({'error': 'normalized_text, vitals_anomaly, and history required'}, status_code=400)

    # Build clinical prompt
    prompt = (
      "You are a clinical decision support assistant for rural community health workers in Bangladesh. "
      "Given the patient's symptomatic description, the structured medication/history, and vital anomaly findings, produce STRICT JSON matching this schema: "
      f"{TriageResponse.schema_json()}\n\n"
      "Inputs:\n"
      f"Normalized symptoms text:\n{normalized}\n\n"
      f"Vitals anomaly JSON:\n{vitals_anomaly}\n\n"
      f"Medication/history JSON:\n{history}\n\n"
      "Important: If vitals indicate a red alert, the triage_severity must be 'Red' or 'Black'. Return only JSON."
    )
    try:
      parsed = await llm_client.call_edge_router(prompt, temperature=0.0, max_tokens=800)
      triage = TriageResponse(**parsed)
      return triage.dict()
    except Exception as e:
      logger.exception('Triage LLM call failed')
      return JSONResponse({'error': 'Triage generation failed', 'detail': str(e)}, status_code=500)

  @app.post('/api/vitals')
  async def vitals_endpoint(payload: Request):
    data = await payload.json()
    result = analyze_vitals(data)
    return result

  @app.get('/api/tts/stream')
  async def tts_stream(q: str = 'Summary not provided'):
    async def streamer():
      async for chunk in stream_tts(q):
        yield chunk
    return StreamingResponse(streamer(), media_type='audio/mpeg')

  return app
