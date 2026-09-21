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
import io
import zipfile
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
    for item in proof['registry']:A.fresh(item['checked_at'],at)
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


def identity_snapshot(api,sha):
    """Authenticate a Git tree, without parsing dependency manifests."""
    obj=api.github(PREFIX+'/git/commits/'+sha)
    require(obj.get('sha')==sha and G.SHA.fullmatch(obj.get('tree',{}).get('sha','')),'SOURCE_COMMIT_IDENTITY')
    tree=obj['tree']['sha'];rows=api.github(PREFIX+'/git/trees/'+tree+'?recursive=1')
    require(rows.get('sha')==tree and rows.get('truncated') is False and isinstance(rows.get('tree'),list) and len(rows['tree'])<=20000,'SOURCE_TREE_INCOMPLETE')
    files={}
    for row in rows['tree']:
        if row.get('type')=='tree':continue
        require(row.get('type')=='blob' and row.get('path') not in files,'SOURCE_TREE_ENTRY')
        files[row['path']]={'mode':row.get('mode'),'oid':row.get('sha')}
    require(G.tree_oid(files)==tree,'SOURCE_TREE_HASH')
    return {'commit':sha,'tree':tree,'files':files}


def read_json_artifact(api,name,run_id,attempt,head,filename,limit=128*1024):
    listing=api.github(PREFIX+f'/actions/runs/{run_id}/artifacts?per_page=100&page=1')
    require(type(listing.get('total_count')) is int and listing['total_count']==len(listing.get('artifacts',[]))<=100,'SOURCE_ARTIFACT_LIST')
    found=[row for row in listing['artifacts'] if row.get('name')==name]
    require(len(found)==1,'SOURCE_ARTIFACT_MISSING_OR_AMBIGUOUS');meta=found[0];linked=meta.get('workflow_run',{})
    require(meta.get('expired') is False and type(meta.get('id')) is int and meta['id']>0 and
            linked.get('id')==run_id and linked.get('head_sha')==head and
            linked.get('repository_id')==linked.get('head_repository_id')==1021194725,'SOURCE_ARTIFACT_PRODUCER')
    raw=api.binary(PREFIX+'/actions/artifacts/'+str(meta['id'])+'/zip',meta,256*1024)
    require(meta.get('digest')=='sha256:'+hashlib.sha256(raw).hexdigest(),'SOURCE_ARCHIVE_DIGEST')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries=archive.infolist()
        require(len(entries)==1 and entries[0].filename==filename and entries[0].file_size<=limit and not entries[0].flag_bits&1,'SOURCE_ARTIFACT_CONTENTS')
        value=G.decode(archive.read(entries[0]).decode())
    return value,{'id':meta['id'],'digest':meta['digest']}


def registry_rows(rows,delta,at,maximum=timedelta(hours=24)):
    require(isinstance(rows,list) and 0<len(rows)==len(delta['changes'])<=20,'REGISTRY_PROOF_INCOMPLETE')
    expected={(item['name'],item['after'],item['integrity']) for item in delta['changes']}
    require(len(expected)==len(rows),'REGISTRY_PROOF_DUPLICATE')
    seen=set()
    for row in rows:
        A.exact(row,{'name','version','integrity','published_at','checked_at','source','advisories_source','affecting_advisories'},'REGISTRY_PROOF_SCHEMA')
        key=(row['name'],row['version'],row['integrity']);require(key in expected and key not in seen,'REGISTRY_PROOF_IDENTITY');seen.add(key)
        require(row['source']=='https://registry.npmjs.org/'+row['name'] and row['advisories_source']=='https://api.github.com/advisories' and row['affecting_advisories']==[],'REGISTRY_PROOF_UNKNOWN')
        A.fresh(row['checked_at'],at,maximum)
        require(at-A.stamp(row['published_at'])>=timedelta(days=14),'IMMATURE_UPSTREAM_RELEASE')


