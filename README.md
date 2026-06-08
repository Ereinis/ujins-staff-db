# Ujina Staff Database

Ujina Staff Database is a GitHub-only Discord staff viewer. A GitHub Actions workflow uses a Discord bot token stored in repository secrets to refresh `data/staff.json`, and the static website reads that file from GitHub Pages.

The website is view-only. Staff data is auto-generated from Discord roles and should not be edited by hand.

## How It Works

1. GitHub Actions runs `scripts/update-staff.mjs` on a schedule or manual trigger.
2. The script fetches members from Discord server `1446923448822665380`.
3. Members with one of the configured staff roles are written to `data/staff.json`.
4. The static website lets authorized Discord users view and filter the staff table.

## Important Privacy Note

This project uses GitHub only and does not include a backend server or online database. Because GitHub Pages serves static files, browser login can hide the interface, but it cannot fully protect `data/staff.json` if the repository or Pages site is public.

For a private staff database, keep the repository private and use GitHub Pages access controls available to your GitHub plan, or add a backend later.

## Discord Setup

Create a Discord application and bot, then invite the bot to the server with permission to read members.

The bot also needs access to server members. In the Discord Developer Portal, enable the required privileged member intent for the bot if Discord asks for it.

## Website Config

Open `js/config.js` and replace:

```js
export const DISCORD_CLIENT_ID = "REPLACE_WITH_DISCORD_CLIENT_ID";
```

with your Discord application client ID. This value is public and is safe to include in a static website.

## GitHub Repository Secrets

Add these repository secrets:

- `DISCORD_BOT_TOKEN`: Bot token used by GitHub Actions to fetch the staff list.

## GitHub Pages

Publish the repository root with GitHub Pages.

Then update the OAuth2 redirect in the Discord Developer Portal to match your Pages URL, for example:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPO-NAME/
```

The website automatically uses the current page URL as its redirect URL.

## Local Preview

```bash
npm run serve
```

Open:

```text
http://localhost:4173
```

Local login only works if that exact URL is added as a Discord OAuth2 redirect URI.
