#!/usr/bin/env python3
"""Report pinned image-scan evidence without failing the job.

The shared maintenance-scan action writes security.json and then exits
non-zero unless status is "passed", including when the vulnerability
database is stale (SCANNER_OR_COVERAGE_UNAVAILABLE). Callers keep that
action and mark the step continue-on-error. This reporter only warns.
"""
import json
import os
import sys
from pathlib import Path

SEVERITIES = ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')


def assess(path):
    label = path.parent.name or path.name
    if not path.is_file():
        return {'label': label, 'ok': False,
                'detail': 'security.json missing (SCANNER_OR_COVERAGE_UNAVAILABLE)'}
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return {'label': label, 'ok': False,
                'detail': 'security.json unreadable (SCANNER_OR_COVERAGE_UNAVAILABLE)'}
    if not isinstance(data, dict):
        return {'label': label, 'ok': False,
                'detail': 'security.json is not an object (SCANNER_OR_COVERAGE_UNAVAILABLE)'}
    status = data.get('status')
    reason = data.get('reason')
    counts = data.get('counts') if isinstance(data.get('counts'), dict) else {}
    findings = data.get('findings') if isinstance(data.get('findings'), list) else []
    hot = []
    for key in SEVERITIES:
        value = counts.get(key, 0)
        if isinstance(value, int) and not isinstance(value, bool) and value > 0:
            hot.append(f'{key}={value}')
    parts = [f'status={status if isinstance(status, str) else "unknown"}']
    if isinstance(reason, str) and reason:
        parts.append(f'reason={reason}')
    if hot:
        parts.append(' '.join(hot))
    elif findings:
        parts.append(f'findings={len(findings)}')
    problem = status != 'passed' or bool(reason) or bool(hot) or bool(findings)
    return {'label': label, 'ok': not problem, 'detail': ' '.join(parts)}


def render(results):
    lines = ['### Image vulnerability scan (advisory)', '']
    warnings = []
    for result in results:
        lines.append(f"- **{result['label']}**: {result['detail']}")
        if not result['ok']:
            warnings.append(f"{result['label']} image scan: {result['detail']}")
    lines.append('')
    return '\n'.join(lines), warnings


def report(paths, summary_path=None):
    text, warnings = render([assess(Path(path)) for path in paths])
    if summary_path:
        with open(summary_path, 'a', encoding='utf-8') as handle:
            handle.write(text)
    for message in warnings:
        print(f'::warning::{message}')
    return warnings


def main(argv=None):
    paths = list(sys.argv[1:] if argv is None else argv)
    if not paths:
        print('::warning::advisory scan reporter received no security.json paths')
        return 0
    report(paths, os.environ.get('GITHUB_STEP_SUMMARY'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
