# Deployment

## Build

Use Node.js 22.13 or newer.

```text
npm ci
npm run build
```

The generated static website is written to `static-site/`. Configure the hosting provider to publish that directory.

## Environment

Set these variables in the build environment:

```text
NEXT_PUBLIC_SITE_ORIGIN=https://your-production-domain.example
NEXT_PUBLIC_BOT_ORIGIN=https://api.mutatioflies.com
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your-restricted-browser-key
```

All three variables are build-time public configuration. Do not put private credentials in them.

## Routes

The host must serve these extensionless routes from the matching generated HTML files:

```text
/
/merch
/art
```

The frontend is static. The API, media storage, database, bot scheduler, and private studio are deployed separately.
