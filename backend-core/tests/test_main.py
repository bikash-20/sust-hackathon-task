import pytest
from httpx import AsyncClient, ASGITransport
import importlib.util
import sys
from pathlib import Path


def load_app():
    root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(root))
    import importlib
    import app as backend_app
    importlib.reload(backend_app)
    return backend_app


@pytest.mark.asyncio
async def test_vitals_endpoint():
    backend_app = load_app()
    transport = ASGITransport(app=backend_app.app)
    async with AsyncClient(transport=transport, base_url='http://test') as ac:
        payload = {'bp':'120/80','hr':72,'temp':98.6,'spo2':98,'glucose':110}
        r = await ac.post('/api/vitals', json=payload)
        assert r.status_code == 200
        data = r.json()
        assert 'level' in data


@pytest.mark.asyncio
async def test_ocr_parse(monkeypatch):
    # mock llm_client.call_edge_router
    async def fake_call(prompt, temperature=0.2, api_key=None, max_tokens=1000):
        return {
            'medications':[{'name':'Paracetamol','dosage':'500mg','frequency':'1+0+1','route':'oral'}],
            'diagnoses':['Fever'],
            'labs':[{'test_name':'WBC','value':7.5,'units':'10^3/uL'}]
        }

    backend_app = load_app()
    monkeypatch.setattr(backend_app.llm_client, 'call_edge_router', fake_call)
    transport = ASGITransport(app=backend_app.app)
    async with AsyncClient(transport=transport, base_url='http://test') as ac:
        r = await ac.post('/api/ocr/parse', json={'raw_text':'Paracetamol 500mg 1+0+1\nWBC:7.5'})
        assert r.status_code == 200
        data = r.json()
        assert 'medications' in data
        assert data['medications'][0]['name'] == 'Paracetamol'


@pytest.mark.asyncio
async def test_triage_endpoint(monkeypatch):
    async def fake_call(prompt, temperature=0.0, api_key=None, max_tokens=800):
        return {
            'triage_severity':'Green',
            'clinical_reasoning':'Symptoms mild',
            'differential_diagnoses':['Viral fever'],
            'immediate_recommendations':['Rest','Oral fluids'],
            'referral_urgency':'Low'
        }

    backend_app = load_app()
    monkeypatch.setattr(backend_app.llm_client, 'call_edge_router', fake_call)
    transport = ASGITransport(app=backend_app.app)
    async with AsyncClient(transport=transport, base_url='http://test') as ac:
        payload = {
            'normalized_text':'Patient with cough and mild fever',
            'vitals_anomaly':{'level':'green','alerts':[]},
            'history':{'medications':[]}
        }
        r = await ac.post('/api/triage', json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data['triage_severity'] == 'Green'
