"""Pure synthetic graphs, fake fixed-origin APIs and disposable Git repositories."""
import base64
import copy
from datetime import datetime,timedelta,timezone
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/name);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
A=load('maintenance-yarn-admission.py');G=A.gate
NOW=datetime(2026,9,21,12,tzinfo=timezone.utc)
SRI='sha512-'+base64.b64encode(b'x'*64).decode()
B='1'*40;H='2'*40

def item(name,ver,deps=None):
    result={'version':ver,'resolved':f'https://registry.npmjs.org/{name}/-/{name.split("/")[-1]}-{ver}.tgz','integrity':SRI}
    if deps:result['dependencies']=deps
    return result

def lock_text(entries):
    lines=['# yarn lockfile v1','']
    for selector,value in entries.items():
        lines.append(json.dumps(selector)+':')
        for key,v in value.items():
            if isinstance(v,dict):
                lines.append('  '+key+':');lines.extend('    '+json.dumps(k)+' '+json.dumps(x) for k,x in v.items())
            else:lines.append('  '+key+' '+json.dumps(v))
        lines.append('')
    return '\n'.join(lines)

def snapshot(package,entries,commit,extra=None):
    contents={'package.json':json.dumps(package),'yarn.lock':lock_text(entries)}
    files={k:{'mode':'100644','oid':G.git_oid('blob',v.encode())} for k,v in {**contents,'app.ts':'unchanged',**(extra or {})}.items()}
    return {'schema_version':1,'commit':commit,'tree':G.tree_oid(files),'files':files,'contents':contents}

def fixtures():
    p={'name':'blog','version':'0.1.0','scripts':{'build':'next build'},'engines':{'node':'>=18'},'dependencies':{'express':'^5.0.0'},'devDependencies':{},'resolutions':{}}
    old={'express@^5.0.0':item('express','5.0.1',{'qs':'^6.14.0'}),'qs@^6.14.0':item('qs','6.15.2',{'side-channel':'^1.1.0'}),'side-channel@^1.1.0':item('side-channel','1.1.0')}
    new=copy.deepcopy(old);new['qs@^6.14.0']=item('qs','6.16.0',{'side-channel':'^1.1.1'});new['side-channel@^1.1.1']=item('side-channel','1.1.1')
    return p,old,new

