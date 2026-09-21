"""Synthetic bootstrap proof boundaries; no credentials, networking or production."""
import copy
from datetime import timedelta
import io
import hashlib
from contextlib import ExitStack
import json
from pathlib import Path
import unittest
import zipfile
from unittest.mock import patch
from test_release_yarn_admission import load,snapshot,item,fixtures,NOW,SRI
B=load('reviewed-bootstrap.py');G=B.G
SOURCE='2'*40

def request():
    return {'schema_version':1,'service':'blog','source_sha':SOURCE,'source_tree':'3'*40,
            'baseline_receipt_sha256':'4'*64,'target_manifest_sha256':'5'*64,'cumulative_delta_sha256':'6'*64,
            'prepare_run_id':100,'prepare_run_attempt':1,'issued_at':NOW.isoformat(),'expires_at':(NOW+timedelta(minutes=45)).isoformat()}

def env():
    return {'GITHUB_REPOSITORY':'leodotsinc/blog','GITHUB_REPOSITORY_ID':'1021194725','GITHUB_REF':'refs/heads/main',
            'GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_RUN_ATTEMPT':'1','GITHUB_RUN_ID':'200','GITHUB_ACTOR_ID':'22529012',
            'GITHUB_ACTOR':'leodots','GITHUB_TRIGGERING_ACTOR':'leodots','GITHUB_SHA':SOURCE,'GITHUB_WORKFLOW_SHA':SOURCE,
            'GITHUB_WORKFLOW_REF':'leodotsinc/blog/.github/workflows/reviewed-bootstrap.yml@refs/heads/main'}

class BootstrapTests(unittest.TestCase):
    def test_personal_exact_request_has_no_deployment_authority(self):
        B.envelope(request(),env(),{'sender':{'id':22529012}},NOW)
        for key,value in [('GITHUB_ACTOR_ID','332011818'),('GITHUB_TRIGGERING_ACTOR','renovate[bot]'),('GITHUB_REPOSITORY_ID','999'),('GITHUB_RUN_ATTEMPT','2'),('GITHUB_WORKFLOW_SHA','7'*40),('GITHUB_REF','refs/heads/feature')]:
            with self.subTest(key=key),self.assertRaises(G.Refusal):B.envelope(request(),{**env(),key:value},{'sender':{'id':22529012}},NOW)
        with self.assertRaises(G.Refusal):B.envelope({**request(),'approved':True},env(),{'sender':{'id':22529012}},NOW)
    def test_expiry_and_fifteen_minute_budget_are_real(self):
        for now in (NOW-timedelta(seconds=1),NOW+timedelta(minutes=30,seconds=1),NOW+timedelta(minutes=45)):
            with self.assertRaises(G.Refusal):B.envelope(request(),env(),{'sender':{'id':22529012}},now)
        bad=request();bad['expires_at']=(NOW+timedelta(minutes=61)).isoformat()
        with self.assertRaises(G.Refusal):B.envelope(bad,env(),{'sender':{'id':22529012}},NOW)
    def test_cumulative_delta_binds_full_tree_and_rejects_feature(self):
        p,old,new=fixtures();before=snapshot(p,old,B.BASE);after=snapshot(p,new,SOURCE)
        result=B.delta(before,after);self.assertEqual({x['name'] for x in result['dependencies']},{'qs','side-channel'})
        with self.assertRaisesRegex(G.Refusal,'UNREVIEWED_PATH'):B.delta(before,snapshot(p,new,SOURCE,{'app.ts':'changed feature'}))
        edited=copy.deepcopy(p);edited['scripts']['build']='new behavior'
        with self.assertRaisesRegex(G.Refusal,'PACKAGE_BEHAVIOR'):B.delta(before,snapshot(edited,new,SOURCE))
        self.assertNotEqual(G.sha256(result),G.sha256(B.delta(before,snapshot(p,new,'8'*40))))
    def test_reviewed_major_list_does_not_grant_generic_major_or_zero_minor(self):
        p,old,new=fixtures();new['qs@^6.14.0']=item('qs','7.0.0',{'side-channel':'^1.1.1'})
        with self.assertRaises(G.Refusal):B.delta(snapshot(p,old,B.BASE),snapshot(p,new,SOURCE))
        self.assertEqual(B.REVIEWED_BREAKING,{('toml','3.0.0','4.2.0'),('@humanwhocodes/retry','0.3.1','0.4.3')})
        self.assertEqual(B.REVIEWED_ADDITIONS,{('@humanfs/types','0.15.0')})
    def test_same_version_metadata_drift_refuses(self):
        p,old,new=fixtures();new['express@^5.0.0']['resolved']='https://registry.yarnpkg.com/express/-/express-5.0.1.tgz'
        with self.assertRaisesRegex(G.Refusal,'SAME_VERSION_DRIFT'):B.delta(snapshot(p,old,B.BASE),snapshot(p,new,SOURCE))
    def test_reviewed_major_still_needs_official_sri_maturity_and_clean_advisories(self):
        change={'name':'toml','version':'4.2.0','integrity':SRI}
        class API:
            def registry(self,name):return {'name':name,'versions':{'4.2.0':{'name':name,'version':'4.2.0','dist':{'integrity':SRI}}},'time':{'4.2.0':(NOW-timedelta(days=30)).isoformat()}}
            def advisories(self,*args):return []
        api=API();B.registry([change],api,NOW)
        with patch.object(api,'advisories',return_value=[{'ghsa_id':'GHSA-synthetic'}]),self.assertRaisesRegex(G.Refusal,'OFFICIAL_ADVISORY'):B.registry([change],api,NOW)
        metadata=api.registry('toml');metadata['time']['4.2.0']=NOW.isoformat()
        with patch.object(api,'registry',return_value=metadata),self.assertRaisesRegex(G.Refusal,'IMMATURE'):B.registry([change],api,NOW)
        metadata['time']['4.2.0']=(NOW-timedelta(days=30)).isoformat();metadata['versions']['4.2.0']['dist']['integrity']='sha512-changed'
        with patch.object(api,'registry',return_value=metadata),self.assertRaisesRegex(G.Refusal,'IDENTITY'):B.registry([change],api,NOW)
    def test_archive_is_exact_single_file_and_bounded(self):
        def archive(entries):
            output=io.BytesIO()
            with zipfile.ZipFile(output,'w') as z:
                for name,body in entries.items():z.writestr(name,body)
            return output.getvalue()
        self.assertEqual(B.single(archive({'release.json':'{}'}),'release.json'),b'{}')
        for entries in ({'../release.json':'{}'},{'release.json':'{}','extra':'unsafe'},{'release.json':'x'*16385}):
            with self.assertRaises(G.Refusal):B.single(archive(entries),'release.json')
    def test_original_manifest_bytes_and_prepare_flag_are_required_by_workflow(self):
        root=Path(__file__).resolve().parents[1];workflow=(root/'.github/workflows/reviewed-bootstrap.yml').read_text();deploy=(root/'.github/workflows/deploy.yml').read_text()
        self.assertNotIn('docker build',workflow);self.assertNotIn('docker push',workflow)
        self.assertIn('group: blog-production-release',workflow)
        self.assertIn('python3 scripts/reviewed-bootstrap.py image --image-id',workflow)
        self.assertIn('path: release.json',workflow)
        self.assertIn('inputs.prepare_only == true',deploy);self.assertIn('blog-preparation-${{ github.run_id }}-${{ github.run_attempt }}',deploy)
        self.assertIn('python3 scripts/maintenance-guard.py',deploy)
        self.assertNotIn('reviewed-bootstrap', (root/'scripts/maintenance-guard.py').read_text())

