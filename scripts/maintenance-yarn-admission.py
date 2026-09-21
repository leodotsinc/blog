#!/usr/bin/env python3
"""Read-only preparation contract. No merge/build/deploy capability exists here.

The checked-in receiver is inactive. Pure review functions are exercised with
synthetic data; the collector only reads fixed GitHub/npm origins, never a URL
or evidence boolean supplied by a PR. Host authorization remains separate.
"""
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
from email.utils import parsedate_to_datetime
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

SPEC=importlib.util.spec_from_file_location('yarn_gate',Path(__file__).with_name('maintenance-yarn-gate.py'))
gate=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(gate)
MSPEC=importlib.util.spec_from_file_location('release_metadata',Path(__file__).with_name('release_manifest.py'))
manifest_contract=importlib.util.module_from_spec(MSPEC);MSPEC.loader.exec_module(manifest_contract)
REGISTRY_LIMIT=16*1024*1024
JSON_BUDGET=64*1024*1024
REPO='leodotsinc/blog';HASH=re.compile(r'[0-9a-f]{64}\Z');SHA=gate.SHA
REQUEST_KEYS={'schema_version','service','phase','request_id','issued_at','expires_at','policy_sha256','window','source_pr','baseline','base_manifest'}
CONFIG_KEYS={'schema_version','service','enabled','scheduler_app_id','actor_id','sender_id','policy_sha256','host_qualification_sha256','minimum_release_age_days','renovate_actor_id','repository_id','trusted_code','window'}
CI_JOBS={'Source tests and production build','Release publication guards','Linux image and isolated runtime'}
SENSITIVE={'scripts','bin','engines','exports','os','cpu','gypfile','bundledDependencies','bundleDependencies'}
require=gate.require


def exact(value,keys,code):require(isinstance(value,dict) and set(value)==keys,code)


def stamp(value):
    require(isinstance(value,str),'TIMESTAMP_REQUIRED')
    result=datetime.fromisoformat(value.replace('Z','+00:00'))
    require(result.tzinfo is not None,'TIMESTAMP_TIMEZONE');return result.astimezone(timezone.utc)


def fresh(value,now,maximum=timedelta(hours=24)):
    require(timedelta(0)<=now-stamp(value)<=maximum,'STALE_OR_FUTURE_EVIDENCE')


def envelope(request, *, execution=False):
    exact(request,REQUEST_KEYS|({'control_sha256'} if execution else set()),'REQUEST_SCHEMA')
    require(type(request['schema_version']) is int and request['schema_version']==1 and
            request['service']=='blog' and request['phase']=='prepare','PREPARATION_ONLY')
    exact(request['source_pr'],{'number','base_sha','head_sha','tree_sha'},'PR_SCHEMA')
    pr=request['source_pr']
    require(type(pr['number']) is int and 0<pr['number']<1000000 and
            all(isinstance(pr[k],str) and SHA.fullmatch(pr[k]) for k in ('base_sha','head_sha','tree_sha')),'PR_IDENTITY')
    exact(request['baseline'],{'git_sha','image','receipt_sha256'},'BASELINE_SCHEMA')
    m=manifest_contract.validate(request['base_manifest']);b=request['baseline']
    require(m['service']=='blog' and m['source_repository']=='https://github.com/'+REPO and
            m['application_kind']=='first_party' and m['app_version']==m['release_version'] and
            m['compose_project']=='leodotsdev' and m['deployment']['status']=='verified','BASELINE_IDENTITY')
    require(b['git_sha']==m['git_sha'] and (execution or m['git_sha']==pr['base_sha']) and b['image']==m['image'] and
            b['receipt_sha256']==gate.sha256(m),'BASELINE_BINDING')
    if execution:require(isinstance(request['control_sha256'],str) and HASH.fullmatch(request['control_sha256']),'CONTROL_PIN_REQUIRED')
    identity={'app':'blog','baseline_receipt_sha256':b['receipt_sha256'],'head_sha':pr['head_sha'],'tree_sha':pr['tree_sha']}
    require(request['request_id']==gate.sha256(identity) and isinstance(request['policy_sha256'],str) and HASH.fullmatch(request['policy_sha256']),'REQUEST_ID_OR_POLICY')
    exact(request['window'],{'start','end','timezone'},'WINDOW_SCHEMA')
    w=request['window'];start,end=stamp(w['start']),stamp(w['end']);issued,expires=stamp(request['issued_at']),stamp(request['expires_at'])
    require(w['timezone']=='America/Sao_Paulo' and start<=issued<expires<=end and
            timedelta(0)<end-start<=timedelta(hours=4) and expires-issued<=timedelta(hours=1),'WINDOW_OR_TTL')
    return request


