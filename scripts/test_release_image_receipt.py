import copy
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import unittest
import zipfile

import image_receipt as receipt

NOW = datetime(2026, 9, 21, 12, tzinfo=timezone.utc)


def fixture():
    identity = {'version':'0.1.1', 'revision':'a'*40, 'build_id':'456'}
    producer = {'run_id':'456', 'run_attempt':1, 'workflow':'ci.yml', 'job':'image'}
    value = receipt.make_receipt('sha256:'+'b'*64, identity,
                                 {'next':'16.3.3','sharp':'0.35.4','heif':'1.23.2'}, producer)
    value['observed_at'] = '2026-09-21T12:00:00Z'
    expected = {key:copy.deepcopy(value[key]) for key in ('image_id','release','producer','harness_sha256')}
    run = {'id':456, 'run_attempt':1, 'status':'completed','conclusion':'success',
           'head_sha':'a'*40,'path':'.github/workflows/ci.yml',
           'repository':{'full_name':receipt.REPOSITORY,'id':123}}
    metadata = {'name':'blog-review-functional-456-1','expired':False,
                'workflow_run':{'id':456,'head_sha':'a'*40,'repository_id':123,'head_repository_id':123}}
    return value, expected, run, metadata


def archive(value, filename='functional.json'):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as output:
        output.writestr(filename, json.dumps(value))
    return buffer.getvalue()


class FunctionalReceipt(unittest.TestCase):
    def setUp(self):
        self.value, self.expected, self.run, self.metadata = fixture()

    def read(self, value=None, filename='functional.json'):
        data = archive(self.value if value is None else value, filename)
        self.metadata['digest'] = 'sha256:'+receipt.sha256(data)
        return receipt.read_artifact(data, self.metadata, self.run, self.expected, NOW)

    def test_real_harness_hashes_and_bound_artifact(self):
        result=self.read()
        self.assertEqual(result['image_id'],self.expected['image_id'])
        for name, digest in result['harness_sha256'].items():
            self.assertEqual(digest,receipt.sha256((Path(__file__).parent.parent/name).read_bytes()))
        self.assertFalse(result['visual_acceptance'])
        self.assertFalse(result['restore_verified'])

    def test_image_sha_build_harness_and_attempt_substitution_refused(self):
        for key in ('image_id','revision','version','build_id','harness','attempt'):
            self.setUp()
            if key=='image_id': self.value[key]='sha256:'+'c'*64
            if key in ('revision','version','build_id'): self.value['release'][key]='1' if key=='build_id' else ('c'*40 if key=='revision' else '0.1.2')
            if key=='harness': self.value['harness_sha256']['scripts/qualify-image.py']='0'*64
            if key=='attempt': self.value['producer']['run_attempt']=2
            with self.subTest(key=key), self.assertRaises(ValueError): self.read()

    def test_stale_future_and_incomplete_output_refused(self):
        for key in ('old','future','missing','partial','claim','extra','codec'):
            self.setUp()
            if key in ('old','future'):
                self.value['observed_at']=(NOW+timedelta(seconds=-86401 if key=='old' else 1)).isoformat().replace('+00:00','Z')
            if key=='missing': del self.value['release']
            if key=='partial': self.value['checks'].remove('png_jpeg_processing')
            if key=='claim': self.value['visual_acceptance']=True
            if key=='extra': self.value['secret']='synthetic'
            if key=='codec': self.value['runtime_dependencies']['sharp']=None
            with self.subTest(key=key), self.assertRaises(ValueError): self.read()

    def test_wrong_repository_run_artifact_or_unsuccessful_ci_refused(self):
        for key in ('name','expired','conclusion','pending','sha','fork','repo','attempt','workflow'):
            self.setUp()
            if key=='name': self.metadata['name']='blog-review-functional-456-2'
            if key=='expired': self.metadata['expired']=True
            if key=='conclusion': self.run['conclusion']='failure'
            if key=='pending': self.run['status']='in_progress'
            if key=='sha': self.run['head_sha']='c'*40
            if key=='fork': self.metadata['workflow_run']['head_repository_id']=999
            if key=='repo': self.run['repository']['full_name']='other/blog'
            if key=='attempt': self.run['run_attempt']=2
            if key=='workflow': self.run['path']='.github/workflows/forged.yml'
            with self.subTest(key=key), self.assertRaises(ValueError): self.read()

    def test_archive_swap_and_unexpected_path_refused(self):
        data=archive(self.value)
        self.metadata['digest']='sha256:'+'0'*64
        with self.assertRaises(ValueError): receipt.read_artifact(data,self.metadata,self.run,self.expected,NOW)
        for filename in ('../functional.json','nested/functional.json','other.json'):
            with self.subTest(filename=filename), self.assertRaises(ValueError): self.read(filename=filename)

    def test_workflows_retain_receipt_seven_days_without_changing_rollout_gate(self):
        root=Path(__file__).resolve().parent.parent
        for name,kind in (('ci.yml','review'),('deploy.yml','release')):
            text=(root/'.github/workflows'/name).read_text()
            section=text.split('      - name: Retain exact-image functional receipt',1)[1].split('      - name:',1)[0]
            self.assertIn('retention-days: 7',section)
            self.assertIn('if-no-files-found: error',section)
            self.assertIn('blog-'+kind+'-functional-',section)
            self.assertIn('--output functional-evidence/functional.json',text)
            self.assertIn('echo "runtime=$runtime"',text)
        deploy=(root/'.github/workflows/deploy.yml').read_text()
        self.assertIn("if: github.event_name != 'workflow_dispatch' || inputs.prepare_only == false",deploy)
        self.assertIn('python3 scripts/maintenance-guard.py',deploy)


if __name__=='__main__': unittest.main()
