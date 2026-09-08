# Deployment

## Option 1 — GitHub Pages

This repository is intentionally deployable without a build process.

1. Create a new public GitHub repository.
2. Upload the project files to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch **main** and folder **/(root)**.
6. Save.

## Option 2 — Cloudflare Pages

1. Create/log into a Cloudflare account.
2. Open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the GitHub repository.
4. Framework preset: **None**.
5. Build command: blank.
6. Build output directory: `/`.
7. Deploy.

Cloudflare Pages is a good fit for a static game because static asset requests do not require a backend.

## Saves

Player progress is stored in that player's browser using `localStorage`.

Consequences:
- No database bill.
- No account registration.
- No server-side personal data.
- Clearing browser storage can erase progress.
- Export/import is therefore included.

A future optional account/cloud-save system would require a backend and a privacy/security design.
