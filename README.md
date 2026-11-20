# Hunter System

An RPG-style self-improvement app for iOS and Android. You level up three areas of life, **Body**, **Mind** and **Wealth**, by clearing a Daily Quest, taking on one-off Quests and long-term Gates, and earning titles. Miss a day and the System issues a Penalty Trial.

A short Player Assessment (body stats, goals, equipment, time, money goal) builds the program: calorie and protein targets, a strength split, step goals and daily habits. A weekly weigh-in adjusts it to your progress.

Built with Expo (SDK 58, Expo Router, TypeScript). All data stays on the phone.

> **Not medical advice.** The calorie, protein and training targets are general estimates. Check with a doctor before starting a new diet or training program.

## Run it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. On your computer, with [Node.js](https://nodejs.org) (LTS) installed:
   ```bash
   npm install
   npx expo start
   ```
3. Scan the QR code: with the Camera app on iPhone, or from inside Expo Go on Android. Phone and computer need to be on the same Wi-Fi. If they can't be, run `npx expo start --tunnel`.

On first launch the System asks for your name, then runs the Player Assessment.

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # program engine and game rules (node:test via tsx)
npx expo export --platform android   # confirms the app bundles
```

## Layout

| Path | What it is |
| --- | --- |
| `src/engine/` | Pure TypeScript game rules: leveling, titles, the assessment → program engine, penalties, weekly recalibration. No React Native imports, so it can move to a server unchanged. |
| `src/engine/engine.test.ts` | Tests, using a sample 180 cm / 120 kg profile. |
| `src/store/` | Game state in React context, saved to on-device SQLite (`expo-sqlite/kv-store`). Daily reminders via `expo-notifications`. |
| `src/ui/` | The System look: windows, bars, pills, overlays, weight chart. |
| `src/app/` | Screens (Expo Router): Status, Daily, Quests, Gates, System tabs, plus the assessment. |
| `web-prototype/index.html` | The original single-file web version. Open it in a browser; it saves progress in that browser. |

Every action is a function `(state, ctx) => void` from `src/engine/game.ts`, run through `run()`. `run()` copies the state, applies the action, checks titles and level-ups, and returns the events (toasts and System notices) the UI shows.

## Roadmap

1. **Apple Health / Health Connect.** Read steps and weight to tick off the step goal and pre-fill the weekly weigh-in. Needs a development build (`npx expo run:ios` or `eas build --profile development`), because Expo Go can't load those native modules.
2. **Home-screen widget** with today's goal count and time left until midnight.
3. **Accounts and sync.** Store each player's state on a server and keep the on-device copy as the offline cache.
4. **Store release:**
   - Imperial units and more languages.
   - An onboarding flow that explains the rules.
   - App Store and Google Play listings via `eas submit`.
   - A professional review of the health wording.

## License

Copyright © 2026. All rights reserved. The source is public to read; it is not licensed for reuse.
