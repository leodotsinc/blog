#!/usr/bin/env python3
"""Qualified Blog preparation; configuration is disabled until host qualification.

A is the verified runtime source, B the trusted producer/control commit, H the
reviewed Renovate head, M a two-parent merge whose tree equals H. This module
never treats preparation, Git merge or a CI review image as deploy authority.
"""
import argparse
from datetime import datetime,timezone,timedelta
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

SPEC=importlib.util.spec_from_file_location('receiver',Path(__file__).with_name('maintenance-yarn-receiver.py'))
R=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(R)
A=R.A;G=R.G;require=G.require;PREFIX=R.PREFIX
CALLER='leodotsinc/blog/.github/workflows/maintenance.yml@refs/heads/main'
CODE=R.CODE|{'scripts/maintenance-execution.py','scripts/maintenance-guard.py','scripts/select-release.py','scripts/publish-release.py'}
CONTEXT_KEYS={'schema_version','app','mode','request_id','policy_sha256','control_sha256','baseline_receipt_sha256',
              'source_pr','head_sha','merged_sha','tree_sha','delta_sha256','window','expires_at','base_manifest',
              'producer_commit','evidence_run_id','release_run_id'}


def now():return datetime.now(timezone.utc)


def identity(request,config,event,env,root,at):
    A.envelope(request,execution=True)
    require(env.get('GITHUB_WORKFLOW_REF')==CALLER and env.get('GITHUB_WORKFLOW_SHA')==env.get('GITHUB_SHA'),'TRUSTED_CALLER_REQUIRED')
    # Validate before creating an API client or exposing a token to a mutation.
    A.validate_request(request,config,event,env,request['base_manifest'],at,execution=True)
    require(hashlib.sha256((root/G.CONTROL).read_bytes()).hexdigest()==request['control_sha256'],'ROOT_APPROVED_CONTROL_DRIFT')
    A.exact(config['trusted_code'],CODE,'EXECUTION_CLOSURE_NOT_QUALIFIED')
    R.calendar(config,request,at)


def fresh_proof(proof,at):
    A.fresh(proof['ci']['updated_at'],at)
    for item in proof['registry']:A.fresh(item['checked_at'],at,timedelta(minutes=20))
    for item in proof['review_image_evidence']['security'].values():
        A.fresh(item['observed_at'],at);A.fresh(item['database_updated_at'],at)
    A.fresh(proof['review_image_evidence']['functional']['observed_at'],at)


def code(api,producer,config,root):
    for name in sorted(CODE):
        entry=producer['files'].get(name,{})
        require(entry.get('mode')=='100644','TRUSTED_CODE_FILE')
        raw=R.blob(api,entry['oid']);expected=config['trusted_code'][name]
        require(isinstance(expected,str) and A.HASH.fullmatch(expected) and hashlib.sha256(raw).hexdigest()==expected and
                hashlib.sha256((root/name).read_bytes()).hexdigest()==expected,'TRUSTED_CODE_DRIFT')


def source(request,config,api):
    base=R.snapshot(api,request['baseline']['git_sha'],control=True)
    producer=base if base['commit']==request['source_pr']['base_sha'] else R.snapshot(api,request['source_pr']['base_sha'],control=True)
    head=R.snapshot(api,request['source_pr']['head_sha'],control=True)
    require(head['tree']==request['source_pr']['tree_sha'],'CANDIDATE_TREE_CHANGED')
    if base['commit']!=producer['commit']:
        relation=api.github(PREFIX+'/compare/'+base['commit']+'...'+producer['commit'])
        require(relation.get('status')=='ahead' and relation.get('merge_base_commit',{}).get('sha')==base['commit'] and
                type(relation.get('total_commits')) is int and 0<relation['total_commits']<=100,'CONTROL_ANCESTRY_UNKNOWN')
    delta=G.classify(base,head,base['commit'],producer=producer,control_sha256=request['control_sha256'])
    return delta,producer


def prepare(request,config,event,env,api,root,reader,clock=now):
    identity(request,config,event,env,root,clock())
    baseline=R.published_baseline(api)
    require(baseline==request['base_manifest'],'PUBLISHED_BASELINE_CHANGED')
    dedup=api.github(PREFIX+'/actions/artifacts?'+urllib.parse.urlencode({'name':'blog-maintenance-attempt-'+request['request_id'],'per_page':100,'page':1}))
    require(dedup.get('total_count')==0 and dedup.get('artifacts')==[],'DUPLICATE_REQUEST_OR_UNKNOWN')
    main=api.github(PREFIX+'/git/ref/heads/main')
    require(main.get('object',{}).get('sha')==request['source_pr']['base_sha'],'PRODUCER_MAIN_DRIFT')
    R.source_pr(api,request,config);delta,producer=source(request,config,api);code(api,producer,config,root)
    registry=A.review_registry(delta,api,clock());ci=A.review_ci(request['source_pr']['head_sha'],api,clock())
    from image_receipt import read_artifact
    images=R.image_evidence(api,ci,config,clock(),reader or read_artifact)
    result={'schema_version':1,'service':'blog','status':'prepared_pending_merge','request_id':request['request_id'],
            'request':request,'delta':delta,'registry':registry,'ci':ci,'review_image_evidence':images,
            'producer_commit':producer['commit'],'observed_at':clock().isoformat(),'deployment_authorized':False}
    R.source_pr(api,request,config)
    require(api.github(PREFIX+'/git/ref/heads/main').get('object',{}).get('sha')==producer['commit'],'MAIN_CHANGED_DURING_COLLECTION')
    at=clock();identity(request,config,event,env,root,at);fresh_proof(result,at)
    return result


