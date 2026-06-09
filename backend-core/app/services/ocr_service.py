import os
from google.cloud import vision

client = None
def init_client():
  global client
  if client is None:
    client = vision.ImageAnnotatorClient()

def extract_text_from_image(path: str) -> str:
  init_client()
  with open(path, 'rb') as f:
    content = f.read()
  image = vision.Image(content=content)
  response = client.document_text_detection(image=image)
  if response.error.message:
    raise Exception(response.error.message)
  return response.full_text_annotation.text
