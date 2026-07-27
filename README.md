# Personal Shortlink

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRiyoway%2FShortlink&project-name=personal-shortlink&repository-name=personal-shortlink&env=ADMIN_USERNAME,ADMIN_PASSWORD,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN&envDescription=Admin%20credentials%20and%20an%20Upstash%20Redis%20REST%20database%20are%20required.&envLink=https%3A%2F%2Fupstash.com%2Fdocs%2Fredis%2Fhowto%2Fvercelintegration)

A tiny open-source shortlink service for your own domain. Anyone can visit the short URLs, but creating, listing, and deleting links requires your admin password.

This project is designed for Vercel Serverless Functions + Upstash Redis so it can run cheaply with very little infrastructure.

## Features

- Public redirects like `https://link.riyo.me/asId93`
- Password-protected admin page at `/admin`
- Create, update, list, and delete shortlinks
- Automatic 6-character mixed-case slugs when the slug field is blank
- Visit counts
- No database server to operate

## Setup

Install dependencies:

```bash
npm install
```

Create an Upstash Redis database, then set these environment variables in Vercel:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-long-random-password
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Run locally:

```bash
cp .dev.vars.example .env
npm run dev
```

Edit `.env` first with your local admin password and Upstash credentials.

Deploy:

```bash
vercel --prod
```

Then attach your own domain or subdomain to the Vercel project, for example `link.riyo.me`.

## Usage

Open:

```text
https://link.riyo.me/admin
```

Sign in with your configured admin username and password, then create links such as:

```text
asId93 -> https://github.com/yourname
```

The public shortlink will be:

```text
https://link.riyo.me/asId93
```

## Security Model

- Redirects are public by design.
- Admin pages and APIs use HTTP Basic authentication.
- `ADMIN_PASSWORD` must be configured as a secret, not committed to the repository.
- Slugs are limited to letters, numbers, `_`, and `-`.
- Blank slugs are generated as 6-character strings using `a-z`, `A-Z`, and `0-9`.
- Destinations must be `http://` or `https://` URLs.

## License

MIT
