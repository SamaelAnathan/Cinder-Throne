# Cinder Throne: Sector Command

**Cinder Throne** is an original, open-source gothic far-future incremental strategy game for the browser.

The player builds a war economy, raises armies, develops a void fleet, researches increasingly dangerous technology, suppresses sector threats and translates from campaign to campaign. Campaign resets generate persistent **Legacy**, which is spent on permanent **Doctrine** upgrades.

## Play locally

No install is required.

1. Download or clone the repository.
2. Open `index.html` in a modern browser.

The game is static HTML/CSS/JavaScript and does not require a server, database, account system or paid hosting.

## v0.2.1 balance patch

The early-game economy now has small baseline Alloy and Archive Data flows, the first Ash Levy does not require Authority to recruit, and new campaigns begin with a starter Ash Levy. This removes the circular resource locks found during the first public test.

## Current systems

- Six resources.
- Industry, ground forces and fleet production groups.
- Units that can produce resources **or other units**.
- Exponential purchase costs and batch purchasing.
- Sixteen research nodes with prerequisites.
- Eight campaign sectors.
- Dynamic hostile threat escalation.
- Suppression operations.
- Ground and fleet combat power.
- Campaign reset / prestige progression.
- Six persistent Doctrine tracks.
- Eight achievements.
- Local autosave every 30 seconds.
- Export/import save strings.
- Up to eight hours of offline progression.
- Optional auto-quartermaster.
- Responsive desktop/mobile UI.

## Public-release position

This project deliberately uses an **original setting**. It does not contain third-party franchise logos, names, characters, factions, artwork, music, fonts or copied game assets.

The design is inspired by the general incremental-game genre and by the production/research/world/prestige concepts found in **IdleAnt / IdleAnt2** by scorzy. IdleAnt is MIT-licensed. Cinder Throne is a new implementation rather than a repackaged copy.

See `THIRD_PARTY_NOTICES.md`.

## GitHub Pages

Because the project has no build step, GitHub Pages can publish it directly.

Repository → **Settings** → **Pages** → **Deploy from a branch** → choose `main` and `/ (root)` → **Save**.

The site will then be available from your GitHub Pages project URL.

## Cloudflare Pages

Cloudflare Pages is also suitable and is recommended if the public player count grows.

Connect the GitHub repository to Cloudflare Pages and use:

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `/`

## Development

The project intentionally uses vanilla JavaScript in the public alpha so contributors can inspect and change it with no framework toolchain.

Game balancing/content lives in `game-data.js`.
Game state and mechanics live in `game.js`.
Presentation lives in `styles.css`.

## Roadmap

- Fully generic producer/consumer graph solver.
- Random sector events.
- Enemy archetypes and counter-unit bonuses.
- Officer / commander system.
- Relic inventory and equipment.
- Multiple playable doctrines/factions.
- New Game+ sector generation.
- Sound and original artwork.
- Accessibility pass.
- Automated balance tests.
- Optional cloud-save backend.
