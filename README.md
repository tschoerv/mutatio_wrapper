# MUTATIO FLIES

Static MUTATIO FLIES website containing the wrapper, merch interface, and art gallery.

## Routes

- `/` — wrapper
- `/merch` — patches
- `/art` — gallery

The frontend is fully static. Gallery data and media come from the separate API at `api.mutatioflies.com`; the bot, database, media storage, and private studio are not part of this repository.

## Local development

Requires Node.js 22.13 or newer.

```text
npm ci
npm run dev
```

Open the local URL printed by the development server.

## Verification

```text
npm test
```

The static output is written to `static-site/`.

## Production configuration

Set these variables before building:

```text
NEXT_PUBLIC_SITE_ORIGIN=https://your-production-domain.example
NEXT_PUBLIC_BOT_ORIGIN=https://api.mutatioflies.com
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your-browser-key
```

`NEXT_PUBLIC_BASE_RPC_URL` is included in the browser bundle. Restrict the Alchemy key to the production domain and only the required Base methods.

See [DEPLOYMENT.md](DEPLOYMENT.md) for generic static-host deployment settings.
