# WalkMate conversation development server

Node 22.13+. No dependencies or WalkMate account. This is a local development adapter, not a public hosting service.

Copy `.env.example` to `.env` and set a running OpenAI-compatible chat-completions endpoint and model. A local server (for example a separately installed model runtime) needs no hosted key. Hosted keys belong only in this server's environment, never Expo public variables or mobile code.

```sh
cd apps/server
node --env-file=.env server.mjs
```

The default listens only on localhost. Enter `http://localhost:8787` in the app's conversation panel on the same computer. A physical phone needs a reachable private LAN address: deliberately set HOST to your computer's LAN interface address, then enter that address on the phone. Use only a trusted private network. HTTP carries text unencrypted; this development server has no user authentication and must not be exposed publicly. For browser access from LAN also configure WEB_ORIGIN to the exact Expo origin. Native cleartext policies may require a development build or HTTPS.

Conversation sharing requires explicit per-session consent. The app sends only character ID, language and up to 20 text turns, with no GPS coordinates. This server does not persist or log conversation bodies, but your configured provider may retain requests. Interruption aborts the request; work already accepted by a hosted provider may still be billed. Without endpoint/model configuration, the server returns 503. There is no fake AI fallback. STT and hands-free recording are not implemented yet.

GET /health reports provider configuration presence (not connectivity). POST /conversation accepts `{character,language,messages:[{role,content}]}`. Only original bundled character IDs and user/assistant roles are allowed. Input is size limited; upstream errors are sanitized; timeout is 40 seconds. Add authenticated transport, rate limits and deployment-specific protections before hosting.

## Speech transcription adapter
Set `STT_BASE_URL`, `STT_MODEL`, and optional server-only `STT_API_KEY` independently of the conversation provider. The base URL should end before `/audio/transcriptions`. POST `/transcribe?language=en` (or experimental `ta`) with raw audio and its Content-Type. Accepted media types: audio/mp4, audio/m4a, audio/webm, audio/wav, audio/mpeg. Maximum 8 MiB; upstream requests time out after 40 seconds. The adapter forwards a multipart file to a Whisper-compatible endpoint and returns `{text}`. `/health` reports whether transcription configuration is present, not measured recognition quality.

Uploads are held only in request memory and not written to disk or logged. Provider retention is governed by the chosen provider. Do not send audio without explicit recording/upload consent. The mobile conversation panel includes short-clip microphone controls. Record consent and upload consent are separate; transcripts enter a draft for review before LLM submission. Native microphone behavior still requires device validation. Tests use fake provider responses, not real recognition.

Run server tests with Node 22: `node --test apps/server/tests/*.test.mjs` from the repository root.
