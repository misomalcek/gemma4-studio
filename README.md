# gemma4-studio

A small local studio for driving Gemma-4 through the Gemini API — a single
TypeScript server and one HTML page, no framework.

Built while working out what a local-first model setup needed. It is small on
purpose: enough to send a prompt, stream a response, and watch what comes back.

## Running it

```bash
npm install
cp .env.example .env     # then put your own key in it
npm start
```

Open the page it prints. `GEMINI_API_KEY` is read from `.env`, which is
gitignored — the example file shows the shape, never the value.

## Licence

MIT.
