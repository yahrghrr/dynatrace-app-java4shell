# Getting Started with your Dynatrace App

This project was bootstrapped with Dynatrace App Toolkit.

It uses React in combination with TypeScript, to provide great developer experience.

## Available Scripts

In the project directory, you can run:

### `npm run start`

Runs the app in the development mode. A new browser window with your running app will be automatically opened.

Edit a component file in `ui` and save it. The page will reload when you make changes. You may also see any errors in the console.

### `npm run build`

Builds the app for production to the `dist` folder. It correctly bundles your app in production mode and optimizes the build for the best performance.

## Deployment: production and debug apps

One `app.config.ts` produces two separate Dynatrace apps, chosen with `--payload`:

| Variant | App ID | Command |
|---|---|---|
| Production | `my.dynatrace.app` | `npm run deploy:prod` |
| Debug | `my.dynatrace.app.debug` | `npm run deploy:debug` |

`npm run deploy:all` deploys debug first, then production. `npm run uninstall:prod` and `npm run uninstall:debug` remove each variant.
`npm run package:prod` and `npm run package:debug` build a deployable `.zip` in `out/` without installing it.

### Required environment variables

Never commit these. Set them in your CI secrets or cloud environment settings, or locally in a gitignored `.env` (see `.env.example`):

- `DT_APP_ENVIRONMENT_URL`: e.g. `https://abc12345.apps.dynatrace.com`
- Authentication, one of:
  - `DT_APP_OAUTH_CLIENT_ID` + `DT_APP_OAUTH_CLIENT_SECRET` (OAuth client with `app-engine:apps:install` and `app-engine:apps:run`)
  - `DT_APP_PLATFORM_TOKEN` (platform token with the same scopes)

### `npm run generate:function`

Generates a new serverless function for your app in the `api` folder.

### `npm run update`

Updates @dynatrace-scoped packages to the latest version and applies automatic migrations.

### `npm run info`

Outputs the CLI and environment information.

### `npm run help`

Outputs help for the Dynatrace App Toolkit.

## Learn more

You can find more information on how to use all the features of the new Dynatrace Platform in [Dynatrace Developer](https://dt-url.net/developers).

To learn React, check out the [React documentation](https://reactjs.org/).
