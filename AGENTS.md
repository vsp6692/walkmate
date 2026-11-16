# WalkMate repository instructions

Use the user's Git identity for all commits in this repository:
- Author and committer name: Satheesh
- Author and committer email: vsp6692@gmail.com

Do not substitute an assistant identity or add assistant co-author trailers. Preserve this identity unless the user explicitly requests a change.

The repository root contains the mobile app, development server, original characters, shared code, documentation and validation scripts. Read apps/mobile/AGENTS.md before changing mobile code. Run npm run verify with Node 22.13+ for relevant changes; use npm run verify:all when platform bundle validation is needed. Never commit secrets, local .env files, dependencies, generated builds or source archives.
