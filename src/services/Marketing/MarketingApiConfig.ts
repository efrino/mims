/**
 * Central Marketing API endpoint.
 *
 * Default behaviour follows the current browser host so localhost and
 * production do not require separate hardcoded service URLs. If the Marketing
 * API is hosted elsewhere, set VITE_MARKETING_API_BASE_URL once at build time.
 */
const normalizeBaseUrl = (value: string): string =>
  value.trim().replace(/\/+$/, '');

const configuredBaseUrl = normalizeBaseUrl(
  String(import.meta.env.VITE_MARKETING_API_BASE_URL || '')
);

const runtimeProtocol =
  typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? 'https:'
    : 'http:';

const runtimeHost =
  typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : 'localhost';

export const MARKETING_API_BASE_URL = configuredBaseUrl
  ? configuredBaseUrl
  : `${runtimeProtocol}//${runtimeHost}/majsf_rest_api/api/marketing`;
