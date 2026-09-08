# Crusade Engine — Grimdark Idle Prototype

A small browser-based idle/incremental strategy prototype built to demonstrate how the core systems of **IdleAnt2** can be reinterpreted as a far-future gothic war game.

## Run

Open `index.html` in a modern browser. No installation or server is required.

## Included systems

- Multiple resources with per-second production and consumption.
- Unit groups: Forces and Industry.
- Exponential purchase costs.
- Research prerequisites and unlock chains.
- World/sector modifiers and campaign objectives.
- Prestige-style sector resets.
- Persistent Legacy/Doctrine upgrades.
- LocalStorage autosave.
- Up to 8 hours of simplified offline progress.
- Optional auto-purchasing after research unlock.
- Responsive desktop/mobile interface.

## Theme

The prototype deliberately uses **original** names and assets. It evokes grimdark far-future military science fiction without including Games Workshop logos, art, named characters, faction insignia or copied Warhammer 40,000 assets.

For a private fan build, the terminology can be changed easily. For public or commercial distribution, an original setting is the safer route.

## IdleAnt2 reference

IdleAnt2 by scorzy:
https://github.com/scorzy/IdleAnt2

IdleAnt2 is released under the MIT licence. This prototype is a new implementation inspired by its production-graph, research, world and prestige structure; it does not bundle IdleAnt2 artwork.

## Good next steps

1. Replace the simplified one-layer production maths with a fully generic graph solver.
2. Move balancing data into JSON files.
3. Add 30–50 research nodes.
4. Add campaign events, hostile maluses and counter-units.
5. Add unit specialisation, squad leaders and relics.
6. Add a proper import-save function alongside export.
7. Add audio, original iconography and background illustrations.
8. Convert to TypeScript + React/Vue/Svelte or modern Angular if the project is intended to grow substantially.
