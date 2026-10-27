# DevPulse — Developer Intelligence Dashboard

Experience Yourself at : https://devpulse-hz9p.vercel.app

DevPulse combines three developer ecosystems in one responsive dashboard:

- **GitHub REST API** — discover repositories by stars, language, and search query.
- **Hacker News API** — explore top, new, and best stories with scores and comment counts.
- **Dev.to API** — browse community articles and filter by topic.

The Overview page creates a lightweight daily briefing from actual popularity signals in the fetched data. It does not claim these signals are objective measures of quality.

## Requirements

- Node.js 20 or newer recommended
- npm
- Optional Neon PostgreSQL database
- Optional GitHub personal access token (only needed if you want authenticated API rate limits)

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, create the environment file with `Copy-Item .env.example .env` instead of `cp` if needed. Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The Express API runs on port 3001.

The three public data feeds work without API keys. The backend proxies requests, normalizes responses, and caches them briefly to reduce repeated calls. If you add a GitHub token, set `GITHUB_TOKEN` in `.env`; it stays on the server and is never sent to the browser.

## Optional Neon persistence

1. Create a project at [Neon](https://console.neon.tech/).
2. Copy the connection string from the Neon dashboard.
3. Put it in `.env` as `DATABASE_URL=...`.
4. Restart the server.

The app creates a `devpulse_saved` table on first use. Saved items are stored in Neon when configured; otherwise the reading list is available for the current browser session only. The API uses parameterized Neon queries. For a public production deployment, add authentication and per-user ownership checks before exposing persistent saved-item endpoints to multiple users.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | No | Optional server-side GitHub authentication to improve rate limits. |
| `DATABASE_URL` | No | Neon PostgreSQL connection string for persistent saved items. |
| `PORT` | No | Express server port; defaults to `3001`. |
| `CLIENT_ORIGIN` | No | Allowed browser origin for local CORS; defaults to `http://localhost:5173`. |

Never commit `.env` or expose `GITHUB_TOKEN` / `DATABASE_URL` in frontend code. `.env` is excluded by `.gitignore`.

## Build and run

```bash
npm run build
npm start
```

The production server serves the built frontend from `dist` and API routes from `/api`. Build first before running `npm start`.

## APIs

- GitHub: https://docs.github.com/en/rest
- Hacker News: https://github.com/HackerNews/API
- Dev.to: https://developers.forem.com/api
- Neon: https://neon.tech/docs

## Hackathon submission checklist

- [ ] Push the source repository to GitHub.
- [ ] Deploy the application and test it from a clean browser.
- [ ] Add the deployed URL and setup instructions to this README.
- [ ] Record a short YouTube demo showing all three live integrations.
- [ ] Configure Neon and capture the required evidence if required by the organizers.
- [ ] Follow organizer instructions if a Surprise API is announced.
