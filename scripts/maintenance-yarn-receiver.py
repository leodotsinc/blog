#!/usr/bin/env python3
"""Inactive Blog observation receiver, with independently collected GitHub proof.

Trust: fixed scheduler identity -> closed request -> own-repository published
verified release asset/checksum -> immutable Git objects + exact CI/artifacts.
The host must independently recheck live production/policy/qualification before
any future mutation. This receiver has no mutation capability or enable switch.
"""
import argparse
import base64
from datetime import datetime,timezone,timedelta
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.parse
import zipfile
from zoneinfo import ZoneInfo

SPEC=importlib.util.spec_from_file_location('admission',Path(__file__).with_name('maintenance-yarn-admission.py'))
A=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(A);G=A.gate
REPO=A.REPO;PREFIX='/repos/'+REPO;require=G.require
CODE={'.github/workflows/maintenance.yml','.github/workflows/ci.yml','.github/workflows/deploy.yml',
      'scripts/maintenance-yarn-receiver.py','scripts/maintenance-yarn-admission.py','scripts/maintenance-yarn-gate.py',
      'scripts/image_receipt.py','scripts/qualify-image.py','scripts/release_manifest.py'}


class GitHub(A.Collector):
    def binary(self,path,metadata,limit):
        require(isinstance(path,str) and re.fullmatch(r'/repos/leodotsinc/blog/(?:releases/assets/[1-9][0-9]*|actions/artifacts/[1-9][0-9]*/zip)',path),'BINARY_API_PATH')
        size=metadata.get('size',metadata.get('size_in_bytes'));digest=metadata.get('digest')
        require(type(size) is int and 0<size<=limit and isinstance(digest,str) and re.fullmatch(r'sha256:[0-9a-f]{64}',digest),'BINARY_METADATA')
        self.calls+=1;require(self.calls<=65,'API_REQUEST_LIMIT')
        # gh's authenticated GitHub download follows signed asset redirects;
        # the token stays in the environment, never argv, logs or the artifact.
        env={key:os.environ[key] for key in ('PATH','HOME') if key in os.environ}
        env.update(GH_HOST='github.com',GH_TOKEN=self.token or '')
        with tempfile.TemporaryDirectory(prefix='blog-readonly-gh-') as private:
            env.update(GH_CONFIG_DIR=private+'/config',XDG_STATE_HOME=private+'/state')
            media='application/octet-stream' if '/releases/assets/' in path else 'application/vnd.github+json'
            result=subprocess.run(['gh','api',path,'-H','Accept: '+media],env=env,capture_output=True,timeout=20)
        require(result.returncode==0 and 0<len(result.stdout)<=limit and
                'sha256:'+hashlib.sha256(result.stdout).hexdigest()==digest,'BINARY_DOWNLOAD_OR_DIGEST')
        return result.stdout


def blob(api,sha):
    require(isinstance(sha,str) and G.SHA.fullmatch(sha),'BLOB_SHA')
    item=api.github(PREFIX+'/git/blobs/'+sha)
    require(item.get('sha')==sha and item.get('encoding')=='base64' and type(item.get('size')) is int and 0<=item['size']<=G.LIMIT,'BLOB_SCHEMA')
    raw=base64.b64decode(''.join(item.get('content','').split()),validate=True)
    require(len(raw)==item['size'] and G.git_oid('blob',raw)==sha,'BLOB_INTEGRITY');return raw


def snapshot(api,sha):
    require(isinstance(sha,str) and G.SHA.fullmatch(sha),'COMMIT_SHA')
    commit=api.github(PREFIX+'/git/commits/'+sha);require(commit.get('sha')==sha,'COMMIT_IDENTITY')
    tree=commit.get('tree',{}).get('sha');require(isinstance(tree,str) and G.SHA.fullmatch(tree),'TREE_SHA')
    listing=api.github(PREFIX+'/git/trees/'+tree+'?recursive=1')
    require(listing.get('sha')==tree and listing.get('truncated') is False and isinstance(listing.get('tree'),list) and len(listing['tree'])<=20000,'TREE_TRUNCATED_OR_UNKNOWN')
    files={}
    for item in listing['tree']:
        if item.get('type')=='tree':continue
        require(item.get('type')=='blob' and item.get('path') not in files,'TREE_ENTRY_OR_DUPLICATE')
        files[item['path']]={'mode':item['mode'],'oid':item['sha']}
    result={'schema_version':1,'commit':sha,'tree':tree,'files':files,
            'contents':{name:blob(api,files[name]['oid']).decode() for name in G.ALLOWED}}
    G.validate_snapshot(result);return result