def merged_identity(commit,main,request):
    pr=request['source_pr'];merged=commit.get('sha')
    require(isinstance(merged,str) and G.SHA.fullmatch(merged) and merged not in (pr['base_sha'],pr['head_sha']) and
            main.get('object',{}).get('sha')==merged and [p.get('sha') for p in commit.get('parents',[])]==[pr['base_sha'],pr['head_sha']] and
            commit.get('commit',{}).get('tree',{}).get('sha')==pr['tree_sha'],'MERGE_IDENTITY_UNKNOWN')
    return merged


class API(R.GitHub):
    def merge_once(self,number,head):
        require(type(number) is int and 0<number<1000000 and G.SHA.fullmatch(head),'MERGE_INPUT')
        self.calls+=1;require(self.calls<=65,'API_REQUEST_LIMIT')
        headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
                 'Content-Type':'application/json','Authorization':'Bearer '+(self.token or '')}
        req=urllib.request.Request('https://api.github.com'+PREFIX+f'/pulls/{number}/merge',
                                   data=G.canonical({'sha':head,'merge_method':'merge'}),headers=headers,method='PUT')
        # A PUT is issued once. Any transport/HTTP/parser failure is ambiguous;
        # callers persist the reconciliation barrier instead of retrying.
        try:
            with urllib.request.build_opener(urllib.request.ProxyHandler({}),A.NoRedirect()).open(req,timeout=10) as response:
                raw=response.read(16385)
                require(response.status==200 and len(raw)<=16384,'MERGE_RESPONSE_UNKNOWN')
                return G.decode(raw.decode())
        except Exception:raise G.Refusal('MERGE_RESULT_UNKNOWN_RECONCILE') from None


def merge(prepared,request,config,event,env,api,root,journal,clock=now,persist=lambda journal:None):
    identity(request,config,event,env,root,clock())
    require(prepared.get('status')=='prepared_pending_merge' and prepared.get('request')==request and
            prepared.get('request_id')==request['request_id'],'PREPARATION_CHANGED')
    # A previously uploaded request artifact is the cross-run barrier. This
    # process-local journal adds explicit pre/post mutation state to its outcome.
    require(journal.get('status')=='request_reserved' and journal.get('request_id')==request['request_id'],'REQUEST_RESERVATION_REQUIRED')
    R.source_pr(api,request,config)
    require(api.github(PREFIX+'/git/ref/heads/main').get('object',{}).get('sha')==request['source_pr']['base_sha'],'MAIN_CHANGED_BEFORE_MERGE')
    at=clock();identity(request,config,event,env,root,at);fresh_proof(prepared,at)
    require(A.stamp(request['expires_at'])-at>=timedelta(seconds=15),'INSUFFICIENT_MUTATION_WINDOW')
    journal.update(status='merge_pending_reconciliation',head_sha=request['source_pr']['head_sha']);persist(journal)
    try:
        answer=api.merge_once(request['source_pr']['number'],request['source_pr']['head_sha'])
        require(answer.get('merged') is True and isinstance(answer.get('sha'),str) and G.SHA.fullmatch(answer['sha']),'MERGE_RESULT_UNKNOWN_RECONCILE')
        commit=api.github(PREFIX+'/commits/'+answer['sha']);main=api.github(PREFIX+'/git/ref/heads/main')
        merged=merged_identity(commit,main,request)
    except Exception:
        journal.update(status='merge_unknown_requires_reconciliation');persist(journal)
        raise G.Refusal('MERGE_RESULT_UNKNOWN_RECONCILE') from None
    journal.update(status='merged_pending_build',merged_sha=merged);persist(journal)
    # A mutation that completed at/after expiry remains reconciled, but cannot
    # continue to build, publish or use the host gateway.
    identity(request,config,event,env,root,clock())
    return merged


def context(request,prepared,merged,run_id):
    require(re.fullmatch(r'[1-9][0-9]*',run_id),'RUN_ID')
    pr=request['source_pr']
    return {'schema_version':1,'app':'blog','mode':'monthly','request_id':request['request_id'],
            'policy_sha256':request['policy_sha256'],'control_sha256':request['control_sha256'],
            'baseline_receipt_sha256':request['baseline']['receipt_sha256'],'source_pr':pr,'head_sha':pr['head_sha'],
            'merged_sha':merged,'tree_sha':pr['tree_sha'],'delta_sha256':prepared['delta']['delta_sha256'],
            'window':request['window'],'expires_at':request['expires_at'],'base_manifest':request['base_manifest'],
            'producer_commit':pr['base_sha'],'evidence_run_id':int(prepared['ci']['run_id']),'release_run_id':int(run_id)}


