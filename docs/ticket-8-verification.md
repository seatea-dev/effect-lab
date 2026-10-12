# Ticket 8 verification: preset gallery

## Automated checks

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — 118 tests passed across 13 files.
- `npm run build` — passed. Vite emitted six distinct preset assets under the `/effect-lab/assets/` base path.
- `git diff --check` — passed.
- `npm run generate:preset-thumbnails` — rendered all six images through the production image worker and each preset's final definition. Outputs are 480 × 288 JPEGs, each below 80 KB; combined size is 334,019 bytes. Their SHA-256 hashes are distinct.

## Chrome production preview

Verified with headless Google Chrome 154 and Chrome DevTools Protocol against the Vite production preview at `/effect-lab/` on port 4178. The initial page loaded six thumbnail images from hashed `/effect-lab/assets/` URLs; every image reported `complete`, 480 × 288 natural dimensions, and the initial Vintage Dither card was selected. The fitted urban preview was 1200 × 720.

Applied Terminal, Vintage Dither, Ink, Mosaic, Blueprint, and Newsprint in sequence. Each card became selected, its corresponding effect appeared in the controls, and export returned to the ready state. Changed Terminal's character height and confirmed Modified; Reset Preset restored the value and cleared Modified. Switched from urban to Nature and confirmed Terminal remained selected. Chrome downloaded `The-Tetons-and-the-Snake-River-terminal.png`; the PNG signature was valid and its dimensions were 1920 × 1537 (532,717 bytes).

The captured production view showed the Terminal output and the Nature source selected. The separate Chrome UI connector was unavailable, so this check used headless Chrome/CDP. Chrome emitted a harmless 404 for favicon.ico. All preset images and the worker loaded, all six preset renders completed, and the PNG export succeeded. Reset Effect is covered by the session regression tests; the browser run directly exercised Reset Preset.

## Sol review regression

Sol reproduced the gallery collapse at 1440 × 900 and 1280 × 800. The flex item shrank to zero height while its 932–950 pixels of card content remained clipped. Adding flex: 0 0 auto to .preset-list prevents that shrink. The existing maximum height and vertical overflow keep the cards in a scrollable gallery.

The npm run test:gallery-browser regression starts a production preview and headless Chrome, then uses Chrome DevTools Protocol mouse input to click the cards. It passed at 1440 × 900 (520 px gallery height, 950 px scroll height), 1280 × 800 (464 px, 932 px), and 1100 × 800 (464 px, 932 px). At each size it scrolled to and pointer-clicked all six cards, checked each selected state, and confirmed the selected source stayed unchanged. At 1280 × 800 it also changed Terminal settings, verified Modified, clicked Reset Preset, verified the preset default, clicked Reset Effect, verified effect defaults, switched to Nature, and confirmed Terminal remained selected. Chrome downloaded and validated the 1920 × 1537 PNG export. The regression uses pointer input rather than DOM click calls.

## Coverage and limits

Definition tests check six unique preset IDs, complete effect parameter definitions, nonempty bundled thumbnail URLs, JPEG assets, and an additional test-only preset sharing an existing effect. Session tests apply all six definitions and confirm source preservation and unmodified preset state. Existing session tests cover Modified and the separate reset actions.

Thumbnails are intentionally fixed to the bundled urban sample. They are generated at a shared 5:3 display ratio from the worker's production PNG export and do not update for another source image. No changes were made to effect algorithms, preset values, worker protocol, or export behavior.
