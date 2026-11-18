/**
 * Dynatrace App configuration for both deployment variants.
 *
 * The variant comes from `--payload` (exposed by dt-app as DT_APP_PAYLOAD):
 *   - "prod"  (default) -> app id `my.java4shell.detector`
 *   - "debug"           -> app id `my.java4shell.detector.debug`
 * Each variant is a separate app in Dynatrace, so they can be installed side by side.
 *
 * The environment URL comes from DT_APP_ENVIRONMENT_URL so it isn't hard-coded in the repo.
 */

const BASE_APP_ID = 'my.java4shell.detector';
const BASE_APP_NAME = 'Java4Shell Detector';

const variant = (process.env.DT_APP_PAYLOAD ?? 'prod').trim().toLowerCase();
if (variant !== 'prod' && variant !== 'debug') {
  throw new Error(`Unknown app variant "${variant}". Use --payload prod or --payload debug.`);
}
const isDebug = variant === 'debug';

const environmentUrl = process.env.DT_APP_ENVIRONMENT_URL?.trim();
if (!environmentUrl) {
  throw new Error(
    'DT_APP_ENVIRONMENT_URL is not set. Set it to your environment, e.g. https://abc12345.apps.dynatrace.com',
  );
}

const config = {
  environmentUrl,
  app: {
    name: isDebug ? `${BASE_APP_NAME} (debug)` : BASE_APP_NAME,
    version: '0.0.1',
    description: isDebug
      ? 'DEBUG build: unoptimized with readable code for troubleshooting'
      : 'Finds Java processes running JDK versions affected by Java4Shell',
    id: isDebug ? `${BASE_APP_ID}.debug` : BASE_APP_ID,
    icon: './ui/assets/java4shell-logo.svg',
    scopes: [{ name: 'storage:smartscape:read', comment: 'Read process and host nodes from Smartscape' }],
  },
};

export default config;