def validate_request(request,config,event,env,production_receipt,now, *, execution=False):
    envelope(request,execution=execution)
    exact(config,CONFIG_KEYS,'CONFIG_SCHEMA')
    require(type(config['schema_version']) is int and config['schema_version']==1 and config['service']=='blog','CONFIG_IDENTITY')
    require(type(config['enabled']) is bool and config['scheduler_app_id']=='5019669' and
            config['actor_id']==config['sender_id']=='332011818' and config['minimum_release_age_days']==14 and
            config['renovate_actor_id']=='29139614' and type(config['repository_id']) is int and config['repository_id']==1021194725 and isinstance(config['trusted_code'],dict),'CONFIG_SCHEDULER_OR_AGE')
    exact(request,REQUEST_KEYS|({'control_sha256'} if execution else set()),'REQUEST_SCHEMA')
    require(type(request['schema_version']) is int and request['schema_version']==1 and request['service']=='blog' and request['phase']=='prepare','PREPARATION_ONLY')
    require(env.get('GITHUB_REPOSITORY')==REPO and env.get('GITHUB_REF')=='refs/heads/main' and
            env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1','EVENT_REF_OR_RETRY_REFUSED')
    require(env.get('GITHUB_ACTOR_ID')==config['actor_id'] and str(event.get('sender',{}).get('id'))==config['sender_id'] and
            event.get('sender',{}).get('type')=='Bot' and env.get('GITHUB_ACTOR')==env.get('GITHUB_TRIGGERING_ACTOR'),'SCHEDULER_ACTOR_REFUSED')
    exact(request['source_pr'],{'number','base_sha','head_sha','tree_sha'},'PR_SCHEMA')
    pr=request['source_pr']
    require(type(pr['number']) is int and 0<pr['number']<1000000 and
            all(isinstance(pr[k],str) and SHA.fullmatch(pr[k]) for k in ('base_sha','head_sha','tree_sha')),'PR_IDENTITY')
    exact(request['baseline'],{'git_sha','image','receipt_sha256'},'BASELINE_SCHEMA')
    b,m=request['baseline'],request['base_manifest']
    require(m==production_receipt,'PROTECTED_BASELINE_MISMATCH')
    require(isinstance(m,dict) and m.get('service')=='blog' and m.get('compose_project')=='leodotsdev' and
            m.get('source_repository')=='https://github.com/'+REPO and m.get('application_kind')=='first_party' and
            m.get('deployment',{}).get('status')=='verified' and m['deployment'].get('observed_image')==m.get('image') and
            isinstance(m.get('image'),str) and re.fullmatch(r'ghcr.io/leodotsinc/blog@sha256:[0-9a-f]{64}',m['image']),'BASELINE_UNVERIFIED')
    require(b['git_sha']==m.get('git_sha') and (execution or b['git_sha']==pr['base_sha']) and pr['base_sha']==env.get('GITHUB_SHA') and
            b['image']==m['image'] and b['receipt_sha256']==gate.sha256(m),'BASELINE_DRIFT')
    identity={'app':'blog','baseline_receipt_sha256':b['receipt_sha256'],'head_sha':pr['head_sha'],'tree_sha':pr['tree_sha']}
    require(request['request_id']==gate.sha256(identity) and isinstance(request['policy_sha256'],str) and
            HASH.fullmatch(request['policy_sha256']) and request['policy_sha256']==config['policy_sha256'],'REQUEST_OR_POLICY_HASH')
    issued,expires=stamp(request['issued_at']),stamp(request['expires_at'])
    require(issued<=now<expires and timedelta(0)<expires-issued<=timedelta(hours=1),'REQUEST_TTL')
    exact(request['window'],{'start','end','timezone'},'WINDOW_SCHEMA')
    w=request['window'];start,end=stamp(w['start']),stamp(w['end'])
    require(w['timezone']=='America/Sao_Paulo' and start<=now<expires<=end and timedelta(0)<end-start<=timedelta(hours=4),'WINDOW_OR_EXPIRY')
    # Interval validation is not approval of its calendar; no mutation is reachable.
    if execution:
        require(config['enabled'] is True and isinstance(config['host_qualification_sha256'],str) and HASH.fullmatch(config['host_qualification_sha256']),'HOST_OR_RECEIVER_NOT_QUALIFIED')
    else:require(config['enabled'] is False and config['host_qualification_sha256'] is None,'ACTIVATION_NOT_IMPLEMENTED')
    return {'schema_version':1,'service':'blog','request_id':request['request_id'],'status':'inactive',
            'preparation_authorized':False,'deployment_authorized':False,'blocker':'HOST_AND_RECEIVER_NOT_QUALIFIED'}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None


class Collector:
    def __init__(self,token=None):self.token=token;self.calls=0;self.json_bytes=0
    def get(self,host,path):
        require(host in ('api.github.com','registry.npmjs.org') and path.startswith('/') and not path.startswith('//'),'FIXED_API_ORIGIN')
        self.calls+=1;require(self.calls<=65,'API_REQUEST_LIMIT')
        headers={'Cache-Control':'no-cache','Accept':'application/vnd.github+json' if host=='api.github.com' else 'application/json','User-Agent':'cloudbox-blog-maintenance-source'}
        if host=='api.github.com':
            headers['X-GitHub-Api-Version']='2022-11-28'
            if self.token:headers['Authorization']='Bearer '+self.token
        try:
            with urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect()).open(urllib.request.Request('https://'+host+path,headers=headers),timeout=15) as response:
                observed=datetime.now(timezone.utc)
                remote_date=parsedate_to_datetime(response.headers.get('Date',''))
                require(remote_date.tzinfo is not None and abs(observed-remote_date)<=timedelta(minutes=15) and
                        0<=int(response.headers.get('Age','0'))<=3600,'STALE_HTTP_RESPONSE')
                # Registry packuments for Hono/electron already exceed 4 MiB.
                # Keep separate per-response and cumulative JSON budgets; no
                # raw metadata is persisted and timestamps still come from npm.
                limit=REGISTRY_LIMIT if host=='registry.npmjs.org' else gate.LIMIT
                raw=response.read(limit+1);self.json_bytes+=len(raw)
                require(len(raw)<=limit and self.json_bytes<=JSON_BUDGET and response.status==200,'API_UNKNOWN_OR_LIMIT')
                if host=='api.github.com':return gate.decode(raw.decode())
                return json.loads(raw.decode(),object_pairs_hook=gate.unique,
                                  parse_constant=lambda _:(_ for _ in ()).throw(gate.Refusal('NONFINITE_JSON')))
        except Exception:raise gate.Refusal('API_UNAVAILABLE_OR_MALFORMED') from None
    def github(self,path):return self.get('api.github.com',path)
    def registry(self,name):return self.get('registry.npmjs.org','/'+urllib.parse.quote(name,safe=''))
    def advisories(self,name,version):
        query=urllib.parse.urlencode({'ecosystem':'npm','affects':name+'@'+version,'per_page':100,'page':1})
        data=self.github('/advisories?'+query)
        require(isinstance(data,list) and len(data)<100,'ADVISORY_PAGINATION_OR_UNKNOWN')
        for item in data:
            require(isinstance(item,dict) and isinstance(item.get('ghsa_id'),str) and
                    'withdrawn_at' in item and isinstance(item.get('vulnerabilities'),list),'ADVISORY_SCHEMA')
        return [x for x in data if x['withdrawn_at'] is None]


