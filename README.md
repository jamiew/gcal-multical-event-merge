Google Multi-Calendar Event Merge
=========================

Browser extension for Chrome and Firefox that visually merges the same event on multiple Google Calendars into one event.

Forked from [@hcawn's repo](https://github.com/hcawn/gcal-multical-event-merge), which forked [@imightbeamy's](https://github.com/imightbeamy/gcal-multical-event-merge). This fork adds Firefox support, fixes the blank rows merged events left in month view, and adds tests and a one-command build (`make check`).

## [Install for Chrome](https://chrome.google.com/webstore/detail/cal-merge-for-google-cale/dchpdbljalbfnelbfbgncfidhjoibkah) (upstream version, without this fork's fixes)

![examples](images/examples.jpg)

### Usage

- Add extension to browser
- Refresh Google calendar webpage
- Press extension icon to see settings
	- Toggle enabled status
	- Pick a merge style
	- Set a wildcard (e.g. `busy`) that matches any other event title

### Develop

Needs Node and pnpm. Run `pnpm install` once.

- `make check` runs Biome, web-ext lint, the tests and a build. CI runs the same thing.
- `make test` runs the tests. They load `content.js` into a fake page (jsdom) built to match Google Calendar's real markup, so you can check merging and layout without logging in.
- `make build` makes an unsigned zip in `web-ext-artifacts/` for Chrome, or for Firefox via "Load Temporary Add-on" in `about:debugging#/runtime/this-firefox`.
- `make firefox` checks, signs an unlisted `.xpi` with Mozilla and opens it in Firefox. Put `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` from [your AMO API keys](https://addons.mozilla.org/en-US/developers/addon/api/key/) in `.env`, and bump `version` in `manifest.json` before each signing.

When Google changes its markup, paste `scripts/dump-calendar.js` into the DevTools console on calendar.google.com. It copies the page structure to your clipboard so you can update `test/helpers.js` to match.
