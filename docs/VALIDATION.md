# Validation record

2026-11-16 overnight build. Run `npm run verify:all` from the root with Node 22.13+ to reproduce automated checks. The script fails immediately on any failed stage and includes both mobile logic and server HTTP tests.

- TypeScript: passed.
- ESLint across authored mobile modules: passed.
- 36 logic and HTTP tests: passed. HTTP tests use an actual loopback server and mocked upstream model providers.
- Expo Android, iOS and web exports: passed. These are bundle builds, not signed native installations.
- Expo dependency compatibility (`expo install --check`): up to date.
- npm production audit: 3 moderate, 0 high, 0 critical findings in Expo / @expo/fingerprint / minimatch dependency chain. npm proposed downgrading Expo to 52.0.49; that was not applied to the SDK 58 app. Reassess supported upstream updates before public release.
- Native tooling: adb unavailable; xcrun cannot find simctl. No physical phone or simulator runtime validation performed.
- Providers: not configured; no paid model requests or real recognition quality tests performed.

## Device acceptance still required

1. Fresh install, permission denied/granted paths, preference reload, narrow display and large text.
2. Record a short clip, cancel during permission/setup/upload, background and return, disconnect headphones, inspect cache cleanup. Repeat on Android and iOS development builds.
3. Connect real configured models, inspect editable transcript, interrupt replies, switch audio/avatar without losing conversation.
4. Walk for 20 minutes with screen on, check GPS signal loss/recovery, pause/resume, distance plausibility and finishing. Screen-lock/background walking is not implemented.
5. Save one summary, restart, erase it; confirm no coordinates or transcripts in history storage. Forget server address separately.
6. Validate Tamil speech recognition, generation and synthesis together before advertising full support.

Do not treat passing simulated timing tests as a 20-minute device reliability result.
