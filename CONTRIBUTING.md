# Contributing to Moodring

Thanks for your interest! Moodring is open source under MIT.

## Quick start

```bash
git clone https://github.com/govvy732/moodring
cd moodring
npm install
npm run dev
```

The dev server hot-reloads on file changes.

## Code style

- ESM modules (`type: "module"`)
- 2-space indent
- Pure functions where possible (the `moodEngine.js` file is the canonical example)
- No external AI calls — keep classification deterministic
- x402 spec compliance is a hard requirement — see the [x402 spec](https://www.x402.org)

## Adding a new service

1. Add the service definition in `src/server.js` under `/.well-known/x402`
2. Add the route handler with `x402({ price, description })` middleware
3. Update the smoke test in `test/smoke.mjs`
4. Update the README services table

## Adding a new mood label

1. Add the label to the 9-way mapping in `moodEngine.js > classifyMood`
2. Add an entry in `INTERVENTIONS` (for `mood_ritual`)
3. Add entries in `ROLE_ADVICE` for each agent role (for `mood_oracle`)
4. Update the `MOOD_EMOJI` and `MOOD_COLOR` maps in `public/app.js`

## Filing issues

Open an issue at https://github.com/govvy732/moodring/issues with:

- The service called (`mood_read` / `mood_track` / etc.)
- The request body (truncated if long)
- The response status + body
- The expected vs. actual mood label

## License

By contributing, you agree your contributions will be licensed under MIT.
