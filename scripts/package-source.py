"""Create a reproducible source-only archive from explicit project directories.
Never package environment secrets, git history, dependencies or generated builds.
"""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parent.parent
out=root/'artifacts'/'walkmate-source.zip'
roots=['apps/mobile','apps/server','characters','packages','docs','scripts']
skip_dirs={'.git','node_modules','.expo','dist','.claude','.codex','__pycache__','artifacts'}
allowed_suffixes={'.ts','.tsx','.mjs','.js','.json','.md','.py','.png','.jpg','.jpeg','.svg','.webp','.example'}
files=[root/name for name in ['README.md','CONTRIBUTING.md','LICENSE','package.json','.gitignore']]
for name in roots:
 for path in (root/name).rglob('*'):
  if not path.is_file() or path.is_symlink(): continue
  relative=path.relative_to(root/name)
  if any(part in skip_dirs for part in relative.parts): continue
  if path.name.startswith('.env') and path.name!='.env.example': continue
  if path.name in {'AGENTS.md','CLAUDE.md','.DS_Store'}: continue
  if path.suffix in allowed_suffixes or path.name in {'LICENSE','.gitignore'}: files.append(path)
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
 for path in sorted(set(files)):
  info=zipfile.ZipInfo('walkmate/'+path.relative_to(root).as_posix(),date_time=(2026,11,16,0,0,0))
  info.compress_type=zipfile.ZIP_DEFLATED
  archive.writestr(info,path.read_bytes())
with zipfile.ZipFile(out) as archive:
 assert archive.testzip() is None
 names=archive.namelist()
 assert 'walkmate/characters/maya.json' in names
 assert 'walkmate/apps/mobile/package-lock.json' in names
 assert 'walkmate/apps/server/server.mjs' in names
 assert not any('/node_modules/' in n or '/.git/' in n or ('/.env' in n and not n.endswith('/.env.example')) for n in names)
print(f'{out}: {len(files)} source files, {out.stat().st_size:,} bytes; integrity verified')
