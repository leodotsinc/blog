import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('blog_select', SCRIPTS/'select-release.py')
select = importlib.util.module_from_spec(spec)
spec.loader.exec_module(select)
REVISION, OLD = 'a'*40, 'b'*40


class SelectionTests(unittest.TestCase):
    def execute(self, tags, messages='', *, same_sha=False, collision=1, publication=None):
        def git(*args):
            if args == ('rev-parse','HEAD'): return REVISION
            if args == ('tag','--merged',REVISION): return '\n'.join(tags)
            if args == ('rev-parse',tags[-1]+'^{commit}'): return REVISION if same_sha else OLD
            raise AssertionError('unexpected Git call')
        with patch.object(select,'git',side_effect=git), patch.object(select.subprocess,'check_output',return_value=messages), \
             patch.object(select.subprocess,'run',return_value=subprocess.CompletedProcess([],collision)), \
             patch.object(select,'verify_published_release',side_effect=publication) as verify, \
             patch.dict(os.environ,{'GITHUB_REPOSITORY':'leodotsinc/blog'}), \
             patch.object(select.Path,'read_text',return_value='{"version":"0.1.0"}'):
            return select.select(), verify

    def test_first_version_is_explicit_package_baseline(self):
        value, verify=self.execute([])
        self.assertEqual(value['version'],'0.1.0'); verify.assert_not_called()

    def test_identical_published_source_is_skipped(self):
        value, verify=self.execute(['v0.1.0'],same_sha=True)
        self.assertEqual(value['already_released'],'true')
        verify.assert_called_once_with('leodotsinc/blog','v0.1.0',REVISION)

    def test_common_feature_and_breaking_commit_bumps(self):
        for messages, expected in [('fix: a\0','0.1.1'),('feat: a\0','0.2.0'),('feat: a\0refactor!: b\0','1.0.0')]:
            with self.subTest(expected=expected):
                self.assertEqual(self.execute(['v0.1.0'],messages)[0]['version'],expected)

    def test_incomplete_publication_blocks_bump(self):
        with self.assertRaisesRegex(ValueError,'INCOMPLETE'):
            self.execute(['v0.1.0'],'fix: a\0',publication=ValueError('INCOMPLETE'))

    def test_unreachable_collision_blocks_build(self):
        with self.assertRaises(ValueError): self.execute(['v0.1.0'],'fix: a\0',collision=0)

    def test_git_lookup_error_is_not_absence(self):
        with self.assertRaises(ValueError): self.execute([] ,collision=128)


if __name__=='__main__': unittest.main()
