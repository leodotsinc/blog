"""Disposable A/B/H/M and fake HTTP tests; no deployment or enablement occurs."""
import copy
from datetime import timedelta
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import test_release_yarn_admission as F
import test_release_yarn_receiver as O
import image_receipt as I

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('execution',ROOT/'scripts/maintenance-execution.py');E=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(E)
G=E.G;A='a'*40;B=F.B;H=F.H;M='d'*40;NOW=O.NOW


def snap(package,lock,commit,extra):
    result=F.snapshot(package,lock,commit,extra)
    if G.CONTROL in extra:result['contents'][G.CONTROL]=extra[G.CONTROL]
    return result


class API(O.API):
    def __init__(self,base,producer,head,manifest,config,extras):
        super().__init__(producer,head,manifest,config)
        self.base=base;self.producer=producer;self.head=head;self.main=B;self.mutations=[]
        for s in (base,producer,head):
            for name,raw in s['contents'].items():self.rows[s['files'][name]['oid']]=raw.encode()
        for name,raw in extras.items():self.rows[producer['files'][name]['oid']]=raw.encode()
    def github(self,path):
        if '/actions/runs/100/artifacts?' in path:return self.rewrite(path,{'total_count':len(self.artifacts),'artifacts':copy.deepcopy(self.artifacts)})
        if '/git/ref/tags/' in path:return {'object':{'type':'commit','sha':A}}
        if path.endswith('/git/ref/heads/main'):return self.rewrite(path,{'object':{'type':'commit','sha':self.main}})
        if path.endswith('/git/commits/'+A):return {'sha':A,'tree':{'sha':self.base['tree']}}
        if self.base['tree'] in path and '/git/trees/' in path:
            return {'sha':self.base['tree'],'truncated':False,'tree':[{'path':p,'type':'blob','mode':v['mode'],'sha':v['oid']} for p,v in self.base['files'].items()]}
        if path.endswith('/compare/'+A+'...'+B):return {'status':'ahead','merge_base_commit':{'sha':A},'total_commits':1}
        if path.endswith('/commits/'+M):return self.rewrite(path,{'sha':M,'parents':[{'sha':B},{'sha':H}],'commit':{'tree':{'sha':self.head['tree']}}})
        return super().github(path)
    def merge_once(self,number,head):
        self.mutations.append((number,head));self.main=M
        return {'merged':True,'sha':M}


