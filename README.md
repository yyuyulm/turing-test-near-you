# turing-test

Reusable Turing test overlay for websites and browser extensions.

`<turing-test>` is a custom element that tracks pointer movement, typing, scrolling, and clicking to estimate whether interaction looks human or automated.

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

Optional UI features:

```html
<turing-test debug achievements></turing-test>
```

Attributes:

- `debug`: shows the debug panel and confidence override controls
- `achievements`: shows achievement toast notifications

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
<script type="module" src="./turing-test.js"></script>
<turing-test debug achievements></turing-test>
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