def source_proof(request,config,api,root,ci,at):
    """Consume trusted CI semantics; never parse Yarn or reclassify in a receiver."""
    pr=request['source_pr'];number=int(ci['run_id']);attempt=ci['attempt']
    value,binding=read_json_artifact(api,f'blog-source-qualification-{number}-{attempt}',number,attempt,pr['head_sha'],'source-qualification.json')
    expected={'schema_version':2,'repository':R.REPO,'run_id':number,'run_attempt':attempt,
        'producer_commit':pr['head_sha'],'producer_base':pr['base_sha'],'head_sha':pr['head_sha'],'tree_sha':pr['tree_sha'],
        'baseline_commit':request['baseline']['git_sha'],'baseline_receipt_sha256':G.sha256(request['base_manifest']),
        'control_sha256':request['control_sha256'],'code_sha256':config['trusted_code'],'status':'passed','code':None}
    A.exact(value,set(expected)|{'classification','registry','observed_at'},'SOURCE_PROOF_SCHEMA')
    require(type(value['schema_version']) is int and type(value['run_id']) is int and type(value['run_attempt']) is int and all(value[k]==v for k,v in expected.items()),'SOURCE_PROOF_IDENTITY')
    A.fresh(value['observed_at'],at)
    base,producer,head=[identity_snapshot(api,sha) for sha in (request['baseline']['git_sha'],pr['base_sha'],pr['head_sha'])]
    require(head['tree']==pr['tree_sha'],'SOURCE_TREE_CHANGED');code(api,producer,config,root)
    changed=lambda left,right:sorted(p for p in set(left['files'])|set(right['files']) if left['files'].get(p)!=right['files'].get(p))
    require(set(changed(base,producer))<={G.CONTROL} and set(changed(producer,head))<=G.ALLOWED,'SOURCE_UNQUALIFIED_FILE_CHANGE')
    control=R.blob(api,producer['files'][G.CONTROL]['oid'])
    require(hashlib.sha256(control).hexdigest()==request['control_sha256'],'ROOT_APPROVED_CONTROL_DRIFT')
    delta=value['classification']
    A.exact(delta,{'schema_version','service','baseline_commit','candidate_commit','candidate_tree','paths','changes','control','delta_sha256','deployment_authorized','required_next'},'SOURCE_DELTA_SCHEMA')
    require(delta['schema_version']==1 and delta['service']=='blog' and delta['baseline_commit']==base['commit'] and delta['candidate_commit']==head['commit'] and
        delta['candidate_tree']==head['tree'] and delta['paths']==changed(base,head) and delta['deployment_authorized'] is False and
        delta['delta_sha256']==G.sha256({k:v for k,v in delta.items() if k not in {'delta_sha256','deployment_authorized','required_next'}}),'SOURCE_DELTA_IDENTITY')
    require(delta['control']=={'producer_commit':producer['commit'],'path':G.CONTROL,'baseline_blob_oid':base['files'][G.CONTROL]['oid'],
        'producer_blob_oid':producer['files'][G.CONTROL]['oid'],'sha256':request['control_sha256']},'SOURCE_CONTROL_IDENTITY')
    registry_rows(value['registry'],delta,at)
    return value,binding,producer


