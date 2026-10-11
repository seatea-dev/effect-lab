# Bundled asset credits

Rights verified on 2026-10-09 through Wikimedia Commons file metadata and the linked rights statements. Full images and derived thumbnails are bundled locally. Visitors make no image-service requests.

## Sixth Avenue at dusk

- Creator: Jim Henderson, Jim.henderson on Wikimedia Commons.
- [Original file and CC0 declaration](https://commons.wikimedia.org/wiki/File:980_Sixth_Av_36_Street_dusk_jeh.jpg).
- [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) permits redistribution, modification, and derived thumbnails without permission.
- Bundled urban.jpg, 1920 × 1153. Existing Wikimedia resized JPEG, recompressed without cropping or intentional tonal changes.

## Mae Jemison

- Creator: NASA, official astronaut portrait dated July 1, 1992.
- [Cropped source and public-domain notice](https://commons.wikimedia.org/wiki/File:Mae_Carol_Jemison_(cropped_2).jpg).
- [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) permit factual and informational image use without endorsement. NASA is credited in the gallery. The image is a sample photograph, with no endorsement claim or branding use of NASA insignia.
- Bundled portrait.jpg, 1536 × 1920. The already cropped source was resized and recompressed. No further crop or intentional tonal change.

## Jefferson Memorial at dusk

- Creator: Carol M. Highsmith. Credit: Photographs in the Carol M. Highsmith Archive, Library of Congress, Prints and Photographs Division.
- [Source and public-domain notice](https://commons.wikimedia.org/wiki/File:Jefferson_Memorial_dusk_Highsmith.jpg), Library of Congress digital ID highsm.12557.
- [Highsmith collection rights statement](https://www.loc.gov/pictures/collection/highsm/rights.html). Highsmith dedicated the photographs to the public domain; redistribution, modification, and thumbnails are allowed. The selected exterior photograph depicts architecture rather than a separately copyrighted sculpture.
- Bundled architecture.jpg, 1920 × 1540. Resized and recompressed without cropping or intentional tonal changes.

## The Tetons and the Snake River

- Creator: Ansel Adams, 1942, while employed by the United States government.
- [Source and public-domain notice](https://commons.wikimedia.org/wiki/File:Adams_The_Tetons_and_the_Snake_River.jpg).
- [National Archives rights statement](https://www.archives.gov/research/ansel-adams) identifies the 79-AA series as public domain. This photograph is 79-AAG-1, National Archives identifier 519904. It is not in the separately restricted 79-G series. Redistribution, modification, and thumbnails are allowed.
- Bundled nature.jpg, 1920 × 1537. Resized and recompressed without cropping or intentional tonal changes.

## Circles in balance

- Original geometric artwork created for the Imprint project during Ticket 3. No external source.
- Editable source: src/assets/abstract-original.svg. Rasterized with Chrome to abstract.jpg, 1920 × 1440.
- Dedicated under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) for redistribution, modification, and derived thumbnails.

## Derivatives and other assets

Each gallery thumbnail is a separately encoded JPEG with a maximum edge of 160 pixels. Gallery display uses a center crop; the full preview preserves the complete composition. Full samples total 1,838,588 bytes. Thumbnails total 42,303 bytes. Every full sample is below 500 KB and every thumbnail below 25 KB.

Runtime transformations include orientation-aware decoding, opaque #F4F1E8 background compositing, and the visitor's selected effect. Export contains the processed image without metadata or an endorsement claim.

Preset tiles are temporary typographic swatches. Actual preset thumbnails and the complete preset gallery belong to Ticket 8. UI typography uses local system fonts. Lucide React icons use the ISC license. Branding and layout are original to this project.

## Terminal glyph atlas

- Source font: IBM Plex Mono Regular, font release 2.5.0, official repository commit `2f9ba1b`. IBM identifies the font version as IBM Plex Mono V2.5, dated 2026-04-21. Source: [IBM Plex Mono release 2.5.0](https://github.com/IBM/plex/releases/tag/%40ibm%2Fplex-mono%402.5.0) and [Regular TTF at commit 2f9ba1b](https://github.com/IBM/plex/blob/2f9ba1b/packages/plex-mono/fonts/complete/ttf/IBMPlexMono-Regular.ttf).
- Attribution: Copyright 2017 IBM Corp. All rights reserved. Reserved Font Name: Plex.
- License: SIL Open Font License 1.1. The source license is retained at [docs/licenses/IBM-Plex-Mono-OFL-1.1.txt](licenses/IBM-Plex-Mono-OFL-1.1.txt). The font file itself is not bundled.
- The versioned derived asset is `src/assets/terminal-atlas-v1.png`, a 3312 × 720 transparent PNG. It contains 23 glyph tiles at 144 × 240 pixels, a fixed 3:5 width-to-height ratio, and one row for each Ink, Terminal, and Vintage palette. Palette colors match `src/definitions/palettes.ts`.
- The glyph ramp, from least to greatest measured alpha coverage, is ` .,:;irsh23X95ASHG#&MB@`. Chrome rasterized each candidate glyph once at 200 px on a transparent 144 × 240 tile. The generator measured alpha coverage from these canonical masks, sorted the masks by coverage with candidate order breaking ties, then copied each mask's alpha bytes unchanged into all three palette rows. `tests/ascii.test.ts` independently decodes the shipped PNG and verifies ordering, metadata, and matching masks. The metadata tolerance is one alpha level averaged over a tile, or 1/(255 × 144 × 240).
- Regenerate the PNG and TypeScript ramp metadata with `node scripts/generate-ascii-atlas.mjs <IBM-Plex-Mono-Regular.ttf> src/assets/terminal-atlas-v1.png src/effects/asciiAtlas.ts`. The script needs Google Chrome and Playwright available to Node. Set `PLAYWRIGHT_MODULE` to the Playwright module path if it is not locally resolvable. It uses the supplied font file and adds no application dependency.
- Source TTF SHA-256: `7c6fbddca4b700be918f5f6183d9bd4464fa427fe435f0b480d77fe2bb8c5a43`. Atlas SHA-256: `12616a96ef67522f7a9658858a06df9c95f1de578f88d3b8512fe578e5b39117`.
