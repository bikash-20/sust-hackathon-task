import numpy as np

EMERGENCY_RULES = {
  'spo2_threshold': 92.0,
  'temp_f_threshold': 103.0
}

def analyze_vitals(vitals: dict):
  # Convert inputs to floats where possible
  def num(v):
    try:
      return float(v)
    except:
      return None

  spo2 = num(vitals.get('spo2'))
  temp = num(vitals.get('temp'))
  alerts = []
  score = 'green'

  if spo2 is not None and spo2 < EMERGENCY_RULES['spo2_threshold']:
    alerts.append('Low SpO2')
    score = 'red'
  if temp is not None and temp > EMERGENCY_RULES['temp_f_threshold']:
    alerts.append('High fever')
    score = 'red'

  # Basic Z-score outlier detection for HR and glucose
  hr = num(vitals.get('hr'))
  glucose = num(vitals.get('glucose'))
  def z_flag(x, mean=70, std=20):
    if x is None: return False
    return abs((x-mean)/std) > 2.5

  if z_flag(hr, mean=70, std=20):
    alerts.append('Abnormal heart rate')
    score = 'yellow' if score=='green' else score
  if z_flag(glucose, mean=120, std=60):
    alerts.append('Glucose outlier')
    score = 'yellow' if score=='green' else score

  return {'level': score, 'alerts': alerts}
