"""Full observation path over fake GitHub, registry and bounded artifact bytes.

The image-receipt validator is a separately tested contract; the fake reader
below checks its independently collected expectations, not production behavior.
"""
import base64
import copy
from datetime import datetime,timedelta,timezone
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

import test_release_yarn_admission as F
ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('receiver',ROOT/'scripts/maintenance-yarn-receiver.py');R=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(R)
G=R.G;NOW=datetime(2026,10,3,13,30,tzinfo=timezone.utc)

def packed(files):
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for name,body in files.items():z.writestr(name,json.dumps(body))
    return out.getvalue()

class API(F.FakeCollector):
    def __init__(self,before,after,manifest,config):
        super().__init__(G.classify(before,after,F.B));self.before=before;self.after=after;self.manifest=manifest;self.config=config;self.rewrite=lambda p,v:v
        self.calls=[];self.asset=json.dumps(manifest).encode();self.rows={}
        for snap in (before,after):
            for name,raw in snap['contents'].items():self.rows[snap['files'][name]['oid']]=raw.encode()
        for name in R.CODE:self.rows[before['files'][name]['oid']]=('trusted '+name).encode()
        self.run={'id':100,'run_attempt':1,'head_sha':F.H,'repository':{'id':1021194725,'full_name':R.REPO},'path':'.github/workflows/ci.yml','event':'pull_request','status':'completed','conclusion':'success','updated_at':NOW.isoformat()}
        security={stage+'/security.json':{'schema_version':1,'status':'passed','image':'sha256:'+('a' if stage=='runtime' else 'b')*64,'packages':100,'observed_at':NOW.isoformat(),'database_updated_at':NOW.isoformat(),'counts':{'CRITICAL':0,'HIGH':0,'MEDIUM':0,'LOW':0,'UNKNOWN':0}} for stage in ('runtime','builder')}
        self.binary_values={1:self.asset,2:packed(security),3:b'synthetic-functional-artifact'}
        self.artifacts=[{'id':i,'name':'blog-review-'+kind+'-100-1','expired':False,'size_in_bytes':len(self.binary_values[i]),'digest':'sha256:'+hashlib.sha256(self.binary_values[i]).hexdigest(),'workflow_run':{'id':100,'head_sha':F.H,'repository_id':1021194725,'head_repository_id':1021194725}} for i,kind in ((2,'security'),(3,'functional'))]
    def github(self,path):
        self.calls.append(path);tail=path.removeprefix(R.PREFIX)
        if tail.startswith('/releases?'):v=[{'tag_name':'v0.1.4','draft':False,'prerelease':False,'assets':[{'id':1,'name':'deployed-release.json','size':len(self.asset),'digest':'sha256:'+hashlib.sha256(self.asset).hexdigest()}]}]
        elif tail.startswith('/git/ref/'):v={'object':{'type':'commit','sha':F.B}}
        elif tail.startswith('/actions/artifacts?'):v={'total_count':0,'artifacts':[]}
        elif tail.startswith('/pulls/'):
            v={'number':128,'state':'open','draft':False,'user':{'id':29139614,'type':'Bot'},'base':{'ref':'main','sha':F.B,'repo':{'id':1021194725,'full_name':R.REPO}},'head':{'sha':F.H,'repo':{'id':1021194725,'full_name':R.REPO}}}
        elif tail.startswith('/compare/'):v={'status':'ahead','merge_base_commit':{'sha':F.B},'total_commits':1}
        elif tail.startswith('/git/commits/'):
            snap=self.before if tail.endswith(F.B) else self.after;v={'sha':snap['commit'],'tree':{'sha':snap['tree']}}
        elif tail.startswith('/git/trees/'):
            snap=self.before if self.before['tree'] in tail else self.after
            v={'sha':snap['tree'],'truncated':False,'tree':[{'path':p,'type':'blob','mode':f['mode'],'sha':f['oid']} for p,f in snap['files'].items()]}
        elif tail.startswith('/git/blobs/'):
            sha=tail.split('/')[-1];raw=self.rows[sha];v={'sha':sha,'size':len(raw),'encoding':'base64','content':base64.b64encode(raw).decode()}
        elif tail=='/actions/workflows/ci.yml':v={'state':'active','path':'.github/workflows/ci.yml'}
        elif '/actions/workflows/ci.yml/runs?' in tail:v={'total_count':1,'workflow_runs':[self.run]}
        elif tail=='/actions/runs/100':v=self.run
        elif '/attempts/' in tail:v={'total_count':3,'jobs':[{'name':name,'run_id':100,'status':'completed','conclusion':'success'} for name in R.A.CI_JOBS]}
        elif '/actions/runs/100/artifacts?' in tail:v={'total_count':2,'artifacts':self.artifacts}
        else:raise AssertionError('unexpected fixed API path')
        return self.rewrite(path,copy.deepcopy(v))
    def binary(self,path,metadata,limit):
        raw=self.binary_values[metadata['id']]
        G.require(len(raw)<=limit and metadata['digest']=='sha256:'+hashlib.sha256(raw).hexdigest(),'BINARY_DOWNLOAD_OR_DIGEST');return raw

