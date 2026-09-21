#!/usr/bin/env python3
"""One personal, reviewed adoption release; never a maintenance policy exception.

The host requires an independently installed, exact baseline/target approval.
This program only authenticates a previously prepared image and copies its bytes.
"""
import argparse
from datetime import datetime,timedelta,timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import sys
import zipfile

def load(name):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(name));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
R=load('maintenance-yarn-receiver.py');A=R.A;G=R.G;I=load('image_receipt.py');M=A.manifest_contract
require=G.require
BASE='82a49ac5e72b76d31044e1782d49abfb65258111'
NODE='node:26-alpine@sha256:dbaa92e5758cbbcf85d65d5403fdb530fe3442cbe8c6dbfb7ef23365450d5070'
PERSON=22529012
KEYS={'schema_version','service','source_sha','source_tree','baseline_receipt_sha256','target_manifest_sha256','prepare_run_id','prepare_run_attempt','cumulative_delta_sha256','issued_at','expires_at'}
ALLOWED={'.github/dependabot.yml','.github/maintenance.json','.github/workflows/ci.yml','.github/workflows/deploy.yml','.github/workflows/maintenance.yml','.github/workflows/reviewed-bootstrap.yml','AGENTS.md','Dockerfile','package.json','renovate.json','yarn.lock',
'scripts/dependency-security.test.mjs','scripts/image_receipt.py','scripts/maintenance-execution.py','scripts/maintenance-guard.py','scripts/maintenance-yarn-admission.py','scripts/maintenance-yarn-gate.py','scripts/maintenance-yarn-receiver.py','scripts/qualify-image.py','scripts/reviewed-bootstrap.py','scripts/test_release_bootstrap.py','scripts/test_release_image_receipt.py','scripts/test_release_maintenance.py','scripts/test_release_maintenance_execution.py','scripts/test_release_yarn_admission.py','scripts/test_release_yarn_receiver.py'}
# These two reviewed adoption changes are never accepted by the monthly gate.
REVIEWED_BREAKING={('toml','3.0.0','4.2.0'),('@humanwhocodes/retry','0.3.1','0.4.3')}
REVIEWED_ADDITIONS={('@humanfs/types','0.15.0')}

def clock():return datetime.now(timezone.utc)

