# WalkMate conversation development server

Node 22.13+. No dependencies or WalkMate account. This is a local development adapter, not a public hosting service.

Copy `.env.example` to `.env` and set a running OpenAI-compatible chat-completions endpoint and model. A local server (for example a separately installed model runtime) needs no hosted key. Hosted keys belong only in this server's environment, never Expo public variables or mobile code.

```sh
cd apps/server
node --env-file=.env server.mjs --check
node --env-file=.env server.mjs
```

The default listens only on localhost. Enter `http://localhost:8787` in the app's conversation panel on the same computer. A physical phone needs a reachable private LAN address: deliberately set HOST to your computer's LAN interface address, then enter that address on the phone. Use only a trusted private network. HTTP carries text unencrypted; this development server has no user authentication and must not be exposed publicly. For browser access from LAN also configure WEB_ORIGIN to the exact Expo origin. Native cleartext policies may require a development build or HTTPS.

Conversation sharing requires explicit per-session consent. The app sends only character ID, language and up to 19 recent text turns (nine complete exchanges and the current user message, trimmed further to a 76 KB UTF-8 JSON context budget), with no GPS coordinates. This server does not persist or log conversation bodies, but your configured provider may retain requests. Interruption aborts the request; work already accepted by a hosted provider may still be billed. Without endpoint/model configuration, the server returns 503. There is no fake AI fallback. Short-clip STT is implemented as described below. Continuous hands-free conversation is not implemented.

GET /health reports provider configuration presence (not connectivity). POST /conversation accepts `{character,language,messages:[{role,content}]}`. Only original bundled character IDs and user/assistant roles are allowed. Input is size limited; upstream errors are sanitized; timeout is 40 seconds. Add authenticated transport, rate limits and deployment-specific protections before hosting.

## Speech transcription adapter
Set `STT_BASE_URL`, `STT_MODEL`, and optional server-only `STT_API_KEY` independently of the conversation provider. The base URL should end before `/audio/transcriptions`. POST `/transcribe?language=en` (or experimental `ta`) with raw audio and its Content-Type. Accepted media types: audio/mp4, audio/m4a, audio/webm, audio/wav, audio/mpeg. Maximum 8 MiB; upstream requests time out after 40 seconds. The adapter forwards a multipart file to a Whisper-compatible endpoint and returns `{text}`. `/health` reports whether transcription configuration is present, not measured recognition quality.

Uploads are held only in request memory and not written to disk or logged. Provider retention is governed by the chosen provider. Do not send audio without explicit recording/upload consent. The mobile conversation panel includes short-clip microphone controls. Record consent and upload consent are separate; transcripts appear in a separate review card and require an explicit Add action to append to the typed draft before LLM submission. Native microphone behavior still requires device validation. Tests use fake provider responses, not real recognition.

Run server tests with Node 22: `node --test apps/server/tests/*.test.mjs` from the repository root.

## Phase 1: first spoken conversation

1. Configure the conversation endpoint/model and, for microphone input, the independent transcription endpoint/model in the server environment. No provider is bundled or downloaded automatically.
2. Start the adapter, then start the mobile app. The web development origin defaults to `http://localhost:8082`. A phone must use a reachable private computer address, not its own localhost.
3. Pick Maya or Arjun, choose English, and preview an installed device voice. Start a session.
4. Enter the adapter address and check its connection. Configure the conversation provider before enabling chat. Health only checks configuration presence; it does not call or validate your model.
5. Allow this session's messages, send a short greeting and listen to the reply. Without an installed matching voice the reply remains text.
6. For microphone input, record a short clip, explicitly upload for transcription, review the transcript, add it to the draft and send. Test interrupt, pause/resume and disconnect/erase.

Phase 1 is accepted only after this succeeds on an actual Android device with real providers. Automated tests use controlled responses and do not establish speech quality or native recording reliability.

The mobile microphone checks `acceptedLanguageHints` from `/health` before recording. A configured transcription provider without an explicit selected-language hint is blocked with a text-input fallback. Accepted hints are routing/configuration information only; `languageQualityVerified:false` remains the honest default. Unknown UI languages are rejected instead of falling back to Tamil.

Conversation and transcription provider JSON responses are capped at 128 KiB. Streamed responses are bounded before parsing and discarded on cancellation; error bodies are not returned to the app. This protects response handling but does not establish model quality or production hosting readiness.

## Configuration check
`--check` validates configuration and exits without opening a listener or contacting a provider. Output contains configuration-presence booleans only, not model names, URLs or credentials. The example file leaves both providers blank. Configure both BASE_URL and MODEL for each provider you want; API_KEY is optional for local runtimes. Partial settings, the example model placeholder, credential/query-bearing URLs, invalid PORT and non-origin WEB_ORIGIN values fail at startup with a field-specific message. A successful check does not establish provider connectivity or language quality.
