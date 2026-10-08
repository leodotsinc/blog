import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('advisory', ROOT / 'scripts' / 'report-advisory-scan.py')
ADVISORY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ADVISORY)


def evidence(status='passed', **extra):
    value = {'schema_version': 1, 'status': status, 'counts': {name: 0 for name in ADVISORY.SEVERITIES}, 'findings': []}
    value.update(extra)
    return value


class AdvisoryScanReport(unittest.TestCase):
    def test_clean_pass_is_silent_and_recorded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'runtime' / 'security.json'
            path.parent.mkdir()
            path.write_text(json.dumps(evidence()))
            summary = root / 'summary.md'
            warnings = ADVISORY.report([path], summary)
            text = summary.read_text()
        self.assertEqual(warnings, [])
        self.assertIn('**runtime**: status=passed', text)
        self.assertIn('advisory', text)

    def test_missing_unreadable_and_findings_warn_without_failing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            missing = root / 'runtime' / 'security.json'
            broken = root / 'builder' / 'security.json'
            broken.parent.mkdir()
            broken.write_text('{')
            blocked = root / 'extra' / 'security.json'
            blocked.parent.mkdir()
            blocked.write_text(json.dumps(evidence('blocked', reason='SCANNER_OR_COVERAGE_UNAVAILABLE',
                                                   counts={'HIGH': 2, 'CRITICAL': 0})))
            medium = root / 'passed-with-findings' / 'security.json'
            medium.parent.mkdir()
            medium.write_text(json.dumps(evidence(findings=[{'Severity': 'MEDIUM'}], counts={'MEDIUM': 1})))
            summary = root / 'summary.md'
            warnings = ADVISORY.report([missing, broken, blocked, medium], summary)
            code = ADVISORY.main([str(missing)])
            summary_text = summary.read_text()
        self.assertEqual(code, 0)
        text = '\n'.join(warnings)
        self.assertIn('SCANNER_OR_COVERAGE_UNAVAILABLE', text)
        self.assertIn('unreadable', text)
        self.assertIn('HIGH=2', text)
        self.assertIn('MEDIUM=1', text)
        self.assertIn('status=blocked', text)
        self.assertIn('### Image vulnerability scan (advisory)', summary_text)

    def test_empty_invocation_warns_and_exits_zero(self):
        self.assertEqual(ADVISORY.main([]), 0)


class LiberalPipeline(unittest.TestCase):
    def test_discovery_has_one_configured_owner(self):
        config = json.loads((ROOT / 'renovate.json').read_text())
        self.assertIs(config['enabled'], True)
        self.assertEqual(set(config['enabledManagers']), {'npm', 'dockerfile', 'github-actions'})
        self.assertFalse((ROOT / '.github/dependabot.yml').exists())
        self.assertNotIn('unqualified and blocked', config['description'])

    def test_maintenance_executor_is_gone(self):
        for path in ('.github/workflows/maintenance.yml', '.github/maintenance.json',
                     'scripts/maintenance-guard.py', 'scripts/maintenance-execution.py',
                     'scripts/maintenance-yarn-gate.py', 'scripts/maintenance-yarn-admission.py',
                     'scripts/maintenance-yarn-receiver.py'):
            self.assertFalse((ROOT / path).exists(), path)
        deploy = (ROOT / '.github/workflows/deploy.yml').read_text()
        ci = (ROOT / '.github/workflows/ci.yml').read_text()
        self.assertNotIn('workflow_call:', deploy)
        self.assertNotIn('maintenance_context', deploy)
        self.assertNotIn('maintenance-guard.py', deploy)
        self.assertNotIn('maintenance-execution.py', deploy)
        self.assertNotIn('maintenance-execution.py', ci)
        self.assertNotIn('source-review', ci)
        self.assertNotIn('source-qualification.json', ci)
        self.assertIn('group: blog-production-release', deploy)
        self.assertNotIn('blog-maintenance-child', deploy)
        self.assertIn("github.event_name != 'workflow_dispatch' || inputs.prepare_only == false", deploy)
        self.assertIn('python3 scripts/select-release.py', deploy)
        self.assertIn('python3 scripts/publish-release.py', deploy)
        self.assertIn('75bb057aaa633335b54c38f4729f96879264e070', deploy)
        self.assertIn('5242d92c3bb190f207fd202d21b3df5338ad52e4', deploy)
        self.assertLess(deploy.index('Select SemVer'), deploy.index('docker push'))
        self.assertLess(deploy.index('docker push'), deploy.index('Publish verified Blog release'))

    def test_scans_stay_advisory_and_upload_evidence(self):
        for name in ('ci.yml', 'deploy.yml'):
            text = (ROOT / '.github/workflows' / name).read_text()
            self.assertEqual(text.count('continue-on-error: true'), 2, name)
            self.assertEqual(text.count('actions/maintenance-scan@902ed57f0e5288e4a0107057cb2e2ca87750a45f'), 2, name)
            self.assertIn('scripts/report-advisory-scan.py', text)
            self.assertIn('security.json', text)
            self.assertIn('retention-days: 7', text)
            self.assertIn('--target builder', text)
            report = text.split('name: Report advisory vulnerability scan', 1)[1].split('name: Retain bounded', 1)[0]
            self.assertIn('runtime/security.json', report)
            self.assertIn('builder/security.json', report)
            self.assertIn('!cancelled()', report)
