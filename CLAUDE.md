@AGENTS.md

## Deploying from a Claude cloud session

- Node's `fetch` ignores the container's HTTPS proxy by default, so prefix dt-app commands with
  `NODE_USE_ENV_PROXY=1 DT_APP_DISABLE_TELEMETRY=1` (telemetry goes to a host the network policy blocks).
- Required environment variables (set in the cloud environment, never committed):
  `DT_APP_ENVIRONMENT_URL`, `DT_APP_OAUTH_CLIENT_ID`, `DT_APP_OAUTH_CLIENT_SECRET`.
- Allowed hosts needed: the environment host (`rha75589.apps.dynatrace.com`) and `sso.dynatrace.com`.
- Deploy: `NODE_USE_ENV_PROXY=1 DT_APP_DISABLE_TELEMETRY=1 npm run deploy:debug` then `... npm run deploy:prod`.
