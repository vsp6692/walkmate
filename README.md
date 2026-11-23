# WalkMate
Your walk. Your world. Your companion.

An account-free, open-source Expo / React Native prototype for walking with original fictional AI companions. This is a working development foundation, not a fully validated release of the entire product blueprint.

## Start the app
Use Node **22.13+** and npm. Keep this whole directory structure: the mobile app imports original character files from the repository root.

```sh
cd apps/mobile
npm ci
npm start
```

`npm run web` starts the browser version. On a phone on the same trusted Wi-Fi, use the Expo CLI QR code with a compatible Expo Go version. The project uses Expo SDK 58. Native permission configuration changes require a development build; microphone capture and cleanup must be verified on a real phone. Browser microphone access requires localhost or HTTPS; a plain HTTP LAN browser URL is useful for UI but may not permit recording.

## What works in the implementation
- Maya and Arjun, fictional original companions, with distinct configuration files.
- Companion/activity/place-based palettes; no fixed green theme.
- Free walks or 15–60 minute goals, pause/resume/finish, timer and optional foreground GPS distance with invalid-fix filtering.
- Audio and original illustrated-avatar views sharing a session; no lip sync or photorealistic video.
- Optional coordinate destination with straight-line distance and explicit external OpenStreetMap handoff. No embedded map or walking navigation.
- Four-chapter original offline virtual story, with optional installed-device-voice narration.
- English and experimental Tamil speech previews gated by available voices; adjustable pace, reply length, energy and follow-up questions.
- Per-walk consent to save summary history locally, with erase controls. No stored GPS tracks or transcripts.
- Configurable conversation and Whisper-compatible transcription server, cancellation, text replies, device speech, short microphone clips and editable transcripts.
- Server address remember/forget and health check. Messages require session sharing consent; recording and audio upload require separate actions.

## Connect your own models
See [server setup](apps/server/README.md). Configure an existing local or hosted compatible endpoint and model. Provider keys stay in the server environment. Without configuration, the app still supports walking, preferences, summaries and offline stories. Provider configuration checks do not certify connectivity or output quality.

```sh
cd apps/server
# Copy .env.example to .env and configure your actual providers first.
node --env-file=.env server.mjs
```

The server defaults to loopback and is for development. Do not expose it publicly: it has no user authentication or production rate limiting. For physical-phone testing, deliberately bind a trusted LAN interface and use that computer address in the app. Plain HTTP is unencrypted; use HTTPS for sensitive traffic. No keys are needed for the offline features.

## Optional walk recovery
While a walk is active, explicitly save a recovery point to keep the current elapsed time, distance, companion and activity on this device. Saving again replaces it. From the home/summary screen, restore it paused or erase it. Recovery is a manual snapshot: it excludes subsequent movement and closed-app time, starts a fresh conversation, and does not restore the destination or time challenge. Recovery remains stored until erased, replaced or consumed by restoring, even if the original walk finishes. It is separate from saved history.

## Privacy behavior
Location is used only after foreground permission. Coordinates and destination stay in memory, and are excluded from conversation and history payloads. Saved walk summaries contain date, companion, activity, duration and distance only. Temporary audio is deleted/revoked after upload or cancellation where the platform permits. Crash-time cleanup and native resource release still need device validation. Your configured remote providers may retain submitted text/audio according to their own policies. No background recording is enabled.

## Validation
From `apps/mobile`, with Node 22:

```sh
npm run typecheck
npm run lint
node --experimental-strip-types --test tests/*.test.mjs ../server/tests/*.test.mjs
npx expo export --platform all
```

The tests exercise session timing, GPS filtering, history privacy, conversation validation, HTTP server behavior, cancellation, recording lifecycle, audio focus and preferences. Platform exports compile JS bundles; they are not installed-device tests. No real provider or 20-minute physical-device conversation/walk has been validated. See [build status](docs/BUILD_STATUS.md) for the latest results.

## Remaining work
Full-duplex low-latency voice, hands-free reliability, background audio/GPS, embedded maps and verified routes, long-term memory, lip-synced avatars, multilingual quality validation, community packs and licensed celebrity experiences are unfinished. Tamil remains experimental. Original code is MIT licensed; dependencies retain their own licenses.

## Repeatable checks and source package
From the root, run `npm run verify` for lint, type checking and all tests, or `npm run verify:all` to also export Android/iOS/web. These commands require Node 22.13+ and installed mobile dependencies. Each run atomically updates `artifacts/verification.json` with timestamps, Node version, individual check results, durations and whether platform exports were requested. A failed run replaces the previous success record. The report explicitly leaves device/provider validation false; it describes that run and is not proof that later source edits were tested. `npm run package:source` produces `artifacts/walkmate-source.zip`, preserving shared root files while excluding dependencies, git history, local environment files and builds. This is a source archive, not an installable APK.

## Walking milestones
Outdoor sessions show optional time and distance milestones using the active-session timer and accepted foreground GPS samples. Time excludes pauses; GPS gaps are not reconstructed. Companion encouragement on these cards is original scripted text, not a model response. No counters are sent to an AI provider. Milestones are not route guidance, arrival confirmation or prescribed fitness targets.

## Illustrated companions
Avatar view uses original code-drawn Maya and Arjun portraits with decorative blinking and clothing colors from the selected scenario. Blinking stops while paused, backgrounded, or Reduce Motion is enabled. This is not video or synchronized lip animation; audio and avatar views retain the same session. Device and visual acceptance checks remain pending.

Encouragement can be switched to “Keep it low-key” in setup. Factual milestones remain visible, but scripted encouragement is hidden and the model prompt requests no praise/coaching. “Let me lead” also removes follow-up questions from scripted milestone messages. Real-provider adherence still requires validation.

If outdoor GPS setup stalls, it times out after 20 seconds while the session timer continues. Use Retry GPS to request another foreground watcher without resetting elapsed time or measured distance. This does not enable background tracking or reconstruct missing route segments.
