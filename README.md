# Vault Studio Portal · prototype

A clickable, **non-functional** prototype of the Vault Learning Games studio portal, for thinking and for showing
potential studios. All data is example data (`site/data.js`); nothing connects to real builds, players or OpenGameData.

Screens (hash routes): `#overview`, `#games`, `#game.aqualab`, `#register` (5-step wizard; `#register.3` jumps to
"How builds arrive"), `#tests` (release-candidate test run), `#protocols`, `#ogdtests` (OpenGameData integration test),
`#analytics` (play analytics), `#ogd` (OpenGameData research analytics).

Design background: the Vault Studio Portal design doc (draft 2) and fielddaylab/vault-publisher.

## Run locally

```bash
python3 -m http.server 4180 --directory site
```

## Deploy

Runs on `fddatateam` as the Docker container `vault-portal-prototype`, port **8070**, reachable on the campus VPN at
**http://fddatateam:8070** (`128.104.149.145`). Deploy over the VPN:

```bash
./deploy.sh
```

Plain static files (HTML, CSS, vanilla JS, inline SVG charts); no build step, no dependencies.
