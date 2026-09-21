#!/usr/bin/env python3
"""Qualify only random-named disposable resources; no providers, VPS or real env."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import secrets
import subprocess
import time
import urllib.request
from release_manifest import stable_version
from image_receipt import make_receipt, validate, harness_hashes


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        return None


def run(*args, timeout=120):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError('isolated qualification command failed')
    return result.stdout.strip()


def qualify(image, identity, producer):
    prefix = 'blog-image-ci-' + secrets.token_hex(5)
    network, app = prefix + '-network', prefix + '-app'
    made = []
    try:
        info = json.loads(run('docker', 'image', 'inspect', image))[0]
        assert info['Os'] == 'linux' and info['Architecture'] == 'amd64'
        env = dict(row.split('=', 1) for row in info['Config'].get('Env', []) if '=' in row)
        expected = {'version': env['APP_VERSION'], 'revision': env['APP_REVISION'], 'build_id': env['APP_BUILD_ID']}
        assert expected == identity
        stable_version(expected['version'])
        assert re.fullmatch(r'[0-9a-f]{40}', expected['revision'])
        assert re.fullmatch(r'[0-9]{1,32}', expected['build_id'])
        labels = info['Config'].get('Labels') or {}
        assert labels.get('org.opencontainers.image.version') == expected['version']
        assert labels.get('org.opencontainers.image.revision') == expected['revision']
        assert labels.get('org.opencontainers.image.source') == 'https://github.com/leodotsinc/blog'
        assert info['Config'].get('User') == 'node'
        assert not any(key.startswith('SPOTIFY_') for key in env)
        run('docker', 'network', 'create', '--internal', network)
        made.append(('network', network))
        made.append(('container', app))
        run('docker', 'run', '-d', '--name', app, '--network', network, '--memory', '768m', '--cpus', '1',
            '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
            info['Id'])
        def request(path):
            # Keep the test network internal. Docker 29 may not publish its ports.
            # Read through loopback inside this disposable container instead.
            value = json.loads(run('docker', 'exec', app, 'node', '-e',
                "fetch('http://127.0.0.1:3000'+process.argv[1],{redirect:'error',signal:AbortSignal.timeout(5000)}).then(async r=>console.log(JSON.stringify({status:r.status,body:(await r.text()).slice(0,16384),headers:Object.fromEntries(r.headers)}))).catch(()=>process.exit(1))",
                path, timeout=10))
            return value['status'], value['body'].encode(), {'Cache-Control': value['headers'].get('cache-control', '')}
        for _ in range(90):
            try:
                status, body, headers = request('/api/health')
                if status == 200 and json.loads(body) == {'status': 'ok'}:
                    break
            except (OSError, ValueError, RuntimeError):
                pass
            time.sleep(1)
        else:
            raise RuntimeError('isolated blog readiness failed')
        assert 'no-store' in headers.get('Cache-Control', '')
        status, body, headers = request('/api/version')
        assert status == 200 and json.loads(body) == expected
        assert 'no-store' in headers.get('Cache-Control', '')
        assert run('docker', 'exec', app, 'id', '-u') == '1000'
        # The cache is operational ephemeral state; ensure normal image optimization can write it.
        run('docker', 'exec', app, 'node', '-e',
            "require('fs').accessSync('/app/.next/cache',require('fs').constants.W_OK)")
        # Check the actual native codec in the Linux image, not just yarn.lock.
        codecs = json.loads(run('docker', 'exec', app, 'node', '-e', """
          const assert = require('node:assert/strict');
          const sharp = require('sharp');
          const manifest = require('./package.json');
          const next = require('next/package.json').version;
          assert.equal(next, manifest.dependencies.next);
          assert.equal(sharp.versions.sharp, manifest.resolutions.sharp);
          (async () => {
            for (const format of ['png', 'jpeg']) {
              const buffer = await sharp({create:{width:8,height:8,channels:3,background:'#228877'}})
                .toFormat(format).toBuffer();
              const metadata = await sharp(buffer).metadata();
              assert.equal(metadata.format, format);
              assert.equal(metadata.width, 8);
            }
            console.log(JSON.stringify({next, sharp:sharp.versions.sharp, heif:sharp.versions.heif}));
          })().catch(() => process.exit(1));
        """))
        assert tuple(map(int, codecs['sharp'].split('.')[:3])) >= (0, 35, 4)
        assert tuple(map(int, codecs['heif'].split('.')[:3])) >= (1, 23, 2)
        assert request('/_next/image?url=%2Fprofile-image.jpg&w=64&q=75')[0] == 200
        assert request('/')[0] == 200
        for path in ['/api/health', '/api/version']:
            # No operational secrets in either endpoint.
            assert 'SPOTIFY_' not in request(path)[1].decode()
        receipt = make_receipt(info['Id'], expected, codecs, producer)
        validate(receipt, {'image_id': info['Id'], 'release': identity, 'producer': producer,
                          'harness_sha256': harness_hashes()}, datetime.now(timezone.utc))
    finally:
        for kind, name in reversed(made):
            subprocess.run(['docker', kind, 'rm', *(['-f'] if kind == 'container' else []), name],
                           capture_output=True, timeout=30)
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('image')
    for name in ('version', 'revision', 'build-id', 'workflow', 'output'):
        parser.add_argument('--' + name, required=True)
    parser.add_argument('--run-attempt', type=int, required=True)
    args = parser.parse_args()
    identity = {'version': args.version, 'revision': args.revision, 'build_id': args.build_id}
    producer = {'run_id': args.build_id, 'run_attempt': args.run_attempt, 'workflow': args.workflow,
                'job': 'image' if args.workflow == 'ci.yml' else 'build'}
    result = qualify(args.image, identity, producer)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents stale evidence from an earlier attempt being reused.
    with output.open('x') as handle:
        json.dump(result, handle, sort_keys=True)
        handle.write('\n')
    print(json.dumps({'ok': True, 'image_id': result['image_id'], 'receipt': output.name}))
