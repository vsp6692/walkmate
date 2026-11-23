function provider(env, prefix) {
  const base = (env[`${prefix}_BASE_URL`] ?? '').trim();
  const model = (env[`${prefix}_MODEL`] ?? '').trim();
  const apiKey = (env[`${prefix}_API_KEY`] ?? '').trim();
  if (!base && !model && !apiKey) return {};
  if (!base || !model) throw new Error(`${prefix}_BASE_URL and ${prefix}_MODEL must both be set.`);
  if (model === 'your-installed-model') throw new Error(`${prefix}_MODEL still contains the example placeholder.`);
  let url;
  try { url = new URL(base); } catch { throw new Error(`${prefix}_BASE_URL must be a complete HTTP(S) URL.`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
    throw new Error(`${prefix}_BASE_URL must use HTTP(S) without credentials, query tokens or fragments.`);
  if (/[\r\n]/.test(apiKey)) throw new Error(`${prefix}_API_KEY must be a single line.`);
  return {baseUrl: url.toString().replace(/\/+$/, ''), model, apiKey};
}
export function serverConfig(env) {
  const portText = (env.PORT ?? '8787').trim();
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be an integer from 1 to 65535.');
  const host = (env.HOST ?? '127.0.0.1').trim();
  if (!host || /[\s/@?#]/.test(host)) throw new Error('HOST must be a hostname or interface address, without a URL scheme.');
  const origin = (env.WEB_ORIGIN ?? 'http://localhost:8082').trim();
  let parsed;
  try { parsed = new URL(origin); } catch { throw new Error('WEB_ORIGIN must be a complete HTTP(S) origin.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/')
    throw new Error('WEB_ORIGIN must contain only an HTTP(S) scheme, hostname and optional port.');
  return {port, host, allowedOrigin: parsed.origin, conversation: provider(env, 'LLM'), speech: provider(env, 'STT')};
}
/** Safe diagnostics intentionally exclude URL, model and credential values. */
export function configurationSummary(config) {
  return {
    conversationConfigured: !!config.conversation.baseUrl,
    transcriptionConfigured: !!config.speech.baseUrl,
    providerConnectivityChecked: false,
    languageQualityVerified: false,
  };
}
