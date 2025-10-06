# Travel Planner AI

An AI-powered travel itinerary planner app built with Expo, Google Vertex AI, and Google Maps. This app helps users plan amazing trips with detailed day-by-day itineraries, destination information, and real-time travel recommendations.

This project uses universal React Server Components in Expo Router to render native UI on the server and stream it down as part of an AI chat response.

## Features

- **AI-Powered Travel Planning**: Uses Google Vertex AI (Gemini 2.5 Pro) to create personalized travel itineraries
- **Google Maps Integration**: Find points of interest and attractions with Google Maps grounding
- **Real-time Travel Info**: Access up-to-date travel information via Google Search integration
- **Day-by-Day Itineraries**: Get detailed schedules with activities, timings, and locations
- **Destination Insights**: Learn about destinations, best times to visit, and estimated budgets
- [Expo Router](https://docs.expo.dev/router/introduction/) — Universal React framework for native and web
- [AI SDK](https://sdk.vercel.ai/docs) — Uses experimental RSC support with Google Vertex AI

## Prerequisites

Before running this project, you'll need:

1. **Google Cloud Platform Account** with Vertex AI enabled
2. **Google Cloud Project** with the following APIs enabled:
   - Vertex AI API
   - Google Maps Places API (for location features)

## Setup

### 1. Google Vertex AI Setup

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Vertex AI API for your project
3. Create a service account with Vertex AI permissions
4. Download the service account JSON credentials file

### 2. Environment Variables

You need to configure the following environment variables in your `.env.local` file. I recommend using [EAS Environment Variables](https://docs.expo.dev/eas/using-environment-variables/#create-environment-variables) to securely store them.

**Required for Google Vertex AI:**
- `GOOGLE_VERTEX_PROJECT` — Your Google Cloud project ID
- `GOOGLE_VERTEX_LOCATION` — The region for Vertex AI (e.g., `us-central1`)
- `GOOGLE_APPLICATION_CREDENTIALS` — Path to your service account JSON file (Node.js runtime)

**OR for Edge runtime:**
- `GOOGLE_CLIENT_EMAIL` — Client email from service account JSON
- `GOOGLE_PRIVATE_KEY` — Private key from service account JSON  
- `GOOGLE_PRIVATE_KEY_ID` — Private key ID (optional)

**Optional APIs:**
- `GOOGLE_MAPS_API_KEY` — [Google Maps API](https://console.cloud.google.com/google/maps-apis/home) for fetching locations (server-side)
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — [Google Maps JavaScript API](https://console.cloud.google.com/google/maps-apis/home) for web maps
- `EXPO_PUBLIC_GOOGLE_MAP_ID` — Google Map ID for advanced map features

### 3. Install Dependencies

```bash
npm install --legacy-peer-deps
```

## Development

Install the project dependencies and run `npx expo` to see the project. This project can be opened in Expo Go, development builds, and in the web—no Xcode needed!

# Deployment

> Expo RSC is still in developer preview and subject to breaking changes! Production deployment is not officially supported yet.

Ensure the environment variables are all configured, check the `.env` file for a template. Set the environment variables in your EAS project dashboard.

## Web

> `npx expo export -p web` and `eas deploy`

The `ai` package needs to be patched manually in the package.json to support the SSR-pass. Add `"require"` field and set it to the client file (`import` field) in the `./rsc` specifier:

```json
    "./rsc": {
      "types": "./rsc/dist/index.d.ts",
      "react-server": "./rsc/dist/rsc-server.mjs",
      "import": "./rsc/dist/rsc-client.mjs",
      "require": "./rsc/dist/rsc-client.mjs"
    },
```

You'll then hit `Error: Could not find file in server action manifest:` which means you need to bundle with latest Expo CLI.

You can test locally with `npx expo serve`.

## iOS

### Testing release iOS build locally

Since the hosted environment is a bit different to the local one, it's useful to have a sanity test on the local build first.

1. `npx expo export -p ios` and `npx expo serve`
2. Set the generated origin in the `app.json`'s `origin` field. Ensure no generated value is in `expo.extra.router.origin`. This should be `https://localhost:8081` (assuming `npx expo serve` is running on the default port).
3. Build the app in release mode on to a simulator: `EXPO_NO_DEPLOY=1 npx expo run:ios --configuration Release`
4. Open [Proxyman](https://proxyman.com/) to inspect network traffic.

Using the latest Expo CLI, you can also test the release production build with the host:

1. `eas deploy` -> put URL in the origin field.
2. `npx expo run:ios --unstable-rebundle --configuration Release` -- This will quickly rebuild the existing native iOS app with different JS and assets.
3. **Results:** The app should launch with URL set to the production origin.

You will want to make a clean build before sending to the store.

### Full iOS deployment

This will require the following:

1. Ensure hosting is setup for the project by deploying once locally first. `npx expo export -p web && eas deploy`
2. Set the `EXPO_UNSTABLE_DEPLOY_SERVER=1` environment variable in your `.env`. This will be used to deploy and link the server during EAS Build.
3. Ensure all the environment variables are set in the EAS project dashboard.
4. Ensure the `origin` field is **NOT** set in the `app.json` or in the `expo.extra.router.origin` field. Also ensure you aren't using `app.config.js` as this is not supported with automatically linked deployments yet.

Then run `eas build --platform ios -s` to build the app and deploy a versioned a server.

## Known Issues

- `react-server-dom-webpack` must be patched for native to work because Hermes doesn't support promises correctly.
- The deterministic module IDs are not the same across machines, meaning a publish from your local computer will not match a client build from EAS Build.
- The `origin` field is a bit pesky to keep track of. This is a WIP.
- The `ai` package needs to be patched manually in the package.json to support the SSR-pass. Add `"require"` field and set it to the client file (`import` field) in the `./rsc` specifier.
- A number of fixes may be landed on main and not in the latest release. You may need to build Expo CLI from source.