def preflight(value,request,config,event,env,api,root,at,clock=now):
    A.exact(value,CONTEXT_KEYS,'CONTEXT_SCHEMA');identity(request,config,event,env,root,at)
    require(value['app']=='blog' and type(value['schema_version']) is int and value['schema_version']==1 and value['mode']=='monthly' and
            type(value['evidence_run_id']) is int and value['evidence_run_id']>0 and type(value['release_run_id']) is int and
            str(value['release_run_id'])==env.get('GITHUB_RUN_ID') and G.SHA.fullmatch(value['merged_sha']) and
            value['merged_sha'] not in (request['source_pr']['base_sha'],request['source_pr']['head_sha']),'CONTEXT_IDENTITY')
    for key in ('request_id','policy_sha256','control_sha256','source_pr','window','expires_at','base_manifest'):
        require(value[key]==request[key],'CONTEXT_REQUEST_CHANGED')
    require(value['producer_commit']==request['source_pr']['base_sha'] and value['head_sha']==request['source_pr']['head_sha'] and
            value['tree_sha']==request['source_pr']['tree_sha'] and value['baseline_receipt_sha256']==request['baseline']['receipt_sha256'],'CONTEXT_SOURCE_CHANGED')
    require(R.published_baseline(api)==request['base_manifest'],'PUBLISHED_BASELINE_CHANGED')
    delta,producer=source(request,config,api);code(api,producer,config,root)
    require(delta['delta_sha256']==value['delta_sha256'],'CUMULATIVE_DELTA_CHANGED')
    commit=api.github(PREFIX+'/commits/'+value['merged_sha'])
    merged_identity(commit,api.github(PREFIX+'/git/ref/heads/main'),request)
    ci=A.review_ci(request['source_pr']['head_sha'],api,clock())
    require(int(ci['run_id'])==value['evidence_run_id'],'CI_RUN_CHANGED')
    registry=A.review_registry(delta,api,clock())
    final=clock();identity(request,config,event,env,root,final);A.fresh(ci['updated_at'],final)
    for item in registry:A.fresh(item['checked_at'],final,timedelta(minutes=20))
    # Checked once more after all remote reads, immediately before the caller's
    # build/publish step. Host performs its own final authorization under locks.
    require(api.github(PREFIX+'/git/ref/heads/main').get('object',{}).get('sha')==value['merged_sha'],'MAIN_CHANGED_AFTER_PREFLIGHT')
    identity(request,config,event,env,root,clock())
    return delta


def write(path,value):
    path.write_bytes(G.canonical(value)+b'\n')


def output(**values):
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as stream:
            for key,value in values.items():
                value=str(value);require('\n' not in value and '\r' not in value,'OUTPUT_VALUE');stream.write(key+'='+value+'\n')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['validate','prepare','merge','preflight'])
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);parser.add_argument('--request',type=Path,required=True)
    parser.add_argument('--prepared',type=Path,default=Path('maintenance-prepared.json'));parser.add_argument('--journal',type=Path,default=Path('maintenance-outcome.json'))
    parser.add_argument('--context',type=Path,default=Path('maintenance-context.json'));args=parser.parse_args()
    request=G.decode(args.request.read_text());config=G.decode((args.root/G.CONTROL).read_text());event=G.decode(Path(os.environ['GITHUB_EVENT_PATH']).read_text());env=dict(os.environ)
    identity(request,config,event,env,args.root,now())
    if args.command=='validate':return
    api=API(os.environ.get('GH_TOKEN'))
    if args.command=='prepare':
        proof=prepare(request,config,event,env,api,args.root,None);write(args.prepared,proof)
        write(args.journal,{'schema_version':1,'request_id':request['request_id'],'status':'request_reserved','deployment_authorized':False})
        output(request_id=request['request_id']);return
    if args.command=='merge':
        proof=G.decode(args.prepared.read_text());journal=G.decode(args.journal.read_text())
        try:
            sha=merge(proof,request,config,event,env,api,args.root,journal,persist=lambda value:write(args.journal,value))
            value=context(request,proof,sha,env['GITHUB_RUN_ID']);write(args.context,value)
            version=G.version(request['base_manifest']['release_version']);version='.'.join(map(str,(version[0],version[1],version[2]+1)))
            output(source_sha=sha,release_version=version,maintenance_context=G.canonical(value).decode())
        finally:write(args.journal,journal)
        return
    value=G.decode(args.context.read_text());preflight(value,request,config,event,env,api,args.root,now())
    require(env.get('SOURCE_SHA')==value['merged_sha'],'RELEASE_SOURCE_CHANGED')
    expected=G.version(request['base_manifest']['release_version']);expected='.'.join(map(str,(expected[0],expected[1],expected[2]+1)))
    require(env.get('RELEASE_VERSION')==expected,'RELEASE_VERSION_CHANGED')

if __name__=='__main__':
    try:main()
    except Exception as error:
        message=str(error);message=message if re.fullmatch(r'[A-Z][A-Z0-9_]{2,80}',message) else 'MAINTENANCE_EXECUTION_REFUSED'
        print(message,file=sys.stderr);sys.exit(1)