def published_baseline(api):
    releases=api.github(PREFIX+'/releases?per_page=100&page=1')
    require(isinstance(releases,list) and 0<len(releases)<100,'RELEASE_LIST_UNKNOWN_OR_TRUNCATED')
    stable=[r for r in releases if r.get('draft') is False and r.get('prerelease') is False and
            isinstance(r.get('tag_name'),str) and re.fullmatch(r'v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)',r['tag_name'])]
    require(stable and len({r['tag_name'] for r in stable})==len(stable),'RELEASE_BASELINE_AMBIGUOUS')
    release=max(stable,key=lambda r:G.version(r['tag_name'][1:]))
    assets=release.get('assets');require(isinstance(assets,list),'RELEASE_ASSETS_UNKNOWN')
    matches=[x for x in assets if x.get('name')=='deployed-release.json'];require(len(matches)==1,'VERIFIED_RELEASE_ASSET_REQUIRED')
    asset=matches[0];require(type(asset.get('id')) is int and asset['id']>0,'RELEASE_ASSET_ID')
    raw=api.binary(PREFIX+'/releases/assets/'+str(asset['id']),asset,16384);manifest=G.decode(raw.decode());A.manifest_contract.validate(manifest)
    require(manifest['service']=='blog' and manifest['compose_project']=='leodotsdev' and manifest['source_repository']=='https://github.com/'+REPO and
            manifest['app_version']==manifest['release_version']==release['tag_name'][1:] and manifest['deployment']['status']=='verified','RELEASE_ASSET_IDENTITY')
    ref=api.github(PREFIX+'/git/ref/tags/'+release['tag_name']);obj=ref.get('object',{})
    for _ in range(2):
        if obj.get('type')=='commit':break
        require(obj.get('type')=='tag' and G.SHA.fullmatch(obj.get('sha','')),'RELEASE_TAG_TYPE')
        obj=api.github(PREFIX+'/git/tags/'+obj['sha']).get('object',{})
    require(obj.get('type')=='commit' and obj.get('sha')==manifest['git_sha'],'RELEASE_TAG_SOURCE')
    return manifest


def calendar(config,request,now):
    w=config['window'];A.exact(w,{'timezone','day','weekday','start_hour','end_hour','approved'},'APPROVED_CALENDAR_SCHEMA')
    require(w=={'timezone':'America/Sao_Paulo','day':1,'weekday':'first_saturday','start_hour':10,'end_hour':12,'approved':True},'APPROVED_CALENDAR_DRIFT')
    local=now.astimezone(ZoneInfo('America/Sao_Paulo'));start=local.replace(hour=10,minute=0,second=0,microsecond=0);end=start+timedelta(hours=2)
    require(local.weekday()==5 and local.day<=7 and start<=local<end and A.stamp(request['window']['start'])==start and
            A.stamp(request['window']['end'])==end and now<A.stamp(request['expires_at']),'OUTSIDE_APPROVED_WINDOW')


def code_identity(api,before,config,root):
    A.exact(config['trusted_code'],CODE,'TRUSTED_CODE_NOT_CONFIGURED')
    for path in sorted(CODE):
        entry=before['files'].get(path,{});require(entry.get('mode')=='100644','TRUSTED_CODE_FILE')
        raw=blob(api,entry['oid']);expected=config['trusted_code'][path]
        require(isinstance(expected,str) and A.HASH.fullmatch(expected) and hashlib.sha256(raw).hexdigest()==expected and
                hashlib.sha256((root/path).read_bytes()).hexdigest()==expected,'TRUSTED_CODE_DRIFT')


def source_pr(api,request,config):
    requested=request['source_pr'];pr=api.github(PREFIX+'/pulls/'+str(requested['number']))
    require(pr.get('number')==requested['number'] and pr.get('state')=='open' and pr.get('draft') is False and
            pr.get('user',{}).get('id')==int(config['renovate_actor_id']) and pr['user'].get('type')=='Bot','RENOVATE_PR_NOT_ELIGIBLE')
    for side,sha in (('base',requested['base_sha']),('head',requested['head_sha'])):
        require(pr.get(side,{}).get('sha')==sha and pr[side].get('repo',{}).get('id')==config['repository_id'] and
                pr[side]['repo'].get('full_name')==REPO,'PR_REPOSITORY_OR_SOURCE_DRIFT')
    require(pr['base'].get('ref')=='main','PR_TARGET_BRANCH')
    comparison=api.github(PREFIX+'/compare/'+requested['base_sha']+'...'+requested['head_sha'])
    require(comparison.get('status')=='ahead' and comparison.get('merge_base_commit',{}).get('sha')==requested['base_sha'] and
            type(comparison.get('total_commits')) is int and 0<comparison['total_commits']<=100,'PR_ANCESTRY_OR_LIMIT')


