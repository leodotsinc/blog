#!/usr/bin/env python3
"""Deterministic Yarn classic source review; never authorizes any mutation.

Run this reviewed collector outside candidate-controlled code. The baseline must
come from a separately authenticated production receipt. Unsupported Yarn
syntax, aliases/workspaces and ambiguous graphs fail closed. No package install
or candidate code execution is used. Snapshot/tree primitives reuse Pluggy's
reviewed maintenance-source-gate contract.
"""
import argparse
import base64
import csv
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse

SHA = re.compile(r'[0-9a-f]{40}\Z')
VERSION = re.compile(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\Z')
NAME = re.compile(r'(?:@[a-z0-9._-]+/)?[a-z0-9][a-z0-9._-]*\Z')
ALLOWED = {'package.json', 'yarn.lock'}
GROUPS = ('dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies')
LIMIT = 4 * 1024 * 1024
class Refusal(ValueError): pass

def require(ok, code):
    if not ok:
        raise Refusal(code)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode()


def sha256(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def unique(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'DUPLICATE_JSON_KEY')
        result[key] = value
    return result


def decode(raw):
    require(isinstance(raw, str) and len(raw.encode()) <= LIMIT, 'INPUT_SIZE_OR_TYPE')
    return json.loads(raw, object_pairs_hook=unique,
                      parse_constant=lambda _: (_ for _ in ()).throw(Refusal('NONFINITE_JSON')))


def git_oid(kind, data):
    return hashlib.sha1(kind.encode() + b' ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def tree_oid(files):
    tree = {}
    for path, item in files.items():
        require(isinstance(path, str) and path and not any(ord(c) < 32 for c in path), 'INVALID_GIT_PATH')
        parts = path.split('/')
        require(all(p not in ('', '.', '..', '.git') for p in parts), 'INVALID_GIT_PATH')
        require(isinstance(item, dict) and set(item) == {'mode', 'oid'} and
                item['mode'] in {'100644', '100755', '120000'} and SHA.fullmatch(item['oid']), 'INVALID_GIT_ENTRY')
        node = tree
        for part in parts[:-1]:
            require(part not in node or isinstance(node[part], dict), 'GIT_PATH_COLLISION')
            node = node.setdefault(part, {})
        require(parts[-1] not in node, 'GIT_PATH_COLLISION')
        node[parts[-1]] = (item['mode'], item['oid'])

    def encode(node):
        body = b''
        for name in sorted(node, key=lambda n: (n + ('/' if isinstance(node[n], dict) else '')).encode()):
            value = node[name]
            mode, oid = ('40000', encode(value)) if isinstance(value, dict) else value
            body += mode.encode() + b' ' + name.encode() + b'\0' + bytes.fromhex(oid)
        return git_oid('tree', body)
    return encode(tree)


def validate_snapshot(snapshot):
    require(isinstance(snapshot, dict) and set(snapshot) == {'schema_version', 'commit', 'tree', 'files', 'contents'},
            'SNAPSHOT_SCHEMA')
    require(type(snapshot['schema_version']) is int and snapshot['schema_version'] == 1 and
            isinstance(snapshot['commit'], str) and SHA.fullmatch(snapshot['commit']), 'SNAPSHOT_IDENTITY')
    require(isinstance(snapshot['files'], dict) and 2 <= len(snapshot['files']) <= 20000, 'SNAPSHOT_FILES')
    require(tree_oid(snapshot['files']) == snapshot['tree'], 'SNAPSHOT_TREE_MISMATCH')
    require(set(snapshot['contents']) == ALLOWED, 'SNAPSHOT_CONTENTS')
    parsed = {}
    for name in ALLOWED:
        item = snapshot['files'].get(name, {})
        raw = snapshot['contents'][name]
        require(item.get('mode') == '100644' and isinstance(raw, str), 'MANIFEST_NOT_REGULAR')
        require(git_oid('blob', raw.encode()) == item.get('oid'), 'MANIFEST_BLOB_MISMATCH')
        parsed[name] = decode(raw) if name == 'package.json' else parse_yarn(raw)
    return parsed['package.json'], parsed['yarn.lock']


def version(value):
    require(isinstance(value, str) and VERSION.fullmatch(value), 'STABLE_VERSION_REQUIRED')
    return tuple(map(int, value.split('.')))


def compatible(before, after):
    a, b = version(before), version(after)
    require(b >= a, 'DOWNGRADE_REFUSED')
    require(a[0] == b[0] and (a[0] != 0 or a[1] == b[1]), 'MAJOR_OR_ZERO_MINOR_REFUSED')
    return 'minor' if a[1] != b[1] else 'patch' if a[2] != b[2] else 'unchanged'



def scalar(raw):
    if raw.startswith('"'):
        value = decode(raw)
        require(isinstance(value, str), 'YARN_STRING_REQUIRED')
        return value
    require(bool(raw) and not any(c in raw for c in '\t\r\n:#{}[]'), 'UNSUPPORTED_YARN_SCALAR')
    return raw


def parse_yarn(raw):
    require(isinstance(raw, str) and len(raw.encode()) <= LIMIT and '# yarn lockfile v1' in raw[:200], 'YARN_V1_REQUIRED')
    selectors, entry, section = {}, None, None
    for line in raw.splitlines():
        if not line or line.startswith('#'): continue
        require('\t' not in line, 'YARN_INDENTATION')
        if not line.startswith(' '):
            require(line.endswith(':'), 'YARN_HEADER')
            entry, section = {}, None
            for selector in next(csv.reader([line[:-1]], skipinitialspace=True, strict=True)):
                require(selector not in selectors and len(selector) <= 500, 'DUPLICATE_YARN_SELECTOR')
                split_selector(selector)
                selectors[selector] = entry
            continue
        require(entry is not None, 'YARN_ENTRY_REQUIRED')
        if line.startswith('    ') and not line.startswith('     '):
            require(section is not None, 'YARN_SECTION_REQUIRED')
            match = re.fullmatch(r'    ("(?:[^"\\]|\\.)*"|[^ ]+) ("(?:[^"\\]|\\.)*"|[^ ]+)', line)
            require(match is not None, 'YARN_DEPENDENCY_SYNTAX')
            name, spec = scalar(match[1]), scalar(match[2])
            require(NAME.fullmatch(name) and name not in entry[section], 'YARN_DEPENDENCY_NAME_OR_DUPLICATE')
            safe_spec(spec);entry[section][name] = spec
        else:
            require(line.startswith('  ') and not line.startswith('   '), 'YARN_INDENTATION')
            if line.endswith(':'):
                section = line[2:-1]
                require(section in ('dependencies', 'optionalDependencies') and section not in entry, 'YARN_SECTION')
                entry[section] = {}
            else:
                section = None
                key, separator, value = line[2:].partition(' ')
                require(separator and key in {'version', 'resolved', 'integrity'} and key not in entry, 'YARN_FIELD')
                entry[key] = scalar(value)
    require(0 < len(selectors) <= 10000, 'YARN_ENTRY_LIMIT')
    return selectors


def safe_spec(spec):
    require(isinstance(spec, str) and 0 < len(spec) < 200 and
            re.fullmatch(r'[0-9A-Za-z.*^~<>=|+ -]+', spec) and
            not any(word in spec.lower() for word in ('http', 'git', 'file', 'link', 'workspace', 'npm:')), 'REGISTRY_RANGE_REQUIRED')


def split_selector(selector):
    name, separator, spec = selector.rpartition('@')
    require(separator and NAME.fullmatch(name), 'YARN_SELECTOR_NAME')
    safe_spec(spec)
    return name, spec


def satisfies(spec, actual):
    """Bounded stable npm ranges used by changed edges; unknown forms refuse."""
    safe_spec(spec);v = version(actual)
    if ' || ' in spec: return any(satisfies(x, actual) for x in spec.split(' || '))
    if spec in ('*', 'x', 'X'): return True
    if ' - ' in spec:
        lo, hi = spec.split(' - ');return version(lo) <= v <= version(hi)
    if ' ' in spec:
        return all(satisfies(x, actual) for x in re.sub(r'([<>]=?) +', r'\1', spec).split())
    m = re.fullmatch(r'([~^]|>=|<=|>|<|=)?([0-9]+)(?:\.([0-9]+|[xX*]))?(?:\.([0-9]+|[xX*]))?', spec)
    require(m is not None, 'UNSUPPORTED_CHANGED_RANGE')
    op = m[1] or '';parts = m.groups()[1:];count = next((i for i,x in enumerate(parts) if x is None or x in ('x','X','*')),3)
    minimum = tuple(int(x) if i < count else 0 for i,x in enumerate(parts))
    if op in ('>', '>=', '<', '<='):
        require(count == 3, 'UNSUPPORTED_CHANGED_RANGE')
        return {'>':v > minimum, '>=':v >= minimum, '<':v < minimum, '<=':v <= minimum}[op]
    if op == '^':
        idx = 0 if minimum[0] or count == 1 else 1 if minimum[1] or count == 2 else 2
        maximum = minimum[:idx]+(minimum[idx]+1,)+(0,)*(2-idx)
        return minimum <= v < maximum
    if op == '~':
        maximum = (minimum[0]+1,0,0) if count == 1 else (minimum[0],minimum[1]+1,0)
        return minimum <= v < maximum
    return v[:count] == minimum[:count]


def graph(package, selectors):
    require(isinstance(package, dict) and not package.get('workspaces'), 'PACKAGE_WORKSPACES_REFUSED')
    nodes, edges = {}, {}
    for selector, item in selectors.items():
        name, spec = split_selector(selector)
        require(set(item) <= {'version','resolved','integrity','dependencies','optionalDependencies'} and
                {'version','resolved','integrity'} <= set(item), 'LOCK_ENTRY_SCHEMA')
        current = item['version']
        require(isinstance(current,str) and re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?',current), 'LOCK_VERSION')
        url = urllib.parse.urlsplit(item['resolved'])
        expected = '/'+name+'/-/'+name.rsplit('/',1)[-1]+'-'+current+'.tgz'
        require(url.scheme == 'https' and url.netloc in ('registry.npmjs.org','registry.yarnpkg.com') and
                urllib.parse.unquote(url.path) == expected and not url.query and
                (not url.fragment or SHA.fullmatch(url.fragment)), 'LOCK_REGISTRY_ORIGIN')
        sri = item['integrity']
        require(isinstance(sri,str) and sri.startswith('sha512-'), 'STRONG_INTEGRITY_REQUIRED')
        try: binary=base64.b64decode(sri[7:],validate=True)
        except ValueError: raise Refusal('INVALID_INTEGRITY') from None
        require(len(binary)==64,'INVALID_INTEGRITY')
        identity = name+'@'+current
        if identity in nodes: require(nodes[identity] == item, 'DIVERGENT_PACKAGE_IDENTITIES')
        nodes[identity] = item
        for group in ('dependencies','optionalDependencies'):
            for dep, constraint in item.get(group,{}).items():
                key = dep+'@'+constraint
                require(key in selectors, 'LOCK_DEPENDENCY_MISSING')
                edges[(identity,group,dep)] = (constraint,dep+'@'+selectors[key]['version'])
    for group in GROUPS:
        require(isinstance(package.get(group,{}),dict), 'PACKAGE_DEPENDENCIES')
        for name,spec in package.get(group,{}).items():
            require(NAME.fullmatch(name), 'PACKAGE_DEPENDENCY_NAME');safe_spec(spec)
            selector = name+'@'+spec
            require(selector in selectors, 'ROOT_LOCK_DEPENDENCY_MISSING')
            edges[('',group,name)] = (spec,name+'@'+selectors[selector]['version'])
    return nodes,edges


def classify(before, after, verified_baseline):
    package, lock = validate_snapshot(before); candidate, updated = validate_snapshot(after)
    require(before['commit'] == verified_baseline, 'PRODUCTION_BASELINE_DRIFT')
    paths = sorted(p for p in set(before['files']) | set(after['files']) if before['files'].get(p) != after['files'].get(p))
    require(paths and set(paths) <= ALLOWED and 'yarn.lock' in paths, 'NONDEPENDENCY_OR_EMPTY_DELTA')
    mutable = set(GROUPS) | {'resolutions'}
    require({k:v for k,v in package.items() if k not in mutable} ==
            {k:v for k,v in candidate.items() if k not in mutable}, 'PACKAGE_BEHAVIOR_CHANGED')
    for group in GROUPS:
        a,b=package.get(group,{}),candidate.get(group,{})
        require(set(a)==set(b),'DIRECT_DEPENDENCY_SET_CHANGED')
        for name in a:
            if a[name]!=b[name]:
                ma=re.fullmatch(r'([~^]?)(\d+\.\d+\.\d+)',a[name]);mb=re.fullmatch(r'([~^]?)(\d+\.\d+\.\d+)',b[name])
                require(ma and mb and ma[1]==mb[1], 'CHANGED_RANGE_REQUIRES_REVIEW')
                compatible(ma[2],mb[2])
    ares,bres=package.get('resolutions',{}),candidate.get('resolutions',{})
    require(isinstance(ares,dict) and isinstance(bres,dict) and set(ares)<=set(bres),'RESOLUTION_REMOVAL')
    changed_resolutions={k:v for k,v in bres.items() if ares.get(k)!=v}
    for name,value in changed_resolutions.items():
        require(NAME.fullmatch(name),'SCOPED_RESOLUTION_REQUIRES_REVIEW');version(value)
        if name in ares:compatible(ares[name],value)
        require(name+'@'+value in updated and updated[name+'@'+value]['version']==value and
                all(item['version']==value for selector,item in updated.items() if split_selector(selector)[0]==name),'RESOLUTION_LOCK_DRIFT')
    oldnodes, oldedges=graph(package,lock);newnodes,newedges=graph(candidate,updated)
    for selector in set(lock)&set(updated):
        if lock[selector]['version']!=updated[selector]['version']:
            compatible(lock[selector]['version'],updated[selector]['version'])
    oldnames={split_selector(k)[0] for k in oldnodes};newnames={split_selector(k)[0] for k in newnodes}
    require(oldnames==newnames,'TRANSITIVE_PACKAGE_SET_CHANGED')
    changes=[]
    for identity,item in newnodes.items():
        name,new=split_selector(identity)
        if identity in oldnodes:
            require(item==oldnodes[identity],'SAME_VERSION_GRAPH_OR_INTEGRITY_DRIFT');continue
        versions=[split_selector(k)[1] for k in oldnodes if split_selector(k)[0]==name]
        require(all(VERSION.fullmatch(v) for v in versions),'PRERELEASE_BASELINE_REQUIRES_REVIEW')
        prior=max(versions,key=version);kind=compatible(prior,new)
        require(kind!='unchanged','INTEGRITY_DRIFT')
        changes.append({'name':name,'before':prior,'after':new,'kind':kind,'integrity':item['integrity'],
                        'before_integrity':oldnodes[name+'@'+prior]['integrity'],
                        'dependencies':item.get('dependencies',{}),'optionalDependencies':item.get('optionalDependencies',{})})
        for group in ('dependencies','optionalDependencies'):
            for dep,spec in item.get(group,{}).items():
                previous=oldedges.get((name+'@'+prior,group,dep))
                if previous:compatible(split_selector(previous[1])[1],updated[dep+'@'+spec]['version'])
                require(satisfies(spec,updated[dep+'@'+spec]['version']), 'UPDATED_GRAPH_RANGE_MISMATCH')
    require(changes,'NO_DEPENDENCY_VERSION_CHANGE')
    # Removed old versions must have a surviving same-name compatible successor.
    for identity in set(oldnodes)-set(newnodes):
        name,old=split_selector(identity);targets=[split_selector(k)[1] for k in newnodes if split_selector(k)[0]==name]
        require(any(VERSION.fullmatch(v) and version(v)>=version(old) and version(v)[0]==version(old)[0]
                    and (version(old)[0]!=0 or version(v)[1]==version(old)[1]) for v in targets),'TRANSITIVE_REMOVAL_OR_DOWNGRADE')
    for key,(spec,target) in newedges.items():
        if key in oldedges and oldedges[key] != (spec,target):
            name,actual=split_selector(target)
            compatible(split_selector(oldedges[key][1])[1],actual)
            require(satisfies(spec,actual) or changed_resolutions.get(name)==actual,'CHANGED_EDGE_RANGE_MISMATCH')
    result={'schema_version':1,'service':'blog','baseline_commit':before['commit'],'candidate_commit':after['commit'],
            'candidate_tree':after['tree'],'paths':paths,'changes':sorted(changes,key=lambda x:(x['name'],x['after']))}
    return {**result,'delta_sha256':sha256(result),'deployment_authorized':False,
            'required_next':['trusted registry/advisory and exact CI review','host policy/backup/functional qualification']}


def git(*args, cwd=None):
    result=subprocess.run(['git','--no-replace-objects',*args],cwd=cwd,capture_output=True,timeout=20)
    require(result.returncode==0 and len(result.stdout)<=LIMIT,'GIT_READ_FAILED_OR_LIMIT')
    return result.stdout


def collect(revision,cwd=None):
    require(isinstance(revision,str) and SHA.fullmatch(revision),'FULL_COMMIT_REQUIRED')
    require(git('rev-parse',revision+'^{commit}',cwd=cwd).decode().strip()==revision,'COMMIT_IDENTITY')
    files={}
    for row in git('ls-tree','-r','-z',revision,cwd=cwd).split(b'\0'):
        if not row:continue
        meta,path=row.split(b'\t',1);mode,kind,oid=meta.decode().split()
        require(kind=='blob','SUBMODULE_REQUIRES_REVIEW');files[path.decode()]={'mode':mode,'oid':oid}
    return {'schema_version':1,'commit':revision,'tree':git('rev-parse',revision+'^{tree}',cwd=cwd).decode().strip(),
            'files':files,'contents':{name:git('show',revision+':'+name,cwd=cwd).decode() for name in ALLOWED}}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--baseline',required=True);parser.add_argument('--candidate',required=True)
    args=parser.parse_args()
    # This identity is deliberately supplied by a trusted caller; this CLI does
    # not treat a user/PR file as proof that its chosen baseline is production.
    require(SHA.fullmatch(args.baseline) and SHA.fullmatch(args.candidate),'FULL_COMMIT_REQUIRED')
    git('merge-base','--is-ancestor',args.baseline,args.candidate)
    result=classify(collect(args.baseline),collect(args.candidate),args.baseline)
    print(json.dumps(result,sort_keys=True))

if __name__=='__main__':
    try:main()
    except (Refusal,ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError,csv.Error):
        print('YARN_SOURCE_REFUSED; no mutation authorized',file=sys.stderr);sys.exit(1)