class SourceTests(unittest.TestCase):
    def classify(self,p=None,old=None,new=None,extra=None):
        default,a,b=fixtures();return G.classify(snapshot(default,old or a,B),snapshot(p or default,new or b,H,extra),B)
    def test_transitive_qs_minor_and_side_channel_patch_are_classified(self):
        result=self.classify();self.assertEqual([(x['name'],x['kind']) for x in result['changes']],[('qs','minor'),('side-channel','patch')]);self.assertFalse(result['deployment_authorized'])
    def test_direct_patch_is_classified(self):
        p,old,new=fixtures();p['dependencies']['express']='^5.0.2';new['express@^5.0.2']=item('express','5.0.2',{'qs':'^6.14.0'});self.assertEqual(len(self.classify(p=p,new=new)['changes']),3)
    def test_global_resolution_patch_is_bound_to_lock(self):
        p,old,new=fixtures();p['resolutions']['qs']='6.16.0';new['qs@6.16.0']=new['qs@^6.14.0'];self.classify(p=p,new=new)
        new['qs@6.14.0']=item('qs','6.14.0')
        with self.assertRaisesRegex(G.Refusal,'RESOLUTION_LOCK_DRIFT'):self.classify(p=p,new=new)
        del new['qs@6.14.0']
        new['qs@6.16.0']=item('qs','6.15.2')
        with self.assertRaisesRegex(G.Refusal,'RESOLUTION_LOCK_DRIFT'):self.classify(p=p,new=new)
    def test_transitive_major_and_downgrade_refused(self):
        for ver in ('7.0.0','6.14.0'):
            _,_,new=fixtures();new['qs@^6.14.0']=item('qs',ver)
            with self.subTest(ver=ver),self.assertRaises(G.Refusal):self.classify(new=new)
    def test_zero_minor_breaking_change_refused(self):
        p,old,new=fixtures();old['side-channel@^1.1.0']=item('side-channel','0.1.0');new['side-channel@^1.1.0']=old['side-channel@^1.1.0'];new['side-channel@^1.1.1']=item('side-channel','0.2.0')
        with self.assertRaises(G.Refusal):self.classify(old=old,new=new)
    def test_feature_scripts_engines_exports_and_version_only_refused(self):
        for field,value in [('scripts',{'build':'curl unsafe'}),('engines',{'node':'>=30'}),('exports','./other.js'),('version','0.1.1')]:
            p,_,_=fixtures();p[field]=value
            with self.subTest(field=field),self.assertRaisesRegex(G.Refusal,'PACKAGE_BEHAVIOR_CHANGED'):self.classify(p=p)
        for path in ('app.ts','Dockerfile','.github/workflows/ci.yml'):
            with self.subTest(path=path),self.assertRaisesRegex(G.Refusal,'NONDEPENDENCY'):self.classify(extra={path:'new feature'})
    def test_integrity_drift_same_version_and_registry_redirect_refused(self):
        for field,value in [('integrity','sha512-'+base64.b64encode(b'y'*64).decode()),('resolved','https://registry.yarnpkg.com/express/-/express-5.0.1.tgz')]:
            _,_,new=fixtures();new['express@^5.0.0'][field]=value
            with self.assertRaisesRegex(G.Refusal,'SAME_VERSION'):self.classify(new=new)
        _,_,new=fixtures();new['qs@^6.14.0']['resolved']='https://evil.invalid/qs/-/qs-6.16.0.tgz'
        with self.assertRaisesRegex(G.Refusal,'ORIGIN'):self.classify(new=new)
    def test_unknown_fields_aliases_missing_edges_and_duplicate_selector_refused(self):
        for mutate in (lambda x:x['qs@^6.14.0'].update(link=True),lambda x:x.pop('side-channel@^1.1.1')):
            _,_,new=fixtures();mutate(new)
            with self.assertRaises(G.Refusal):self.classify(new=new)
        with self.assertRaises(G.Refusal):G.parse_yarn('# yarn lockfile v1\nqs@npm:evil@1.0.0:\n')
        _,old,_=fixtures();raw=lock_text(old)
        with self.assertRaises(G.Refusal):G.parse_yarn(raw+'\n"qs@^6.14.0":\n')
    def test_snapshot_tampering_and_production_baseline_mismatch(self):
        p,a,b=fixtures();before=snapshot(p,a,B);after=snapshot(p,b,H)
        for field,value in [('tree','0'*40),('commit','bad')]:
            bad=copy.deepcopy(after);bad[field]=value
            with self.assertRaises(G.Refusal):G.classify(before,bad,B)
        after['contents']['package.json']='{}'
        with self.assertRaisesRegex(G.Refusal,'BLOB'):G.classify(before,after,B)
        with self.assertRaisesRegex(G.Refusal,'BASELINE'):G.classify(before,snapshot(p,b,H),'3'*40)
    def test_existing_version_edge_downgrade_cannot_hide_beside_qs_update(self):
        p,old,new=fixtures();old['side-channel@^1.1.0']=item('side-channel','1.1.1');old['side-channel@1.0.0']=item('side-channel','1.0.0')
        new.update({'side-channel@1.0.0':old['side-channel@1.0.0'],'side-channel@^1.1.0':item('side-channel','1.0.0')})
        with self.assertRaises(G.Refusal):self.classify(old=old,new=new)
    def test_git_collector_reads_commit_not_dirty_worktree(self):
        p,a,b=fixtures()
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            def git(*args):return subprocess.check_output(['git',*args],cwd=root,stderr=subprocess.DEVNULL,text=True).strip()
            git('init');git('config','user.name','Synthetic');git('config','user.email','fixture@example.invalid')
            for entries in (a,b):
                (root/'package.json').write_text(json.dumps(p));(root/'yarn.lock').write_text(lock_text(entries));git('add','.');git('commit','-m','synthetic')
                if entries is a:base=git('rev-parse','HEAD')
            head=git('rev-parse','HEAD');(root/'package.json').write_text('malicious dirty contents')
            self.assertFalse(G.classify(G.collect(base,folder),G.collect(head,folder),base)['deployment_authorized'])

