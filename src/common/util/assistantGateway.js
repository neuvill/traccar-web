const DEFAULT_AI_GATEWAY_BASE_URL = 'https://ai.hmglobtech.com';
const ASSISTANT_TOKEN_TTL_MS = 5 * 60 * 1000;

export const getAiGatewayBaseUrl = () => {
  if (import.meta.env.DEV) {
    return '/api/ai';
  }
  const configuredBaseUrl = import.meta.env.VITE_AI_GATEWAY_BASE_URL || DEFAULT_AI_GATEWAY_BASE_URL;
  return configuredBaseUrl.replace(/\/$/, '');
};

export const getAiGatewayChatUrl = () => `${getAiGatewayBaseUrl()}/chat`;

export const getAiGatewayAuthContextUrl = () => `${getAiGatewayBaseUrl()}/auth/context`;

const getAssistantTokenExpiration = () => new Date(Date.now() + ASSISTANT_TOKEN_TTL_MS).toISOString();

const getTraccarSessionToken = async (signal) => {
  const response = await fetch('/api/session/token', {
    method: 'POST',
    body: new URLSearchParams(`expiration=${getAssistantTokenExpiration()}`),
    signal,
  });

  if (!response.ok) {
    throw new Error((await response.text()) || 'Unable to create Traccar session token');
  }

  return response.text();
};

const mergeHeaders = (headers, token) => {
  const resolvedHeaders = new Headers(headers);
  resolvedHeaders.set('X-Traccar-Token', token);
  return resolvedHeaders;
};

export const fetchAiGateway = async (path, init = {}) => {
  const token = await getTraccarSessionToken(init.signal);
  const targetUrl = `${getAiGatewayBaseUrl()}${path}`;

  return fetch(targetUrl, {
    ...init,
    headers: mergeHeaders(init.headers, token),
  });
};

export const fetchAiGatewayAuthContext = async (signal) => {
  const response = await fetchAiGateway('/auth/context', {
    method: 'GET',
    signal,
  });

  const contentType = response.headers.get('content-type') || '';
  return {
    status: response.status,
    ok: response.ok,
    payload: contentType.includes('application/json') ? await response.json() : await response.text(),
  };
};

export const buildAiGatewayChatRequest = ({ message }) => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message }),
});