def review_registry(delta,collector,now):
    require(0<len(delta['changes'])<=20,'REGISTRY_BATCH_LIMIT')
    proof=[]
    for change in delta['changes']:
        data=collector.registry(change['name'])
        require(isinstance(data,dict) and data.get('name')==change['name'],'REGISTRY_PACKAGE_IDENTITY')
        versions=data.get('versions',{});old,new=versions.get(change['before']),versions.get(change['after'])
        require(isinstance(old,dict) and isinstance(new,dict) and old.get('name')==new.get('name')==change['name'] and
                old.get('version')==change['before'] and new.get('version')==change['after'],'REGISTRY_VERSION_IDENTITY')
        require(all(old.get(k)==new.get(k) for k in SENSITIVE) and not new.get('deprecated'),'REGISTRY_BEHAVIOR_CHANGED')
        require(new.get('dist',{}).get('integrity')==change['integrity'] and
                old.get('dist',{}).get('integrity')==change['before_integrity'],'REGISTRY_INTEGRITY_MISMATCH')
        require(all(new.get(k,{})==change[k] for k in ('dependencies','optionalDependencies')),'REGISTRY_GRAPH_MISMATCH')
        published=stamp(data.get('time',{}).get(change['after']))
        require(now-published>=timedelta(days=14),'IMMATURE_UPSTREAM_RELEASE')
        advisories=collector.advisories(change['name'],change['after'])
        require(not advisories,'AFFECTING_OFFICIAL_ADVISORY')
        proof.append({'name':change['name'],'version':change['after'],'published_at':published.isoformat(),
                      'integrity':change['integrity'],'checked_at':now.isoformat(),'source':'https://registry.npmjs.org/'+change['name'],
                      'advisories_source':'https://api.github.com/advisories','affecting_advisories':[]})
    return proof


