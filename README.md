# turing-test

Reusable Turing test overlay for websites and browser extensions.

`<turing-test>` is a custom element that tracks pointer movement, typing, scrolling, and clicking to estimate whether interaction looks human or automated.

Default palette comes from the original site implementation:

- human: `rgba(23, 184, 106, 0.95)`
- robot: `rgba(255, 48, 48, 0.98)`
- base background reference: `#f7f5ef`

## Install

```bash
npm install turing-test
```

If the unscoped package name is unavailable on npm, publish it under your scope instead, for example `@yourname/turing-test`.

## Use In A Site

```html
<script type="module" src="./turing-test.js"></script>
<turing-test></turing-test>
```

Override state colors with attributes:

```html
<turing-test
  human-color="rgba(23, 184, 106, 0.95)"
  robot-color="rgba(255, 48, 48, 0.98)"
></turing-test>
```

Attributes:

- `achievements`: shows achievement toast notifications
- `human-color`: overrides the human-state accent color
- `robot-color`: overrides the robot-state accent color

Optional achievements UI:

```html
<turing-test achievements></turing-test>
```

## Live State API

`<turing-test>` exposes live state as properties and a DOM event.

Properties:

- `snapshot`
- `state`
- `colorState`
- `humanConfidence`
- `robotConfidence`

Event:

- `turing-test:update`

Example:

```js
const overlay = document.querySelector("turing-test");

overlay.addEventListener("turing-test:update", (event) => {
  console.log(event.detail.state);
  console.log(event.detail.colorState);
  console.log(event.detail.humanConfidence);
});
```

## Debug Component

Use the separate reusable debug component to inspect the current scoring breakdown.

```html
<turing-test id="demoOverlay"></turing-test>
<turing-test-debug for="demoOverlay"></turing-test-debug>
```

The `for` attribute points at the `id` of the overlay element to observe.

## Use From npm

```js
import "turing-test";
```

Then mount the element in your HTML:

```html
<turing-test></turing-test>
```

## Demo

This repo includes a demo page in `index.html`.

```html
<script src="dist/turing-test.js"></script>
<turing-test id="demoOverlay"></turing-test>
<turing-test-debug for="demoOverlay"></turing-test-debug>
```

## Build

```bash
npm run build
```

Build output:

- `dist/turing-test.js`: standalone browser bundle
- `dist/package/*`: npm-oriented package output
- `dist/extension/chrome/*`: Chrome extension files
- `dist/extension/firefox/*`: Firefox extension files

## GitHub Actions

- `build.yml`: builds package and extension artifacts on push and pull request
- `release.yml`: publishes to npm and attaches extension zip files to a GitHub release

To publish from GitHub Actions, set `NPM_TOKEN` in repository secrets.

## License

MIT
