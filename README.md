# @bacons/link-assets

Plugin to link assets to a native project so they can be loaded synchronously.

## Add the package to your npm dependencies

```
yarn add @bacons/link-assets
```

## Usage

```json
{
  "plugins": [
    ["@bacons/link-assets", ["./assets/icon.png", "./assets/font.ttf"]]
  ]
}
```

Then run prebuild to link assets.
