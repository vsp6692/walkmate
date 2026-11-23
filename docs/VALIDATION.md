# Validation record

2026-11-16 overnight build. Run `npm run verify:all` from the root with Node 22.13+ to reproduce automated checks. The script fails immediately on any failed stage and includes both mobile logic and server HTTP tests.

- TypeScript: passed.
- ESLint across authored mobile modules: passed without warnings or errors.
- 93 logic and HTTP tests: passed. HTTP tests use an actual loopback server and mocked upstream model providers.
- Expo Android, iOS and web exports: passed after microphone capability-check cancellation. These are bundle builds, not signed native installations.
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

Recovery acceptance: save a point during a walk, reload, restore paused and confirm that only saved counters resume. Confirm separate erase, replacement, storage failure handling and no GPS/chat/audio in the recovery record. Finishing a walk does not automatically erase a manual recovery point. Native UI verification remains pending.

History storage regression checks: unreadable/malformed data is not overwritten on save; retry succeeds after storage recovers; pending saves finish before erase; concurrent saves preserve both entries. UI/device storage-failure testing is still required.

Milestone checks cover exact time/distance boundaries, independent counters, invalid-counter rejection and finite milestone lists. Cards use session counters, not verified routes or arrival detection. Physical GPS behavior remains unvalidated.

Avatar acceptance pending: inspect Maya/Arjun illustrations on small/large displays; verify pause, Reduce Motion, background return, and audio/avatar toggles without losing conversation. Only compilation/static checks were performed for the artwork; no visual preview tools used.

Transcript device acceptance: type while transcription is pending; confirm text remains unchanged until Add, verify append/discard, oversized-merge error and disconnect clearing. Automated checks cover the merge boundary; UI/native recording still needs device testing.

Backend response transport: 128 KiB cap enforced against declared and streamed payloads; UTF-8 chunk boundaries, cancellation during/before reads, late JSON and generic HTTP errors tested with controlled streams. No real-provider requests were made. Mobile exports remain unchanged for this backend-only increment.

GPS retry acceptance: simulate stalled native setup, denied permission, unavailable services and recovery; Retry GPS must preserve timer/distance and start a fresh location anchor. Unit tests verify late subscription disposal and timeout/retry isolation; actual device GPS remains unvalidated.

Backend configuration checks: defaults and copied .env.example remain unconfigured; partial/placeholder providers and unsafe URL formats fail without leaking values; origins and ports normalize/validate. `server.mjs --check` ran locally without a listener/provider call. Mobile exports were not repeated for backend-only changes.

Session transition acceptance: with slow recovery storage, tap Restore then Start/reset; confirm pending restoration prevents another session. Failed restore must permit retry/start; active sessions must not accept restore. Pure transition tests pass; UI rapid-tap/device checks remain pending.

Verification runner integration: full success writes artifacts/verification.json atomically with per-stage results and explicit unvalidated device/provider flags. A separate temporary fixture with missing dependencies produced a failed report after TypeScript and did not run later stages. Report timestamps describe that run only; subsequent edits require revalidation.

Mobile transport cancellation: never-settling fetch and JSON promises release immediately on abort; late rejected/results cannot deliver; subsequent conversation retry succeeds. This does not guarantee remote provider computation stops or billing is cancelled. Full exports pass.
