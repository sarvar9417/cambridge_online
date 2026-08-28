#!/usr/bin/env python3
from __future__ import annotations
import json, os, urllib.error, urllib.request
from pathlib import Path

AUDIENCE='campath-topic-review'
OUT=Path(os.getenv('TOPIC_REVIEW_REPORT_DIR','artifacts/topic-review'))/'review-source.json'

def oidc_token():
    base=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']; sep='&' if '?' in base else '?'
    req=urllib.request.Request(base+sep+'audience='+AUDIENCE,headers={'Authorization':'bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    with urllib.request.urlopen(req,timeout=30) as r: return json.load(r)['value']

def call(offset,limit=250):
    req=urllib.request.Request(os.environ['TOPIC_REVIEW_RUNNER_URL'],data=json.dumps({'action':'questions','status':'needs_review','offset':offset,'limit':limit}).encode(),method='POST',headers={'Content-Type':'application/json','Authorization':'Bearer '+oidc_token()})
    try:
        with urllib.request.urlopen(req,timeout=180) as r: data=json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'runner_http_{e.code}:{e.read().decode(errors="ignore")[:2000]}') from e
    if not data.get('ok'): raise RuntimeError('runner_error:'+str(data.get('error')))
    return data['data']['rows']

def main():
    rows=[]; offset=0
    while True:
        page=call(offset)
        rows.extend(page)
        if len(page)<250: break
        offset += len(page)
    if len(rows)!=1744: raise RuntimeError(f'expected_1744:{len(rows)}')
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(rows,ensure_ascii=False,indent=2))
    print(json.dumps({'event':'review_source_dump','rows':len(rows),'path':str(OUT)},separators=(',',':')))

if __name__=='__main__': main()