class PreparedArtifactTests(unittest.TestCase):
    def setUp(self):
        package,old,new=fixtures();self.before=snapshot(package,old,B.BASE);self.after=snapshot(package,new,SOURCE)
        self.manifest=B.M.create(service='blog',compose_project='leodotsdev',application_kind='first_party',app_version='0.1.5',release_version='0.1.5',image='ghcr.io/leodotsinc/blog@sha256:'+'a'*64,git_sha=SOURCE,source_repository='https://github.com/leodotsinc/blog',build_id='100',build_attempt=1,built_at='2026-09-21T12:00:00Z')
        self.baseline=copy.deepcopy(self.manifest);self.baseline['git_sha']=B.BASE;self.baseline['deployment']['status']='verified'
        self.req=request();self.req.update(source_tree=self.after['tree'],baseline_receipt_sha256=G.sha256(self.baseline),target_manifest_sha256=G.sha256(self.manifest),cumulative_delta_sha256=G.sha256(B.delta(self.before,self.after)))
        self.run={'id':100,'run_attempt':1,'status':'completed','conclusion':'success','head_sha':SOURCE,'event':'workflow_dispatch','path':'.github/workflows/deploy.yml','updated_at':NOW.isoformat(),'repository':{'id':1021194725,'full_name':'leodotsinc/blog'},'actor':{'id':22529012},'triggering_actor':{'id':22529012}}
        self.jobs={'total_count':3,'jobs':[{'name':n,'run_id':100,'status':'completed','conclusion':c} for n,c in [('Select verified source and version','success'),('Build and qualify exact image','success'),('rollout','skipped')]]}
        self.proof={'schema_version':1,'prepare_only':True,'run_id':100,'run_attempt':1,'source_sha':SOURCE,'manifest_sha256':G.sha256(self.manifest)}
        self.security={side:{'schema_version':1,'status':'passed','packages':12,'image':'sha256:'+'b'*64,'observed_at':NOW.isoformat(),'database_updated_at':NOW.isoformat(),'counts':{k:0 for k in ('CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN')},'findings':[],'report_sha256':'c'*64} for side in ('runtime','builder')}
        self.functional=B.I.make_receipt('sha256:'+'b'*64,{'version':'0.1.5','revision':SOURCE,'build_id':'100'},{'next':'16.3.3','sharp':'0.35.4','heif':'1.23.2'},{'run_id':'100','run_attempt':1,'workflow':'deploy.yml','job':'build'});self.functional['observed_at']='2026-09-21T12:00:00Z'
    def github(self,path):
        if path.endswith('/commits/main'):return {'sha':SOURCE}
        if path.endswith('/actions/runs/100'):return self.run
        if path.endswith('/actions/runs/200'):return {'actor':{'id':22529012},'triggering_actor':{'id':22529012},'repository':{'id':1021194725}}
        if '/jobs?' in path:return self.jobs
        raise AssertionError(path)
    def registry(self,name):
        change=next(x for x in B.delta(self.before,self.after)['dependencies'] if x['name']==name)
        return {'name':name,'versions':{change['version']:{'name':name,'version':change['version'],'dist':{'integrity':change['integrity']}}},'time':{change['version']:(NOW-timedelta(days=30)).isoformat()}}
    def advisories(self,*args):return []
    def artifact(self,api,name,rid):
        values={
          'blog-preparation-100-1':{'preparation.json':self.proof},
          'blog-release-100-1':{'release.json':self.manifest},
          'blog-release-security-100-1':{side+'/security.json':value for side,value in self.security.items()},
          'blog-release-functional-100-1':{'functional.json':self.functional}}
        output=io.BytesIO()
        with zipfile.ZipFile(output,'w') as z:
            for path,value in values[name].items():z.writestr(path,json.dumps(value,indent=3))
        raw=output.getvalue();metadata={'name':name,'expired':False,'digest':'sha256:'+hashlib.sha256(raw).hexdigest(),'workflow_run':{'id':100,'head_sha':SOURCE,'repository_id':1021194725,'head_repository_id':1021194725}}
        return metadata,raw
    def call(self):
        with ExitStack() as stack:
            stack.enter_context(patch.object(B.R,'published_baseline',return_value=self.baseline))
            stack.enter_context(patch.object(B.G,'collect',side_effect=lambda sha,*args:self.before if sha==B.BASE else self.after))
            stack.enter_context(patch.object(B.G,'git',return_value=('FROM '+B.NODE+' AS builder\nFROM '+B.NODE+' AS runtime\n').encode()))
            stack.enter_context(patch.object(B.A,'review_ci',return_value={'updated_at':NOW.isoformat()}))
            stack.enter_context(patch.object(B.R,'artifact',side_effect=self.artifact))
            return B.authenticate(self.req,self,self,Path(__file__).resolve().parents[1],env(),{'sender':{'id':22529012}},lambda:NOW)
    def test_original_bytes_build_id_and_exact_scanned_image_are_preserved(self):
        raw,proof=self.call();self.assertEqual(raw,json.dumps(self.manifest,indent=3).encode());self.assertEqual(json.loads(raw)['build']['id'],'100');self.assertFalse(proof['production_authorized']);self.assertEqual(proof['image_id'],self.functional['image_id'])
    def test_wrong_prepare_flag_or_producer_or_build_identity_refuse(self):
        for mutation in ('flag','actor','build','source','job'):
            self.setUp()
            if mutation=='flag':self.proof['prepare_only']=False
            if mutation=='actor':self.run['triggering_actor']['id']=332011818
            if mutation=='build':self.manifest['build']['id']='200'
            if mutation=='source':self.run['head_sha']='9'*40
            if mutation=='job':self.jobs['jobs'][-1]['conclusion']='success'
            with self.subTest(mutation=mutation),self.assertRaises(G.Refusal):self.call()
    def test_stale_scan_and_different_functional_image_refuse(self):
        self.security['runtime']['database_updated_at']=(NOW-timedelta(hours=24,seconds=1)).isoformat()
        with self.assertRaises(G.Refusal):self.call()
        self.setUp();self.functional['image_id']='sha256:'+'d'*64
        with self.assertRaises(ValueError):self.call()

if __name__=='__main__':unittest.main()