class Execution(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        initial=F.RequestTests();initial.setUp();self.request=initial.request;self.config=initial.config;self.event=initial.event;self.env=initial.env
        self.env.update(GITHUB_WORKFLOW_REF=E.CALLER,GITHUB_WORKFLOW_SHA=B,GITHUB_RUN_ID='200')
        self.request['base_manifest']['git_sha']=A;self.request['baseline']['git_sha']=A
        self.request['baseline']['receipt_sha256']=G.sha256(self.request['base_manifest'])
        self.config.update(enabled=True,host_qualification_sha256='e'*64)
        extras={name:'trusted '+name for name in E.CODE}
        self.config['trusted_code']={name:hashlib.sha256(raw.encode()).hexdigest() for name,raw in extras.items()}
        old=dict(self.config,enabled=False,host_qualification_sha256=None)
        raw=G.canonical(self.config).decode();extras[G.CONTROL]=raw
        p,oldlock,newlock=F.fixtures()
        self.base=snap(p,oldlock,A,{**extras,G.CONTROL:G.canonical(old).decode()})
        self.producer=snap(p,oldlock,B,extras);self.head=snap(p,newlock,H,extras)
        self.request.update(control_sha256=hashlib.sha256(raw.encode()).hexdigest(),issued_at=NOW.isoformat(),expires_at=(NOW+timedelta(minutes=30)).isoformat(),
                            window={'start':NOW.replace(minute=0).isoformat(),'end':NOW.replace(hour=15,minute=0).isoformat(),'timezone':'America/Sao_Paulo'})
        self.request['source_pr']['tree_sha']=self.head['tree']
        self.request['request_id']=G.sha256({'app':'blog','baseline_receipt_sha256':self.request['baseline']['receipt_sha256'],'head_sha':H,'tree_sha':self.head['tree']})
        for name,raw in extras.items():path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(raw)
        self.api=API(self.base,self.producer,self.head,self.request['base_manifest'],self.config,extras)
        self.source_event={'pull_request':{'number':128,'head':{'sha':H},'base':{'sha':B}}}
        self.source_env={**self.env,'GITHUB_EVENT_NAME':'pull_request','GITHUB_RUN_ID':'100'}
        self.source=E.source_review(self.source_event,self.source_env,self.api,self.root,self.head,NOW)
        self.assertEqual(self.source['status'],'passed');self.install_proof(self.source);self.api.calls=[]
    def install_proof(self,value):
        raw=O.packed({'source-qualification.json':value});self.api.binary_values[4]=raw
        self.api.artifacts=[a for a in self.api.artifacts if a['id']!=4]+[{'id':4,'name':'blog-source-qualification-100-1',
            'expired':False,'size_in_bytes':len(raw),'digest':'sha256:'+hashlib.sha256(raw).hexdigest(),
            'workflow_run':{'id':100,'head_sha':H,'repository_id':1021194725,'head_repository_id':1021194725}}]

    def tearDown(self):self.temp.cleanup()
    def prepare(self):return E.prepare(self.request,self.config,self.event,self.env,self.api,self.root,I.read_artifact,clock=lambda:NOW)
    def test_full_prepare_merge_preflight_keeps_real_identities(self):
        proof=self.prepare();self.assertFalse(proof['deployment_authorized']);self.assertEqual(proof['delta']['baseline_commit'],A)
        self.assertEqual(proof['delta']['candidate_commit'],H);self.assertEqual(proof['delta']['control']['producer_commit'],B)
        journal={'status':'request_reserved','request_id':self.request['request_id']};states=[]
        merged=E.merge(proof,self.request,self.config,self.event,self.env,self.api,self.root,journal,clock=lambda:NOW,persist=lambda j:states.append(j['status']))
        self.assertEqual(merged,M);self.assertEqual(self.api.mutations,[(128,H)])
        self.assertEqual(states,['merge_pending_reconciliation','merged_pending_build'])
        context=E.context(self.request,proof,merged,'200');self.assertEqual(context['evidence_run_id'],100);self.assertEqual(context['release_run_id'],200)
        self.assertEqual(set(context),E.CONTEXT_KEYS)
        result=E.preflight(context,self.request,self.config,self.event,self.env,self.api,self.root,NOW,clock=lambda:NOW)
        self.assertEqual(result['delta_sha256'],proof['delta']['delta_sha256'])
    def test_nominal_prepare_and_preflight_do_not_classify_parse_yarn_or_query_registry(self):
        with patch.object(G,'classify',side_effect=AssertionError('must stay in CI')), \
             patch.object(G,'parse_yarn',side_effect=AssertionError('no runtime Yarn parser')), \
             patch.object(self.api,'registry',side_effect=AssertionError('release refresh only')):
            proof=self.prepare();context=E.context(self.request,proof,M,'200');self.api.main=M
            E.preflight(context,self.request,self.config,self.event,self.env,self.api,self.root,NOW,clock=lambda:NOW)
    def test_proof_missing_code_hash_source_drift_unknown_and_staleness_refuse_before_merge(self):
        original=copy.deepcopy(self.source)
        for key,bad in [('schema_version',1),('code_sha256',{}),('producer_base',H),('head_sha',B),('classification',{}),
                        ('registry',[]),('observed_at',(NOW-timedelta(hours=25)).isoformat()),('status','refused')]:
            value={**copy.deepcopy(original),key:bad};self.install_proof(value)
            with self.subTest(key=key),self.assertRaises((ValueError,KeyError)):self.prepare()
            self.assertEqual(self.api.mutations,[])
        self.api.artifacts=[a for a in self.api.artifacts if a['id']!=4]
        with self.assertRaisesRegex(ValueError,'SOURCE_ARTIFACT_MISSING'):self.prepare()
    def test_release_refresh_binds_source_archive_manifest_and_rows_without_reclassification(self):
        proof=self.prepare();context=E.context(self.request,proof,M,'200');self.api.main=M
        manifest=copy.deepcopy(self.request['base_manifest']);manifest.update(git_sha=M,release_version='0.1.5',app_version='0.1.5')
        manifest['build'].update(id='200',attempt=1);manifest['deployment'].update(status='built',deployed_at=None,verified_at=None,observed_image=None)
        with patch.object(G,'classify',side_effect=AssertionError('CI only')),patch.object(G,'parse_yarn',side_effect=AssertionError('CI only')):
            value=E.refresh_registry(context,self.request,self.config,self.env,self.api,self.root,manifest,NOW)
        self.assertEqual(value['release_manifest_sha256'],G.sha256(manifest));self.assertEqual(value['source_commit'],M)
        self.assertEqual(value['source_artifact']['digest'],self.api.artifacts[-1]['digest'])
        for rows in ([],[{**r,'affecting_advisories':[{'id':'fake'}]} for r in value['registry']],
                     [{**r,'checked_at':(NOW-timedelta(minutes=5,seconds=1)).isoformat()} for r in value['registry']]):
            with self.assertRaises(ValueError):E.registry_rows(rows,proof['delta'],NOW,timedelta(minutes=5))
    def test_source_artifact_preserves_cumulative_identity_and_explicit_refusal(self):
        env={**self.env,'GITHUB_EVENT_NAME':'pull_request','GITHUB_RUN_ID':'100'}
        event={'pull_request':{'number':128,'head':{'sha':H},'base':{'sha':B}}}
        result=E.source_review(event,env,self.api,self.root,self.head,NOW)
        self.assertEqual(result['status'],'passed');self.assertEqual(result['baseline_commit'],A);self.assertEqual(result['producer_base'],B)
        self.assertEqual(result['producer_commit'],H);self.assertEqual(len(result['code_sha256']),13)
        self.assertEqual(result['classification']['control']['sha256'],self.request['control_sha256'])
        refreshed=E.source_review(event,{**env,'GITHUB_RUN_ATTEMPT':'2'},self.api,self.root,self.head,NOW)
        self.assertEqual(refreshed['status'],'passed');self.assertEqual(refreshed['run_attempt'],2);self.assertEqual(refreshed['head_sha'],H)
        self.api.main=M;denied=E.source_review(event,env,self.api,self.root,self.head,NOW)
        self.assertEqual(denied['status'],'refused');self.assertIsNone(denied['classification']);self.assertEqual(denied['code'],'SOURCE_REVIEW_BASE_DRIFT')
        self.assertEqual(self.api.mutations,[])
    def test_source_proof_size_is_bounded_and_never_truncates_to_positive(self):
        output=self.root/'source-qualification.json'
        value={'status':'passed','code':None,'classification':{'oversize':'x'*(128*1024)}}
        result=E.save_source(output,value)
        self.assertEqual(result['status'],'refused');self.assertEqual(result['code'],'SOURCE_PROOF_SIZE');self.assertIsNone(result['classification'])
        self.assertLessEqual(output.stat().st_size,128*1024)
    def test_disabled_or_unqualified_config_refuses_before_network(self):
        for key,value in [('enabled',False),('host_qualification_sha256',None),('scheduler_app_id','1')]:
            original=self.config[key];self.config[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):self.prepare()
            self.assertEqual(self.api.calls,[]);self.assertEqual(self.api.mutations,[]);self.config[key]=original
    def test_untrusted_caller_retry_and_actor_refuse(self):
        for key,value in [('GITHUB_WORKFLOW_REF','other'),('GITHUB_WORKFLOW_SHA',H),('GITHUB_ACTOR_ID','1'),('GITHUB_RUN_ATTEMPT','2')]:
            old=self.env[key];self.env[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):self.prepare()
            self.assertEqual(self.api.mutations,[]);self.env[key]=old
    def test_control_pin_candidate_control_and_code_changes_refuse(self):
        def classify(base=self.base,producer=self.producer,head=self.head,pin=None):
            return G.classify(base,head,A,producer=producer,control_sha256=pin or self.request['control_sha256'])
        with self.assertRaises(ValueError):classify(pin='0'*64)
        with self.assertRaises(ValueError):G.classify(self.base,self.head,A)
        for name in (G.CONTROL,'scripts/maintenance-execution.py','src/feature.ts'):
            changed=copy.deepcopy(self.head);raw='{}' if name==G.CONTROL else 'feature'
            changed['files'][name]={'mode':'100644','oid':G.git_oid('blob',raw.encode())}
            if name==G.CONTROL:changed['contents'][name]=raw
            changed['tree']=G.tree_oid(changed['files'])
            with self.subTest(name=name),self.assertRaises(ValueError):classify(head=changed)
        changed=copy.deepcopy(self.producer);changed['files']['src/feature.ts']={'mode':'100644','oid':G.git_oid('blob',b'feature')};changed['tree']=G.tree_oid(changed['files'])
        with self.assertRaisesRegex(ValueError,'PRODUCER_HAS_RUNTIME'):classify(producer=changed)
    def test_config_control_hash_is_raw_not_canonicalized(self):
        raw=(self.root/G.CONTROL).read_bytes();(self.root/G.CONTROL).write_bytes(raw+b'\n')
        with self.assertRaisesRegex(ValueError,'ROOT_APPROVED_CONTROL_DRIFT'):self.prepare()
    def test_failures_before_merge_do_not_mutate(self):
        proof=self.prepare()
        for kind in ('expired','ci_expired','missing_reservation','drift','clock_boundary'):
            journal={'status':'request_reserved','request_id':self.request['request_id']};data=copy.deepcopy(proof);clock=lambda:NOW
            if kind=='expired':clock=lambda:NOW+timedelta(hours=1)
            if kind=='ci_expired':data['ci']['updated_at']=(NOW-timedelta(hours=24,seconds=1)).isoformat()
            if kind=='missing_reservation':journal['status']='unknown'
            if kind=='drift':self.api.main=H
            if kind=='clock_boundary':clock=lambda:NOW+timedelta(minutes=30,seconds=-5)
            with self.subTest(kind=kind),self.assertRaises(ValueError):E.merge(data,self.request,self.config,self.event,self.env,self.api,self.root,journal,clock=clock)
            self.assertEqual(self.api.mutations,[]);self.api.main=B
    def test_timeout_after_mutation_never_retries_and_keeps_barrier(self):
        proof=self.prepare();journal={'status':'request_reserved','request_id':self.request['request_id']};states=[]
        def ambiguous(*args):self.api.mutations.append(args);self.api.main=M;raise TimeoutError('synthetic secret must not escape')
        self.api.merge_once=ambiguous
        with self.assertRaisesRegex(ValueError,'MERGE_RESULT_UNKNOWN_RECONCILE'):E.merge(proof,self.request,self.config,self.event,self.env,self.api,self.root,journal,clock=lambda:NOW,persist=lambda j:states.append(j['status']))
        self.assertEqual(len(self.api.mutations),1);self.assertEqual(states,['merge_pending_reconciliation','merge_unknown_requires_reconciliation'])
    def test_wrong_merge_tree_and_post_merge_expiry_do_not_build(self):
        for kind in ('tree','expiry'):
            self.api.main=B;self.api.mutations=[];proof=self.prepare();journal={'status':'request_reserved','request_id':self.request['request_id']}
            if kind=='tree':self.api.rewrite=lambda path,v:dict(v,commit={'tree':{'sha':'f'*40}}) if '/commits/'+M in path else v
            clocks=iter([NOW,NOW,NOW+timedelta(hours=1)]) if kind=='expiry' else None
            with self.subTest(kind=kind),self.assertRaises(ValueError):E.merge(proof,self.request,self.config,self.event,self.env,self.api,self.root,journal,clock=(lambda:next(clocks)) if clocks else lambda:NOW)
            self.assertEqual(len(self.api.mutations),1);self.assertEqual(journal['status'],'merged_pending_build' if kind=='expiry' else 'merge_unknown_requires_reconciliation')
            self.api.rewrite=lambda path,v:v
    def test_executor_interruption_keeps_pre_mutation_barrier(self):
        proof=self.prepare();journal={'status':'request_reserved','request_id':self.request['request_id']};saved=[]
        def interrupted(*args):self.api.mutations.append(args);raise KeyboardInterrupt()
        self.api.merge_once=interrupted
        with self.assertRaises(KeyboardInterrupt):E.merge(proof,self.request,self.config,self.event,self.env,self.api,self.root,journal,clock=lambda:NOW,persist=lambda j:saved.append(copy.deepcopy(j)))
        self.assertEqual(len(self.api.mutations),1);self.assertEqual(saved[-1]['status'],'merge_pending_reconciliation')
    def test_evidence_expiring_during_last_network_read_refuses_merge(self):
        proof=self.prepare();proof['ci']['updated_at']=(NOW-timedelta(hours=24)+timedelta(seconds=1)).isoformat()
        journal={'status':'request_reserved','request_id':self.request['request_id']};ticks=iter([NOW,NOW+timedelta(seconds=2)])
        with self.assertRaisesRegex(ValueError,'STALE_OR_FUTURE'):E.merge(proof,self.request,self.config,self.event,self.env,self.api,self.root,journal,clock=lambda:next(ticks))
        self.assertEqual(self.api.mutations,[])
    def test_context_tampering_refuses_before_release(self):
        proof=self.prepare();context=E.context(self.request,proof,M,'200');self.api.main=M
        for field,value in [('control_sha256','0'*64),('producer_commit',H),('evidence_run_id',200),('release_run_id',100),('merged_sha',H),('delta_sha256','0'*64)]:
            bad={**context,field:value}
            with self.subTest(field=field),self.assertRaises(ValueError):E.preflight(bad,self.request,self.config,self.event,self.env,self.api,self.root,NOW,clock=lambda:NOW)


class HttpMutation(unittest.TestCase):
    def test_one_fixed_origin_put_has_expected_head_and_no_redirect_proxy(self):
        import urllib.request
        observed=[]
        class Response:
            status=200
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,limit):return b'{"merged":true,"sha":"dddddddddddddddddddddddddddddddddddddddd"}'
        class Opener:
            def open(self,request,timeout):
                observed.append(request);self.timeout=timeout;return Response()
        def opener(*handlers):
            self.assertEqual(handlers[0].proxies,{});self.assertIsInstance(handlers[1],E.A.NoRedirect);return Opener()
        with patch.dict(os.environ,{'HTTP_PROXY':'https://invalid.local','HTTPS_PROXY':'https://invalid.local'}),patch.object(urllib.request,'build_opener',side_effect=opener):
            result=E.API('synthetic-token').merge_once(128,H)
        self.assertEqual(result['sha'],M);self.assertEqual(len(observed),1);request=observed[0]
        self.assertEqual(request.full_url,'https://api.github.com/repos/leodotsinc/blog/pulls/128/merge');self.assertEqual(request.get_method(),'PUT')
        self.assertEqual(json.loads(request.data),{'sha':H,'merge_method':'merge'})
        self.assertNotIn('synthetic-token',request.full_url);self.assertNotIn(b'synthetic-token',request.data)
    def test_timeout_malformed_and_http_unknown_never_retry_or_expose_token(self):
        import urllib.request
        for error in (TimeoutError('synthetic-token'),ValueError('synthetic-token')):
            handle=unittest.mock.Mock();handle.open.side_effect=error
            with patch.object(urllib.request,'build_opener',return_value=handle):
                with self.assertRaisesRegex(ValueError,'MERGE_RESULT_UNKNOWN_RECONCILE') as raised:E.API('synthetic-token').merge_once(128,H)
            self.assertEqual(handle.open.call_count,1);self.assertNotIn('synthetic-token',str(raised.exception))