def prepare(request,config,event,env,api,root,reader,clock=now):
    identity(request,config,event,env,root,clock())
    baseline=R.published_baseline(api)
    require(baseline==request['base_manifest'],'PUBLISHED_BASELINE_CHANGED')
    dedup=api.github(PREFIX+'/actions/artifacts?'+urllib.parse.urlencode({'name':'blog-maintenance-attempt-'+request['request_id'],'per_page':100,'page':1}))
    require(dedup.get('total_count')==0 and dedup.get('artifacts')==[],'DUPLICATE_REQUEST_OR_UNKNOWN')
    main=api.github(PREFIX+'/git/ref/heads/main')
    require(main.get('object',{}).get('sha')==request['source_pr']['base_sha'],'PRODUCER_MAIN_DRIFT')
    R.source_pr(api,request,config);ci=A.review_ci(request['source_pr']['head_sha'],api,clock())
    qualified,binding,producer=source_proof(request,config,api,root,ci,clock())
    delta=qualified['classification'];registry=qualified['registry']
    from image_receipt import read_artifact
    images=R.image_evidence(api,ci,config,clock(),reader or read_artifact)
    result={'schema_version':1,'service':'blog','status':'prepared_pending_merge','request_id':request['request_id'],
            'request':request,'delta':delta,'registry':registry,'source_artifact':binding,'ci':ci,'review_image_evidence':images,
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


def preflight(value,request,config,event,env,api,root,at,clock=now, *, with_proof=False):
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
    ci=A.review_ci(request['source_pr']['head_sha'],api,clock())
    qualified,binding,producer=source_proof(request,config,api,root,ci,clock())
    delta=qualified['classification']
    require(delta['delta_sha256']==value['delta_sha256'],'CUMULATIVE_DELTA_CHANGED')
    commit=api.github(PREFIX+'/commits/'+value['merged_sha'])
    merged_identity(commit,api.github(PREFIX+'/git/ref/heads/main'),request)
    require(int(ci['run_id'])==value['evidence_run_id'],'CI_RUN_CHANGED')
    registry=qualified['registry']
    final=clock();identity(request,config,event,env,root,final);A.fresh(ci['updated_at'],final)
    for item in registry:A.fresh(item['checked_at'],final)
    # Checked once more after all remote reads, immediately before the caller's
    # build/publish step. Host performs its own final authorization under locks.
    require(api.github(PREFIX+'/git/ref/heads/main').get('object',{}).get('sha')==value['merged_sha'],'MAIN_CHANGED_AFTER_PREFLIGHT')
    identity(request,config,event,env,root,clock())
    return (qualified,binding) if with_proof else delta


def refresh_registry(context,request,config,env,api,root,manifest,at,qualified=None):
    """Isolated trusted release job. No install, lock parsing or candidate code."""
    from release_manifest import validate
    validate(manifest)
    require(manifest['git_sha']==context['merged_sha'] and manifest['service']=='blog' and
            manifest['source_repository']=='https://github.com/'+R.REPO and manifest['build']['id']==str(context['release_run_id']) and
            manifest['build']['attempt']==int(env['GITHUB_RUN_ATTEMPT']) and manifest['deployment']['status']=='built','REGISTRY_MANIFEST_IDENTITY')
    if qualified is None:
        ci=A.review_ci(context['head_sha'],api,at)
        require(int(ci['run_id'])==context['evidence_run_id'],'CI_RUN_CHANGED')
        proof,binding,_=source_proof(request,config,api,root,ci,at)
    else:proof,binding=qualified
    require(proof['classification']['delta_sha256']==context['delta_sha256'],'CUMULATIVE_DELTA_CHANGED')
    rows=A.review_registry(proof['classification'],api,at)
    registry_rows(rows,proof['classification'],at,timedelta(minutes=5))
    return {'schema_version':1,'repository':R.REPO,'run_id':context['release_run_id'],
        'run_attempt':int(env['GITHUB_RUN_ATTEMPT']),'producer_commit':context['producer_commit'],
        'source_commit':context['merged_sha'],'source_artifact':binding,'delta_sha256':context['delta_sha256'],
        'release_manifest_sha256':G.sha256(manifest),'image':manifest['image'],
        'code_sha256':config['trusted_code'],'registry':rows,'observed_at':at.isoformat()}


def source_review(event,env,api,root,local,at):
    """CI source analysis; trusted consumers authenticate its producer separately."""
    pr=event.get('pull_request',{})
    head=pr.get('head',{}).get('sha');producer=pr.get('base',{}).get('sha')
    result={'schema_version':2,'repository':R.REPO,'run_id':int(env['GITHUB_RUN_ID']),
            'run_attempt':int(env['GITHUB_RUN_ATTEMPT']),'producer_commit':head,'producer_base':producer,
            'head_sha':head,'tree_sha':None,'baseline_commit':None,'control_sha256':None,
            'baseline_receipt_sha256':None,'classification':None,'registry':[],'code_sha256':{},
            'observed_at':at.isoformat(),'status':'refused','code':'SOURCE_REVIEW_INCOMPLETE'}
    try:
        require(env.get('GITHUB_REPOSITORY')==R.REPO and env.get('GITHUB_EVENT_NAME')=='pull_request' and
                isinstance(head,str) and G.SHA.fullmatch(head) and isinstance(producer,str) and G.SHA.fullmatch(producer),'SOURCE_REVIEW_EVENT')
        G.validate_snapshot(local);require(local['commit']==head,'CI_CHECKOUT_HEAD_MISMATCH');result['tree_sha']=local['tree']
        for name in sorted(CODE):
            raw=(root/name).read_bytes();entry=local['files'].get(name,{})
            require(entry.get('mode')=='100644' and G.git_oid('blob',raw)==entry.get('oid'),'CI_SOURCE_CLOSURE_DRIFT')
            result['code_sha256'][name]=hashlib.sha256(raw).hexdigest()
        manifest=R.published_baseline(api);result.update(baseline_commit=manifest['git_sha'],baseline_receipt_sha256=G.sha256(manifest))
        producer_snapshot=R.snapshot(api,producer,control=True)
        raw=producer_snapshot['contents'][G.CONTROL];config=G.decode(raw);result['control_sha256']=hashlib.sha256(raw.encode()).hexdigest()
        request={'source_pr':{'number':pr['number'],'base_sha':producer,'head_sha':head,'tree_sha':local['tree']},
                 'baseline':{'git_sha':manifest['git_sha']},'control_sha256':result['control_sha256']}
        R.source_pr(api,request,config)
        require(api.github(PREFIX+'/git/ref/heads/main').get('object',{}).get('sha')==producer,'SOURCE_REVIEW_BASE_DRIFT')
        delta,_=source(request,config,api)
        registry=A.review_registry(delta,api,at)
        result.update(status='passed',code=None,classification=delta,registry=registry)
    except Exception as error:
        message=str(error);result['code']=message if re.fullmatch(r'[A-Z][A-Z0-9_]{2,80}',message) else 'SOURCE_REVIEW_UNKNOWN'
    return result


def save_source(path,value):
    if len(G.canonical(value))>128*1024:
        value={**value,'status':'refused','code':'SOURCE_PROOF_SIZE','classification':None}
    require(len(G.canonical(value))+1<=128*1024,'SOURCE_PROOF_SIZE')
    write(path,value);return value


def write(path,value):
    path.write_bytes(G.canonical(value)+b'\n')


def output(**values):
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as stream:
            for key,value in values.items():
                value=str(value);require('\n' not in value and '\r' not in value,'OUTPUT_VALUE');stream.write(key+'='+value+'\n')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['validate','prepare','merge','preflight','source-review','registry-refresh'])
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);parser.add_argument('--request',type=Path);parser.add_argument('--output',type=Path,default=Path('source-qualification.json'))
    parser.add_argument('--candidate-root',type=Path);parser.add_argument('--manifest',type=Path,default=Path('release.json'))
    parser.add_argument('--prepared',type=Path,default=Path('maintenance-prepared.json'));parser.add_argument('--journal',type=Path,default=Path('maintenance-outcome.json'))
    parser.add_argument('--context',type=Path,default=Path('maintenance-context.json'));args=parser.parse_args()
    if args.command=='source-review':
        api=API(os.environ.get('GH_TOKEN'));event=G.decode(Path(os.environ['GITHUB_EVENT_PATH']).read_text());head=event.get('pull_request',{}).get('head',{}).get('sha')
        require(isinstance(head,str) and G.SHA.fullmatch(head),'SOURCE_REVIEW_EVENT')
        candidate=args.candidate_root or args.root
        require(G.git('rev-parse','HEAD',cwd=candidate).decode().strip()==head,'CI_CHECKOUT_HEAD_MISMATCH')
        result=source_review(event,dict(os.environ),api,args.root,G.collect(head,cwd=candidate),now())
        result=save_source(args.output,result);print(json.dumps({'status':result['status'],'code':result['code']}));return
    require(args.request is not None,'REQUEST_REQUIRED')
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
    value=G.decode(args.context.read_text());qualified=preflight(value,request,config,event,env,api,args.root,now(),with_proof=args.command=='registry-refresh')
    require(env.get('SOURCE_SHA')==value['merged_sha'],'RELEASE_SOURCE_CHANGED')
    expected=G.version(request['base_manifest']['release_version']);expected='.'.join(map(str,(expected[0],expected[1],expected[2]+1)))
    require(env.get('RELEASE_VERSION')==expected,'RELEASE_VERSION_CHANGED')
    if args.command=='registry-refresh':
        result=refresh_registry(value,request,config,env,api,args.root,G.decode(args.manifest.read_text()),now(),qualified)
        final=now();identity(request,config,event,env,args.root,final)
        for row in result['registry']:A.fresh(row['checked_at'],final,timedelta(minutes=5))
        write(args.output,result)

if __name__=='__main__':
    try:main()
    except Exception as error:
        message=str(error);message=message if re.fullmatch(r'[A-Z][A-Z0-9_]{2,80}',message) else 'MAINTENANCE_EXECUTION_REFUSED'
        print(message,file=sys.stderr);sys.exit(1)