class FakeCollector:
    def __init__(self,delta):
        self.delta=delta;self.mutate=lambda d:d;self.advisory=[];self.ci_mutate=lambda d:d
    def registry(self,name):
        c=next(c for c in self.delta['changes'] if c['name']==name)
        old={'name':name,'version':c['before'],'scripts':{},'dist':{'integrity':c['before_integrity']}}
        new={**old,'version':c['after'],'dist':{'integrity':c['integrity']},'dependencies':c['dependencies'],'optionalDependencies':c['optionalDependencies']}
        return self.mutate({'name':name,'versions':{c['before']:old,c['after']:new},'time':{c['after']:(NOW-timedelta(days=30)).isoformat()}})
    def advisories(self,*args):return self.advisory
    def github(self,path):
        if path.endswith('/ci.yml'):return {'state':'active','path':'.github/workflows/ci.yml'}
        if '/runs?' in path:
            return self.ci_mutate({'total_count':1,'workflow_runs':[{'id':100,'head_sha':H,'repository':{'full_name':A.REPO},'path':'.github/workflows/ci.yml','event':'pull_request','status':'completed','conclusion':'success','updated_at':NOW.isoformat(),'run_attempt':1}]})
        return {'total_count':3,'jobs':[{'name':n,'run_id':100,'status':'completed','conclusion':'success'} for n in A.CI_JOBS]}

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        p,a,b=fixtures();self.delta=G.classify(snapshot(p,a,B),snapshot(p,b,H),B);self.api=FakeCollector(self.delta)
    def test_official_registry_age_identity_and_exact_ci_pass(self):
        self.assertEqual(len(A.review_registry(self.delta,self.api,NOW)),2);self.assertEqual(A.review_ci(H,self.api,NOW)['run_id'],'100')
    def test_immature_registry_behavior_graph_integrity_and_advisory_refuse(self):
        def update(data,kind):
            c=next(c for c in self.delta['changes'] if c['name']==data['name']);new=data['versions'][c['after']]
            if kind=='age':data['time'][c['after']]=(NOW-timedelta(days=1)).isoformat()
            if kind=='scripts':new['scripts']={'postinstall':'unsafe'}
            if kind=='graph':new['dependencies']={'evil':'^1.0.0'}
            if kind=='integrity':new['dist']['integrity']='sha512-invalid'
            return data
        for kind in ('age','scripts','graph','integrity'):
            self.api.mutate=lambda d:update(d,kind)
            with self.subTest(kind=kind),self.assertRaises(G.Refusal):A.review_registry(self.delta,self.api,NOW)
        self.api.mutate=lambda d:d;self.api.advisory=[{'ghsa_id':'GHSA-test'}]
        with self.assertRaisesRegex(G.Refusal,'ADVISORY'):A.review_registry(self.delta,self.api,NOW)
    def test_ci_absence_failure_drift_staleness_unknown_and_incomplete_jobs(self):
        for mutation in (lambda d:{'total_count':0,'workflow_runs':[]},lambda d:{'total_count':101,'workflow_runs':d['workflow_runs']},
                         lambda d:{**d,'workflow_runs':[{**d['workflow_runs'][0],'conclusion':'failure'}]},
                         lambda d:{**d,'workflow_runs':[{**d['workflow_runs'][0],'head_sha':B}]},
                         lambda d:{**d,'workflow_runs':[{**d['workflow_runs'][0],'updated_at':(NOW-timedelta(days=2)).isoformat()}]}):
            self.api.ci_mutate=mutation
            with self.assertRaises(G.Refusal):A.review_ci(H,self.api,NOW)
        with patch.object(self.api,'github',side_effect=OSError('unavailable')):
            with self.assertRaises(OSError):A.review_ci(H,self.api,NOW)
    def test_collector_refuses_untrusted_origin_and_has_bounded_budget(self):
        client=A.Collector('synthetic-token')
        with self.assertRaises(G.Refusal):client.get('evil.invalid','/')
        client.calls=65
        with self.assertRaises(G.Refusal):client.get('api.github.com','/advisories')
    def test_source_only_delta_is_never_an_authorization(self):
        self.assertFalse(self.delta['deployment_authorized'])
    def test_checked_in_contract_cannot_enable_execution(self):
        config=json.loads((ROOT/'.github/maintenance.json').read_text());self.assertIs(config['enabled'],False);self.assertIsNone(config['host_qualification_sha256'])
        self.assertEqual(config['actor_id'],'332011818');self.assertEqual(config['scheduler_app_id'],'5019669')