class IntegratedObservation(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        p,a,b=F.fixtures();extras={name:'trusted '+name for name in R.CODE}
        self.before=F.snapshot(p,a,F.B,extras);self.after=F.snapshot(p,b,F.H,extras)
        request=F.RequestTests();request.setUp();self.request=request.request;self.config=request.config;self.env=request.env;self.event=request.event
        self.request['source_pr']['tree_sha']=self.after['tree'];self.request['request_id']=G.sha256({'app':'blog','baseline_receipt_sha256':self.request['baseline']['receipt_sha256'],'head_sha':F.H,'tree_sha':self.after['tree']})
        self.request['issued_at']=NOW.isoformat();self.request['expires_at']=(NOW+timedelta(minutes=30)).isoformat();self.request['window']={'start':NOW.replace(minute=0).isoformat(),'end':NOW.replace(hour=15,minute=0).isoformat(),'timezone':'America/Sao_Paulo'}
        self.config['trusted_code']={name:hashlib.sha256(raw.encode()).hexdigest() for name,raw in extras.items()}
        for name,raw in extras.items():path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(raw)
        self.api=API(self.before,self.after,self.request['base_manifest'],self.config)
    def tearDown(self):self.temp.cleanup()
    def reader(self,raw,metadata,run,expected,now):
        self.assertEqual(raw,b'synthetic-functional-artifact');self.assertEqual(expected['image_id'],'sha256:'+'a'*64);self.assertEqual(expected['release']['revision'],F.H);self.assertEqual(expected['producer']['workflow'],'ci.yml');self.assertEqual(len(expected['harness_sha256']),3)
        return {'test_boundary':'synthetic delegated receipt reader','image_id':expected['image_id'],'producer':expected['producer']}
    def observe(self,clock=lambda:NOW):return R.observe(self.request,self.config,self.event,self.env,self.api,self.root,NOW,self.reader,clock)
    def test_end_to_end_trusted_inputs_remain_observational(self):
        result=self.observe();self.assertEqual(result['status'],'observed_inactive');self.assertFalse(result['deployment_authorized']);self.assertFalse(result['preparation_authorized'])
        self.assertIn('review_image_evidence',result);self.assertEqual(len(result['registry']),2)
        self.assertTrue(any('/releases?' in p for p in self.api.calls));self.assertTrue(any('/git/trees/' in p for p in self.api.calls))
    def test_wrong_actor_and_unconfigured_policy_never_start_network(self):
        self.env['GITHUB_ACTOR_ID']='1'
        with self.assertRaisesRegex(ValueError,'SCHEDULER'):self.observe()
        self.assertEqual(self.api.calls,[]);self.env['GITHUB_ACTOR_ID']='332011818';self.config['policy_sha256']=None
        with self.assertRaisesRegex(ValueError,'POLICY_NOT_CONFIGURED'):self.observe()
        self.assertEqual(self.api.calls,[])
    def test_release_asset_absence_checksum_and_truncation_refused(self):
        for kind in ('missing','checksum','truncated'):
            def rewrite(path,value):
                if '/releases?' in path:
                    if kind=='missing':value[0]['assets']=[]
                    if kind=='checksum':value[0]['assets'][0]['digest']='sha256:'+'0'*64
                    if kind=='truncated':value*=100
                return value
            self.api.rewrite=rewrite
            with self.subTest(kind=kind),self.assertRaises(ValueError):self.observe()
    def test_duplicate_request_fork_base_tree_and_code_drift_refused(self):
        for kind in ('duplicate','fork','base','tree','truncated'):
            def rewrite(path,value):
                if kind=='duplicate' and '/actions/artifacts?' in path:value={'total_count':1,'artifacts':[{}]}
                if kind=='fork' and '/pulls/' in path:value['head']['repo']['id']=1
                if kind=='base' and '/git/ref/heads/main' in path:value['object']['sha']=F.H
                if kind=='tree' and '/git/commits/'+F.H in path:value['tree']['sha']='0'*40
                if kind=='truncated' and '/git/trees/' in path:value['truncated']=True
                return value
            self.api.rewrite=rewrite
            with self.subTest(kind=kind),self.assertRaises(ValueError):self.observe()
        self.api.rewrite=lambda p,v:v;(self.root/'scripts/maintenance-yarn-gate.py').write_text('tampered')
        with self.assertRaisesRegex(ValueError,'TRUSTED_CODE_DRIFT'):self.observe()
    def test_functional_artifact_missing_and_clock_expiry_refused(self):
        self.api.rewrite=lambda p,v: {'total_count':1,'artifacts':[self.api.artifacts[0]]} if '/actions/runs/100/artifacts?' in p else v
        with self.assertRaisesRegex(ValueError,'ARTIFACT_MISSING'):self.observe()
        self.api.rewrite=lambda p,v:v
        with self.assertRaises(ValueError):self.observe(clock=lambda:NOW+timedelta(hours=2))
    def test_workflow_is_read_only_serialized_and_has_no_candidate_checkout(self):
        text=(ROOT/'.github/workflows/maintenance.yml').read_text()
        self.assertIn('group: blog-production-release',text);self.assertIn('cancel-in-progress: false',text);self.assertIn('ref: ${{ github.sha }}',text)
        self.assertNotIn(': write',text);self.assertNotIn('secrets.',text);self.assertNotIn('source_pr.head_sha',text);self.assertIn('retention-days: 7',text)

if __name__=='__main__':unittest.main()
