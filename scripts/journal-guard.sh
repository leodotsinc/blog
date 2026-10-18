#!/bin/sh
# Daily publishing permits only journal content, across the entire commit range.
set -eu

fail() {
  printf 'journal guard: %s\n' "$*" >&2
  exit 1
}

[ "$#" -eq 2 ] || fail 'usage: journal-guard.sh <old-sha> <new-sha>'
old=$(git rev-parse --verify --end-of-options "$1^{commit}" 2>/dev/null) || fail "unknown commit: $1"
new=$(git rev-parse --verify --end-of-options "$2^{commit}" 2>/dev/null) || fail "unknown commit: $2"

git merge-base --is-ancestor "$old" "$new" 2>/dev/null || fail 'range is not a fast-forward (old commit must be an ancestor of new commit)'
commits=$(git rev-list "$old..$new" --) || fail 'cannot enumerate commits'
rejected=0

for commit in $commits; do
  # Compare merges to every parent. Disable rename detection so both source and
  # destination paths are checked, even for moves across the allowed boundary.
  # Git's C-quoted output escapes embedded newlines/tabs; read -r preserves it.
  paths=$(git -c core.quotePath=true diff-tree --root -m -r --no-commit-id --name-only --no-renames --no-relative --ignore-submodules=none "$commit" --) || fail "cannot inspect commit: $commit"
  while IFS= read -r changed_path; do
    case "$changed_path" in
      '') ;;
      data/journal/*|public/journal/*|'"data/journal/'*|'"public/journal/'*) ;;
      *)
        printf 'journal guard: forbidden path in %s: %s\n' "$commit" "$changed_path" >&2
        rejected=1
        ;;
    esac
  done <<EOF
$paths
EOF
done

exit "$rejected"