class RequestTests(unittest.TestCase):
    def setUp(self):
        m={'schema_version':1,'service':'blog','compose_project':'leodotsdev','application_kind':'first_party','app_version':'0.1.4','release_version':'0.1.4','version_scheme':'semver','source_repository':'https://github.com/'+A.REPO,'git_sha':B,'image':'ghcr.io/leodotsinc/blog@sha256:'+'a'*64,'build':{'id':'90','attempt':1,'built_at':'2026-09-20T00:00:00Z'},'deployment':{'status':'verified','deployed_at':'2026-09-20T00:01:00Z','verified_at':'2026-09-20T00:02:00Z','observed_image':'ghcr.io/leodotsinc/blog@sha256:'+'a'*64}}
        self.m=m;self.config=json.loads((ROOT/'.github/maintenance.json').read_text());self.config['policy_sha256']='f'*64
        self.request={'schema_version':1,'service':'blog','phase':'prepare','request_id':G.sha256({'app':'blog','baseline_receipt_sha256':G.sha256(m),'head_sha':H,'tree_sha':'3'*40}),'policy_sha256':'f'*64,'issued_at':NOW.isoformat(),'expires_at':(NOW+timedelta(minutes=30)).isoformat(),'window':{'start':NOW.isoformat(),'end':(NOW+timedelta(hours=2)).isoformat(),'timezone':'America/Sao_Paulo'},'source_pr':{'number':128,'base_sha':B,'head_sha':H,'tree_sha':'3'*40},'baseline':{'git_sha':B,'image':m['image'],'receipt_sha256':G.sha256(m)},'base_manifest':m}
        self.env={'GITHUB_REPOSITORY':A.REPO,'GITHUB_REF':'refs/heads/main','GITHUB_SHA':B,'GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ATTEMPT':'1','GITHUB_ACTOR_ID':'332011818','GITHUB_ACTOR':'cloudbox-maintenance-scheduler[bot]','GITHUB_TRIGGERING_ACTOR':'cloudbox-maintenance-scheduler[bot]'};self.event={'sender':{'id':332011818,'type':'Bot'}}
    def validate(self):return A.validate_request(self.request,self.config,self.event,self.env,self.m,NOW)
    def test_closed_inactive_request_never_authorizes(self):
        result=self.validate();self.assertEqual(result['status'],'inactive');self.assertFalse(result['preparation_authorized']);self.assertFalse(result['deployment_authorized'])
    def test_unknown_top_nested_fields_and_boolean_versions_refused(self):
        for target in (self.request,self.request['source_pr'],self.request['baseline'],self.request['base_manifest'],self.request['window']):
            target['approved']=True
            with self.assertRaises(ValueError):self.validate()
            del target['approved']
        self.request['schema_version']=True
        with self.assertRaises(ValueError):self.validate()
    def test_wrong_actor_repository_base_retry_or_enable_refused(self):
        for field,value in [('GITHUB_ACTOR_ID','1'),('GITHUB_REPOSITORY','other/blog'),('GITHUB_SHA',H),('GITHUB_RUN_ATTEMPT','2')]:
            original=self.env[field];self.env[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):self.validate()
            self.env[field]=original
        self.config['enabled']=True
        with self.assertRaisesRegex(ValueError,'ACTIVATION'):self.validate()
    def test_expiry_policy_forged_baseline_and_request_hash_refused(self):
        for field,value in [('expires_at',(NOW-timedelta(seconds=1)).isoformat()),('policy_sha256','e'*64),('request_id','0'*64)]:
            old=self.request[field];self.request[field]=value
            with self.assertRaises(ValueError):self.validate()
            self.request[field]=old
        with self.assertRaisesRegex(ValueError,'PROTECTED'):A.validate_request(self.request,self.config,self.event,self.env,{**self.m,'git_sha':H},NOW)
    def test_inactive_cli_emits_no_token_or_supplied_fields(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'request.json';path.write_text(json.dumps(self.request))
            result=subprocess.run(['python3',str(ROOT/'scripts/maintenance-yarn-admission.py'),'--request',str(path)],capture_output=True,text=True,env={'PATH':os.environ['PATH'],'GH_TOKEN':'synthetic-token'})
            self.assertEqual(result.returncode,0);self.assertFalse(json.loads(result.stdout)['deployment_authorized']);self.assertNotIn('synthetic-token',result.stdout+result.stderr)

class HttpBoundaryTests(unittest.TestCase):
    def test_malformed_unknown_and_stale_responses_never_leak_tokens(self):
        from email.utils import format_datetime
        class Response:
            status=200
            headers={'Date':format_datetime(datetime.now(timezone.utc))}
            data=b'{}'
            def read(self,limit):return self.data
            def __enter__(self):return self
            def __exit__(self,*args):pass
        for status,data,age in [(503,b'{}','0'),(200,b'not-json synthetic-token','0'),(200,b'{}','7200')]:
            response=Response();response.status=status;response.data=data;response.headers={**response.headers,'Age':age}
            with patch.object(A.urllib.request,'build_opener') as opener:
                opener.return_value.open.return_value=response
                with self.assertRaisesRegex(ValueError,'API_UNAVAILABLE_OR_MALFORMED') as error:A.Collector('synthetic-token').github('/advisories')
                self.assertNotIn('synthetic-token',str(error.exception))
                request=opener.return_value.open.call_args.args[0]
                self.assertEqual(request.full_url,'https://api.github.com/advisories')
                self.assertEqual(request.get_header('Authorization'),'Bearer synthetic-token')
    def test_registry_limit_and_cumulative_json_budget_are_separate_and_closed(self):
        from email.utils import format_datetime
        class Response:
            status=200;headers={'Date':format_datetime(datetime.now(timezone.utc))}
            data=b'{}'+b' '*126
            def read(self,limit):return self.data[:limit]
            def __enter__(self):return self
            def __exit__(self,*args):pass
        self.assertEqual(A.REGISTRY_LIMIT,16*1024*1024);self.assertEqual(A.JSON_BUDGET,64*1024*1024)
        response=Response()
        with patch.object(A.gate,'LIMIT',64),patch.object(A,'REGISTRY_LIMIT',256),patch.object(A,'JSON_BUDGET',256),patch.object(A.urllib.request,'build_opener') as opener:
            opener.return_value.open.return_value=response
            with self.assertRaises(ValueError):A.Collector().github('/repos/leodotsinc/blog')
            collector=A.Collector();self.assertEqual(collector.registry('hono'),{});self.assertEqual(collector.registry('hono'),{})
            with self.assertRaises(ValueError):collector.registry('hono')
            response.data=b'{}'+b' '*255
            with self.assertRaises(ValueError):A.Collector().registry('hono')
            response.data=b'{"duplicate":1,"duplicate":2}'
            with self.assertRaises(ValueError):A.Collector().registry('hono')
            response.data=b'{"value":NaN}'
            with self.assertRaises(ValueError):A.Collector().registry('hono')
    def test_registry_does_not_receive_github_authorization(self):
        from email.utils import format_datetime
        class Response:
            status=200;headers={'Date':format_datetime(datetime.now(timezone.utc))}
            def read(self,limit):return b'{}'
            def __enter__(self):return self
            def __exit__(self,*args):pass
        with patch.dict(os.environ,{'HTTP_PROXY':'http://proxy.example.invalid:8080','HTTPS_PROXY':'http://proxy.example.invalid:8080'}),patch.object(A.urllib.request,'build_opener') as opener:
            opener.return_value.open.return_value=Response();A.Collector('synthetic-token').registry('qs')
            self.assertIsNone(opener.return_value.open.call_args.args[0].get_header('Authorization'))
            self.assertIsInstance(opener.call_args.args[0],A.urllib.request.ProxyHandler)
            self.assertEqual(opener.call_args.args[0].proxies,{})

if __name__=='__main__':unittest.main()