def artifact(api,name,run_id):
    data=api.github(PREFIX+f'/actions/runs/{run_id}/artifacts?per_page=100&page=1')
    require(type(data.get('total_count')) is int and data['total_count']<=100 and len(data.get('artifacts',[]))==data['total_count'],'ARTIFACT_LIST_TRUNCATED')
    found=[x for x in data['artifacts'] if x.get('name')==name];require(len(found)==1 and found[0].get('expired') is False,'ARTIFACT_MISSING_OR_AMBIGUOUS')
    m=found[0];require(type(m.get('id')) is int and m['id']>0,'ARTIFACT_ID')
    return m,api.binary(PREFIX+'/actions/artifacts/'+str(m['id'])+'/zip',m,65536)


def security_proof(raw,metadata,run,now,repository_id):
    require(metadata.get('digest')=='sha256:'+hashlib.sha256(raw).hexdigest(),'SECURITY_ARTIFACT_DIGEST')
    linked=metadata.get('workflow_run',{})
    require(linked.get('id')==run['id'] and linked.get('head_sha')==run['head_sha'] and
            linked.get('repository_id')==linked.get('head_repository_id')==repository_id,'SECURITY_ARTIFACT_SOURCE')
    with zipfile.ZipFile(io.BytesIO(raw)) as package:
        entries=package.infolist();require(len(entries)==2 and {x.filename for x in entries}=={'runtime/security.json','builder/security.json'} and
                all(x.file_size<=16384 and not x.flag_bits&1 for x in entries),'SECURITY_ARTIFACT_CONTENTS')
        proofs={x.filename.split('/')[0]:G.decode(package.read(x).decode()) for x in entries}
    for proof in proofs.values():
        require(type(proof.get('schema_version')) is int and proof.get('schema_version')==1 and proof.get('status')=='passed' and type(proof.get('packages')) is int and proof['packages']>0 and
                isinstance(proof.get('image'),str) and re.fullmatch(r'sha256:[0-9a-f]{64}',proof['image']),'SECURITY_PROOF_SCHEMA')
        A.fresh(proof.get('observed_at'),now);A.fresh(proof.get('database_updated_at'),now,timedelta(hours=36))
        counts=proof.get('counts',{});A.exact(counts,{'CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN'},'SECURITY_COUNTS')
        require(all(type(x) is int and x>=0 for x in counts.values()) and counts['CRITICAL']==counts['HIGH']==counts['UNKNOWN']==0,'SECURITY_FAILED')
    return proofs


def image_evidence(api,ci,config,now,reader):
    run=api.github(PREFIX+'/actions/runs/'+ci['run_id'])
    require(run.get('head_sha')==ci['source_sha'] and run.get('run_attempt')==ci['attempt'] and run.get('conclusion')=='success' and
            run.get('status')=='completed' and run.get('repository',{}).get('id')==config['repository_id'],'CI_REREAD_DRIFT')
    suffix=ci['run_id']+'-'+str(ci['attempt'])
    metadata,raw=artifact(api,'blog-review-security-'+suffix,ci['run_id']);security=security_proof(raw,metadata,run,now,config['repository_id'])
    metadata,raw=artifact(api,'blog-review-functional-'+suffix,ci['run_id'])
    expected={'image_id':security['runtime']['image'],'release':{'version':'0.1.0','revision':ci['source_sha'],'build_id':ci['run_id']},
              'producer':{'run_id':ci['run_id'],'run_attempt':ci['attempt'],'workflow':'ci.yml','job':'image'},
              'harness_sha256':{p:config['trusted_code'][p] for p in ('scripts/qualify-image.py','scripts/image_receipt.py','scripts/release_manifest.py')}}
    receipt=reader(raw,metadata,run,expected,now)
    return {'security':security,'functional':receipt}