class WorkflowSafety(unittest.TestCase):
    def test_single_global_owner_trusted_child_and_ordered_barrier(self):
        caller=(ROOT/'.github/workflows/maintenance.yml').read_text();callee=(ROOT/'.github/workflows/deploy.yml').read_text()
        self.assertIn('group: blog-production-release',caller)
        self.assertIn("github.workflow_ref == '"+E.CALLER+"' && format('blog-maintenance-child-{0}', github.run_id) || 'blog-production-release'",callee)
        self.assertIn('uses: ./.github/workflows/deploy.yml',caller)
        self.assertLess(caller.index('maintenance-execution.py validate'),caller.index('maintenance-execution.py prepare'))
        self.assertLess(caller.index('Reserve request before'),caller.index('maintenance-execution.py merge'))
        self.assertIn('needs: prepare',caller);self.assertNotIn('prepare_only:',caller)
        ci=(ROOT/'.github/workflows/ci.yml').read_text();self.assertIn('retention-days: 45',ci);self.assertIn('retention-days: 7',ci)
        self.assertIn("if: inputs.maintenance_context == ''",callee);self.assertIn('python3 scripts/maintenance-guard.py',callee)
        self.assertIn('python3 ../trusted/scripts/maintenance-execution.py preflight',callee)
        self.assertIn('maintenance_artifact:',callee);self.assertIn('75bb057aaa633335b54c38f4729f96879264e070',callee)
        self.assertLess(callee.index('Recheck window, source'),callee.index('docker push'))
        isolated=callee.split('  maintenance_metadata:')[1].split('  rollout:')[0]
        self.assertIn('needs: [gate, build]',isolated);self.assertIn('registry-refresh',isolated)
        for command in ('yarn ', 'npm ', 'docker ', 'test_release'):self.assertNotIn(command,isolated)
        source_job=ci.split('  release_contract:')[1].split('  image:')[0]
        self.assertIn('pull_request.base.sha',source_job);self.assertIn('--candidate-root candidate',source_job)
        for command in ('yarn ', 'npm ', 'unittest'):self.assertNotIn(command,source_job)
        self.assertIn("needs.maintenance_metadata.result == 'success'",callee)
    def test_repository_config_remains_disabled_and_no_new_secrets(self):
        config=json.loads((ROOT/'.github/maintenance.json').read_text());self.assertIs(config['enabled'],False);self.assertIsNone(config['host_qualification_sha256']);self.assertEqual(config['trusted_code'],{})
        result=subprocess.run(['python3','scripts/maintenance-execution.py','validate','--request','/does/not/exist'],cwd=ROOT,env={'PATH':os.environ['PATH']},capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0);self.assertEqual(result.stderr.strip(),'MAINTENANCE_EXECUTION_REFUSED')

if __name__=='__main__':unittest.main()
