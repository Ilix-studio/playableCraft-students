# PlayableCraft Students

The student app for PlayableCraft AI, built with Expo (React Native, TypeScript) and NativeWind.

Students join their class with a batch code, open what their school or tutor delivers (simulations, quizzes,
StoryLines, mind maps, Super Notes), take the IQ test, keep notes, and — with their own plan — practise MCQs, build
mind maps, sit timed mock papers and read Super Notes.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the Firebase web config (the same values the website uses)
npx expo start               # a: Android, i: iOS, w: web
```

In development the app talks to the local API server (`npm run server` at the repo root, port 8080). Set
`EXPO_PUBLIC_API_URL` to point it elsewhere. Phone verification at sign-up needs the Firebase values; Google
sign-in also needs OAuth client IDs (see `.env.example`).

## Check it

```bash
npx tsc --noEmit
npx eslint src
```

Engineering notes for working on the code are in `CLAUDE.md`.
