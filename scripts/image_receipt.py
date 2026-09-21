"""Bounded functional image receipt; authenticity requires trusted GitHub metadata.

A consumer must fetch run/artifact metadata from GitHub independently and obtain
expected source/harness/image identities from its qualified release chain. Neither
this JSON nor hashes supplied by a candidate are authorization for deployment.
"""
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile

REPOSITORY = 'leodotsinc/blog'
CHECKS = ['readiness', 'public_version_identity', 'nonroot_runtime', 'writable_image_cache',
          'native_codec_versions', 'png_jpeg_processing', 'next_image_optimization', 'home_http']
HARNESS = ('scripts/qualify-image.py', 'scripts/image_receipt.py', 'scripts/release_manifest.py')
LIMIT = 16384


def need(value, code):
    if not value:
        raise ValueError(code)


def exact(value, keys):
    need(isinstance(value, dict) and set(value) == set(keys), 'RECEIPT_SCHEMA')


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def timestamp(value):
    need(isinstance(value, str) and value.endswith('Z'), 'RECEIPT_TIMESTAMP')
    try:
        return datetime.fromisoformat(value[:-1] + '+00:00')
    except ValueError:
        raise ValueError('RECEIPT_TIMESTAMP') from None


def harness_hashes():
    root = Path(__file__).resolve().parent.parent
    return {name: sha256((root / name).read_bytes()) for name in HARNESS}


def make_receipt(image_id, identity, codecs, producer):
    return {'schema_version': 1, 'service': 'blog', 'repository': REPOSITORY,
            'image_id': image_id, 'release': identity, 'producer': producer,
            'observed_at': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
            'checks': CHECKS.copy(), 'runtime_dependencies': codecs, 'harness_sha256': harness_hashes(),
            'external_providers_contacted': False, 'visual_acceptance': False, 'restore_verified': False}


def validate(receipt, expected, now):
    exact(receipt, {'schema_version', 'service', 'repository', 'image_id', 'release', 'producer',
                    'observed_at', 'checks', 'runtime_dependencies', 'harness_sha256',
                    'external_providers_contacted', 'visual_acceptance', 'restore_verified'})
    exact(expected, {'image_id', 'release', 'producer', 'harness_sha256'})
    need(type(receipt['schema_version']) is int and receipt['schema_version'] == 1 and
         receipt['service'] == 'blog' and receipt['repository'] == REPOSITORY, 'RECEIPT_IDENTITY')
    need(isinstance(receipt['image_id'], str) and re.fullmatch(r'sha256:[a-f0-9]{64}', receipt['image_id']),
         'RECEIPT_IMAGE_ID')
    exact(receipt['release'], {'version', 'revision', 'build_id'})
    version, revision, build_id = (receipt['release'][key] for key in ('version', 'revision', 'build_id'))
    need(all(isinstance(v, str) for v in (version, revision, build_id)) and
         re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', version) and
         re.fullmatch(r'[a-f0-9]{40}', revision) and re.fullmatch(r'[1-9][0-9]{0,31}', build_id),
         'RECEIPT_RELEASE')
    producer = receipt['producer']
    exact(producer, {'run_id', 'run_attempt', 'workflow', 'job'})
    need(producer['run_id'] == build_id and type(producer['run_attempt']) is int and
         1 <= producer['run_attempt'] <= 10000 and
         (producer['workflow'], producer['job']) in (('ci.yml', 'image'), ('deploy.yml', 'build')),
         'RECEIPT_PRODUCER')
    exact(receipt['harness_sha256'], HARNESS)
    need(all(isinstance(v, str) and re.fullmatch(r'[a-f0-9]{64}', v)
             for v in receipt['harness_sha256'].values()), 'RECEIPT_HARNESS')
    need(all(receipt[key] == expected[key] for key in expected), 'RECEIPT_EXPECTATION_MISMATCH')
    observed = timestamp(receipt['observed_at'])
    need(now.tzinfo is not None and 0 <= (now - observed).total_seconds() <= 86400, 'RECEIPT_STALE')
    need(receipt['checks'] == CHECKS and all(receipt[key] is False for key in
         ('external_providers_contacted', 'visual_acceptance', 'restore_verified')), 'RECEIPT_INCOMPLETE')
    exact(receipt['runtime_dependencies'], {'next', 'sharp', 'heif'})
    need(all(isinstance(v, str) and re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+', v)
             for v in receipt['runtime_dependencies'].values()), 'RECEIPT_CODECS')
    return receipt


def artifact_name(producer):
    prefix = 'review' if producer['workflow'] == 'ci.yml' else 'release'
    return f"blog-{prefix}-functional-{producer['run_id']}-{producer['run_attempt']}"


def read_artifact(archive, metadata, run, expected, now):
    """Validate downloaded ZIP against independently authenticated GitHub metadata.

    The caller also validates the successful producing job and workflow definition
    for this attempt. A receipt cannot prove that its own test harness was trusted.
    """
    need(isinstance(archive, bytes) and 0 < len(archive) <= 65536, 'ARTIFACT_SIZE')
    need(isinstance(metadata, dict) and isinstance(run, dict), 'ARTIFACT_METADATA')
    producer = expected['producer']
    need(metadata.get('expired') is False and metadata.get('name') == artifact_name(producer) and
         metadata.get('digest') == 'sha256:' + sha256(archive), 'ARTIFACT_DIGEST_OR_IDENTITY')
    need(run.get('repository', {}).get('full_name') == REPOSITORY and
         type(run.get('id')) is int and str(run['id']) == producer['run_id'] and
         type(run.get('run_attempt')) is int and run.get('run_attempt') == producer['run_attempt'] and run.get('status') == 'completed' and
         run.get('conclusion') == 'success' and run.get('head_sha') == expected['release']['revision'] and
         run.get('path') == '.github/workflows/' + producer['workflow'], 'ARTIFACT_RUN_IDENTITY')
    linked = metadata.get('workflow_run', {})
    need(linked.get('id') == run['id'] and linked.get('head_sha') == run['head_sha'] and
         type(run['repository'].get('id')) is int and
         linked.get('repository_id') == run['repository']['id'] and
         linked.get('head_repository_id') == run['repository']['id'], 'ARTIFACT_REPOSITORY_IDENTITY')
    try:
        with zipfile.ZipFile(io.BytesIO(archive)) as package:
            entries = package.infolist()
            need(len(entries) == 1 and entries[0].filename == 'functional.json' and
                 entries[0].file_size <= LIMIT and not entries[0].flag_bits & 1, 'ARTIFACT_CONTENTS')
            raw = package.read(entries[0])
        def pairs(items):
            result = {}
            for key, value in items:
                need(key not in result, 'RECEIPT_DUPLICATE_KEY')
                result[key] = value
            return result
        receipt = json.loads(raw, object_pairs_hook=pairs,
                             parse_constant=lambda _: need(False, 'RECEIPT_NONFINITE'))
    except (zipfile.BadZipFile, UnicodeError, RuntimeError, NotImplementedError):
        raise ValueError('ARTIFACT_INVALID') from None
    return validate(receipt, expected, now)