def review_ci(head,collector,now):
    require(SHA.fullmatch(head),'CI_SOURCE_SHA')
    prefix='/repos/'+REPO
    workflow=collector.github(prefix+'/actions/workflows/ci.yml')
    require(workflow.get('state')=='active' and workflow.get('path')=='.github/workflows/ci.yml','CI_WORKFLOW_UNKNOWN')
    query=urllib.parse.urlencode({'head_sha':head,'per_page':100,'page':1})
    data=collector.github(prefix+'/actions/workflows/ci.yml/runs?'+query)
    require(type(data.get('total_count')) is int and 0<data['total_count']<=100 and
            isinstance(data.get('workflow_runs'),list) and len(data['workflow_runs'])==data['total_count'],'CI_MISSING_OR_PAGINATION')
    runs=data['workflow_runs'];require(all(isinstance(r,dict) and type(r.get('id')) is int for r in runs),'CI_RUN_SCHEMA')
    run=max(runs,key=lambda r:r['id'])
    require(run.get('head_sha')==head and run.get('repository',{}).get('full_name')==REPO and
            run.get('path')=='.github/workflows/ci.yml' and run.get('event') in ('push','pull_request','workflow_dispatch') and
            run.get('status')=='completed' and run.get('conclusion')=='success','CI_NOT_EXACT_SUCCESS')
    fresh(run.get('updated_at'),now)
    attempt=run.get('run_attempt');require(type(attempt) is int and attempt>0,'CI_ATTEMPT')
    jobs=collector.github(prefix+f'/actions/runs/{run["id"]}/attempts/{attempt}/jobs?per_page=100&page=1')
    require(jobs.get('total_count')==len(CI_JOBS) and len(jobs.get('jobs',[]))==len(CI_JOBS) and
            {j.get('name') for j in jobs['jobs']}==CI_JOBS and
            all(j.get('run_id')==run['id'] and j.get('status')=='completed' and j.get('conclusion')=='success' for j in jobs['jobs']),'CI_JOBS_INCOMPLETE')
    return {'run_id':str(run['id']),'attempt':attempt,'source_sha':head,'checked_at':now.isoformat(),'updated_at':run['updated_at']}


def review(before,after,baseline,collector,now):
    delta=gate.classify(before,after,baseline)
    registry=review_registry(delta,collector,now);ci=review_ci(after['commit'],collector,now)
    # Re-sample freshness after bounded network calls. Never accept a preflight
    # timestamp whose TTL expired during collection.
    checked=datetime.now(timezone.utc)
    for item in registry:fresh(item['checked_at'],checked,timedelta(minutes=20))
    fresh(ci['updated_at'],checked)
    return {'schema_version':1,'delta':delta,'registry':registry,'ci':ci,'deployment_authorized':False,
            'status':'source_review_only','required_next':'qualified receiver and final host authorization'}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--request',required=True)
    args=parser.parse_args();config=gate.decode((Path(__file__).parents[1]/'.github/maintenance.json').read_text())
    request=gate.decode(Path(args.request).read_text())
    exact(config,CONFIG_KEYS,'CONFIG_SCHEMA');envelope(request)
    # No workflow/host trust chain is enabled yet. A dispatch cannot supply an
    # alternate config, baseline or enable flag, and no network/mutation starts.
    require(config['enabled'] is False and config['host_qualification_sha256'] is None,'ACTIVATION_NOT_IMPLEMENTED')
    print(json.dumps({'schema_version':1,'service':'blog','status':'inactive','preparation_authorized':False,
                      'deployment_authorized':False,'blocker':'HOST_AND_RECEIVER_NOT_QUALIFIED'}))

if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,TypeError,OSError):
        print('YARN_ADMISSION_REFUSED; no mutation authorized',file=sys.stderr);sys.exit(1)