def envelope(request,env,event,now):
    A.exact(request,KEYS,'BOOTSTRAP_SCHEMA')
    require(type(request['schema_version']) is int and request['schema_version']==1 and request['service']=='blog','BOOTSTRAP_SERVICE')
    for key in ('source_sha','source_tree'):require(isinstance(request[key],str) and G.SHA.fullmatch(request[key]),'BOOTSTRAP_SOURCE')
    for key in ('baseline_receipt_sha256','target_manifest_sha256','cumulative_delta_sha256'):require(isinstance(request[key],str) and A.HASH.fullmatch(request[key]),'BOOTSTRAP_HASH')
    for key in ('prepare_run_id','prepare_run_attempt'):require(type(request[key]) is int and 0<request[key]<2**53,'BOOTSTRAP_RUN')
    issued,expires=A.stamp(request['issued_at']),A.stamp(request['expires_at'])
    require(issued<=now<expires and expires-issued<=timedelta(hours=1) and expires-now>=timedelta(minutes=15),'BOOTSTRAP_TTL')
    require(env.get('GITHUB_REPOSITORY')==A.REPO and env.get('GITHUB_REPOSITORY_ID')=='1021194725' and env.get('GITHUB_REF')=='refs/heads/main' and env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1','BOOTSTRAP_CALLER')
    require(env.get('GITHUB_ACTOR_ID')==str(PERSON) and env.get('GITHUB_ACTOR')==env.get('GITHUB_TRIGGERING_ACTOR')=='leodots' and event.get('sender',{}).get('id')==PERSON,'BOOTSTRAP_PERSONAL_IDENTITY')
    require(env.get('GITHUB_SHA')==env.get('GITHUB_WORKFLOW_SHA')==request['source_sha'] and env.get('GITHUB_WORKFLOW_REF')==A.REPO+'/.github/workflows/reviewed-bootstrap.yml@refs/heads/main','BOOTSTRAP_WORKFLOW')

def delta(before,after):
    G.validate_snapshot(before);G.validate_snapshot(after)
    require(before['commit']==BASE,'BOOTSTRAP_BASELINE')
    rows=[{'path':p,'before':before['files'].get(p),'after':after['files'].get(p)} for p in sorted(set(before['files'])|set(after['files'])) if before['files'].get(p)!=after['files'].get(p)]
    require(rows and {x['path'] for x in rows}<=ALLOWED,'BOOTSTRAP_UNREVIEWED_PATH')
    old=G.decode(before['contents']['package.json']);new=G.decode(after['contents']['package.json'])
    require({k:v for k,v in old.items() if k!='resolutions'}=={k:v for k,v in new.items() if k!='resolutions'},'BOOTSTRAP_PACKAGE_BEHAVIOR')
    oldlock=G.parse_yarn(before['contents']['yarn.lock']);newlock=G.parse_yarn(after['contents']['yarn.lock'])
    a,_=G.graph(old,oldlock);b,_=G.graph(new,newlock)
    for selector in set(oldlock)&set(newlock):
        name,_=G.split_selector(selector);previous=oldlock[selector]['version'];version=newlock[selector]['version']
        if previous!=version and (name,previous,version) not in REVIEWED_BREAKING:G.compatible(previous,version)
    changes=[]
    for identity,value in sorted(b.items()):
        if identity in a:
            require(a[identity]==value,'BOOTSTRAP_SAME_VERSION_DRIFT');continue
        name,version=G.split_selector(identity);prior=[G.split_selector(k)[1] for k in a if G.split_selector(k)[0]==name]
        require(prior or (name,version) in REVIEWED_ADDITIONS,'BOOTSTRAP_PACKAGE_ADDITION')
        if prior:
            eligible=[v for v in prior if G.version(v)<=G.version(version)]
            require(eligible,'BOOTSTRAP_DEPENDENCY_DOWNGRADE')
            previous=max(eligible,key=G.version)
            if (name,previous,version) not in REVIEWED_BREAKING:G.compatible(previous,version)
        changes.append({'name':name,'version':version,'integrity':value['integrity']})
    require(0<len(changes)<=32,'BOOTSTRAP_DEPENDENCY_LIMIT')
    return {'baseline_commit':BASE,'source_commit':after['commit'],'source_tree':after['tree'],'files':rows,'dependencies':changes}

def registry(changes,api,now):
    for change in changes:
        name,version=change['name'],change['version'];data=api.registry(name);item=data.get('versions',{}).get(version,{})
        require(data.get('name')==item.get('name')==name and item.get('version')==version and item.get('dist',{}).get('integrity')==change['integrity'],'BOOTSTRAP_REGISTRY_IDENTITY')
        published=A.stamp(data.get('time',{}).get(version))
        require(now-published>=timedelta(days=14),'BOOTSTRAP_IMMATURE_VERSION')
        require(api.advisories(name,version)==[],'BOOTSTRAP_OFFICIAL_ADVISORY')

def single(raw,name):
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        entries=z.infolist();require(len(entries)==1 and entries[0].filename==name and entries[0].file_size<=16384 and not entries[0].flag_bits&1,'BOOTSTRAP_ZIP')
        return z.read(entries[0])

def authenticate(request,api,registry_api,root,env,event,now_fn=clock):
    started=now_fn();envelope(request,env,event,started);sha=request['source_sha'];rid=request['prepare_run_id'];attempt=request['prepare_run_attempt']
    current=api.github(R.PREFIX+'/commits/main');require(current.get('sha')==sha,'BOOTSTRAP_MAIN_DRIFT')
    baseline=R.published_baseline(api)
    require(baseline['git_sha']==BASE and G.sha256(baseline)==request['baseline_receipt_sha256'],'BOOTSTRAP_PUBLISHED_BASELINE')
    before,after=G.collect(BASE,str(root)),G.collect(sha,str(root));review=delta(before,after)
    require(after['tree']==request['source_tree'] and G.sha256(review)==request['cumulative_delta_sha256'],'BOOTSTRAP_REVIEWED_DELTA')
    docker=G.git('show',sha+':Dockerfile',cwd=str(root)).decode()
    require([line.split()[1] for line in docker.splitlines() if line.startswith('FROM ')]==[NODE,NODE],'BOOTSTRAP_NODE_BASE')
    registry(review['dependencies'],registry_api,now_fn());ci=A.review_ci(sha,api,now_fn())
    run=api.github(R.PREFIX+f'/actions/runs/{rid}');publisher=api.github(R.PREFIX+'/actions/runs/'+env['GITHUB_RUN_ID'])
    for observed in (run,publisher):
        require(observed.get('repository',{}).get('id')==1021194725 and observed.get('actor',{}).get('id')==observed.get('triggering_actor',{}).get('id')==PERSON,'BOOTSTRAP_RUN_PERSON')
    require(run.get('id')==rid and run.get('run_attempt')==attempt and run.get('head_sha')==sha and run.get('event')=='workflow_dispatch' and run.get('path')=='.github/workflows/deploy.yml' and run.get('status')=='completed' and run.get('conclusion')=='success','BOOTSTRAP_PREPARE_RUN')
    A.fresh(run.get('updated_at'),now_fn())
    jobs=api.github(R.PREFIX+f'/actions/runs/{rid}/attempts/{attempt}/jobs?per_page=100&page=1')
    require(type(jobs.get('total_count')) is int and jobs['total_count']==len(jobs.get('jobs',[])) and 2<=jobs['total_count']<=10,'BOOTSTRAP_JOB_LIST')
    passed={'Select verified source and version','Build and qualify exact image'}
    require({j['name'] for j in jobs['jobs'] if j.get('conclusion')=='success'}==passed and all(j.get('run_id')==rid and j.get('status')=='completed' and (j.get('conclusion')=='skipped' or j['name'] in passed) for j in jobs['jobs']),'BOOTSTRAP_PREPARE_JOBS')
    def bound(metadata):
        linked=metadata.get('workflow_run',{});require(linked.get('id')==rid and linked.get('head_sha')==sha and linked.get('repository_id')==linked.get('head_repository_id')==1021194725,'BOOTSTRAP_ARTIFACT_PROVENANCE')
    pm,pr=R.artifact(api,f'blog-preparation-{rid}-{attempt}',rid);proof=G.decode(single(pr,'preparation.json').decode())
    bound(pm)
    A.exact(proof,{'schema_version','prepare_only','run_id','run_attempt','source_sha','manifest_sha256'},'BOOTSTRAP_PREPARE_PROOF')
    require(proof=={'schema_version':1,'prepare_only':True,'run_id':rid,'run_attempt':attempt,'source_sha':sha,'manifest_sha256':request['target_manifest_sha256']},'BOOTSTRAP_PREPARE_FLAG')
    mm,mr=R.artifact(api,f'blog-release-{rid}-{attempt}',rid);raw=single(mr,'release.json');manifest=M.validate(G.decode(raw.decode()))
    bound(mm)
    require(G.sha256(manifest)==request['target_manifest_sha256'] and manifest['deployment']['status']=='built' and manifest['service']=='blog' and manifest['compose_project']=='leodotsdev' and manifest['application_kind']=='first_party' and manifest['app_version']==manifest['release_version'] and re.fullmatch(r'ghcr\.io/leodotsinc/blog@sha256:[0-9a-f]{64}',manifest['image']) and manifest['git_sha']==sha and manifest['build']['id']==str(rid) and manifest['build']['attempt']==attempt and manifest['source_repository']=='https://github.com/'+A.REPO,'BOOTSTRAP_TARGET_MANIFEST')
    sm,sr=R.artifact(api,f'blog-release-security-{rid}-{attempt}',rid);security=R.security_proof(sr,sm,run,now_fn(),1021194725)
    fm,fr=R.artifact(api,f'blog-release-functional-{rid}-{attempt}',rid)
    expected={'image_id':security['runtime']['image'],'release':{'version':manifest['release_version'],'revision':sha,'build_id':str(rid)},'producer':{'run_id':str(rid),'run_attempt':attempt,'workflow':'deploy.yml','job':'build'},'harness_sha256':{p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in I.HARNESS}}
    I.read_artifact(fr,fm,run,expected,now_fn())
    require(api.github(R.PREFIX+'/commits/main').get('sha')==sha,'BOOTSTRAP_FINAL_MAIN_DRIFT');envelope(request,env,event,now_fn());A.fresh(ci['updated_at'],now_fn())
    require(now_fn()-started<=timedelta(minutes=5),'BOOTSTRAP_METADATA_EXPIRED')
    for proof in security.values():A.fresh(proof['observed_at'],now_fn());A.fresh(proof['database_updated_at'],now_fn())
    return raw,{'schema_version':1,'target_manifest_sha256':request['target_manifest_sha256'],'image':manifest['image'],'image_id':expected['image_id'],'source_sha':sha,'prepare_run_id':rid,'prepare_run_attempt':attempt,'cumulative_delta_sha256':request['cumulative_delta_sha256'],'production_authorized':False}

def main():
    p=argparse.ArgumentParser();p.add_argument('command',choices=('validate','image','review'));p.add_argument('--request',default='bootstrap-request.json');p.add_argument('--root',default='.');p.add_argument('--image-id');args=p.parse_args();root=Path(args.root).resolve()
    if args.command=='review':
        result=delta(G.collect(BASE,str(root)),G.collect(os.environ['GITHUB_SHA'],str(root)));print(json.dumps({'review':result,'cumulative_delta_sha256':G.sha256(result)},sort_keys=True));return
    raw=Path(args.request).read_bytes();require(0<len(raw)<=16384,'BOOTSTRAP_INPUT_SIZE');request=G.decode(raw.decode());event=G.decode(Path(os.environ['GITHUB_EVENT_PATH']).read_text());envelope(request,os.environ,event,clock())
    if args.command=='image':
        proof=G.decode(Path('bootstrap-proof.json').read_text());manifest=M.validate(G.decode(Path('release.json').read_text()))
        require(G.sha256(manifest)==request['target_manifest_sha256'] and proof['target_manifest_sha256']==request['target_manifest_sha256'] and args.image_id==proof['image_id'],'BOOTSTRAP_PULLED_IMAGE_ID');return
    api=R.GitHub(os.environ.get('GH_TOKEN'));registry_api=A.Collector(os.environ.get('GH_TOKEN'))
    release,proof=authenticate(request,api,registry_api,root,os.environ,event)
    Path('release.json').write_bytes(release);Path('bootstrap-proof.json').write_text(json.dumps(proof,sort_keys=True)+'\n')
    with open(os.environ['GITHUB_OUTPUT'],'a') as output:output.write('source_sha='+request['source_sha']+'\nimage='+proof['image']+'\n')

if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,TypeError,OSError,RuntimeError):
        print('REVIEWED_BOOTSTRAP_REFUSED; no new image or host authorization created',file=sys.stderr);sys.exit(1)