def observe(request,config,event,env,api,root,now,reader,clock=lambda:datetime.now(timezone.utc)):
    A.envelope(request);A.exact(config,A.CONFIG_KEYS,'CONFIG_SCHEMA');require(config['enabled'] is False and config['host_qualification_sha256'] is None,'ACTIVATION_NOT_IMPLEMENTED')
    require(env.get('GITHUB_REPOSITORY')==REPO and env.get('GITHUB_REF')=='refs/heads/main' and env.get('GITHUB_SHA')==request['source_pr']['base_sha'] and
            env.get('GITHUB_EVENT_NAME')=='workflow_dispatch' and env.get('GITHUB_RUN_ATTEMPT')=='1','RECEIVER_SOURCE_OR_RETRY')
    require(env.get('GITHUB_ACTOR_ID')==config['actor_id']=='332011818' and str(event.get('sender',{}).get('id'))==config['sender_id']=='332011818' and
            event.get('sender',{}).get('type')=='Bot' and env.get('GITHUB_ACTOR')==env.get('GITHUB_TRIGGERING_ACTOR'),'SCHEDULER_ACTOR_REFUSED')
    require(isinstance(config['policy_sha256'],str) and A.HASH.fullmatch(config['policy_sha256']),'POLICY_NOT_CONFIGURED')
    calendar(config,request,now)
    baseline=published_baseline(api)
    A.validate_request(request,{k:config[k] for k in A.CONFIG_KEYS},event,env,baseline,now)
    dedup=api.github(PREFIX+'/actions/artifacts?'+urllib.parse.urlencode({'name':'blog-maintenance-observation-'+request['request_id'],'per_page':100,'page':1}))
    require(dedup.get('total_count')==0 and dedup.get('artifacts')==[],'DUPLICATE_REQUEST_OR_UNKNOWN')
    main=api.github(PREFIX+'/git/ref/heads/main');require(main.get('object',{}).get('sha')==baseline['git_sha'],'MAIN_PRODUCTION_DRIFT')
    source_pr(api,request,config)
    before=snapshot(api,baseline['git_sha']);code_identity(api,before,config,root)
    after=snapshot(api,request['source_pr']['head_sha']);require(after['tree']==request['source_pr']['tree_sha'],'PR_TREE_DRIFT')
    delta=G.classify(before,after,baseline['git_sha']);registry=A.review_registry(delta,api,now);ci=A.review_ci(after['commit'],api,now)
    images=image_evidence(api,ci,config,now,reader)
    source_pr(api,request,config)
    main=api.github(PREFIX+'/git/ref/heads/main');require(main.get('object',{}).get('sha')==baseline['git_sha'],'MAIN_CHANGED_DURING_COLLECTION')
    finished=clock();calendar(config,request,finished);require(finished<A.stamp(request['expires_at']),'REQUEST_EXPIRED_DURING_COLLECTION')
    return {'schema_version':1,'service':'blog','status':'observed_inactive','request_id':request['request_id'],
            'delta':delta,'registry':registry,'ci':ci,'review_image_evidence':images,'observed_at':finished.isoformat(),
            'preparation_authorized':False,'deployment_authorized':False,'blocker':'HOST_AND_MUTATING_RECEIVER_NOT_QUALIFIED',
            'required_next':'new immutable release image and deploy.yml/build functional receipt before final host authorization'}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--request',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
    root=Path(__file__).resolve().parents[1];request=G.decode(Path(args.request).read_text());config=G.decode((root/'.github/maintenance.json').read_text())
    A.envelope(request)
    event=G.decode(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
    # Receipt reader belongs to the qualified baseline checkout, never a PR blob.
    try:
        from image_receipt import read_artifact
    except ImportError:raise G.Refusal('FUNCTIONAL_RECEIPT_CONTRACT_UNAVAILABLE') from None
    try:result=observe(request,config,event,dict(os.environ),GitHub(os.environ.get('GH_TOKEN')),root,datetime.now(timezone.utc),read_artifact)
    except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError,zipfile.BadZipFile) as error:
        code=str(error);code=code if re.fullmatch(r'[A-Z][A-Z0-9_]{2,80}',code) else 'OBSERVATION_UNKNOWN'
        result={'schema_version':1,'service':'blog','status':'blocked','request_id':request['request_id'],'blocker':code,
                'preparation_authorized':False,'deployment_authorized':False}
    with Path(args.output).open('x') as output:json.dump(result,output,sort_keys=True);output.write('\n')
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as output:output.write('request_id='+request['request_id']+'\n')
    print(json.dumps({'status':result['status'],'deployment_authorized':False}))

if __name__=='__main__':
    try:main()
    except (ValueError,KeyError,TypeError,OSError):print('BLOG_OBSERVATION_REFUSED',file=sys.stderr);sys.exit(1)
