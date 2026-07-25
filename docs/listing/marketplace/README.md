# Marketplace listing media

The images actually attached to the *Mini Sites for Confluence* listing, and how to regenerate them.

| File | Slot on the listing | Required size |
|---|---|---|
| `../logo-144.png` | App details → **App logo** | 144 × 144 |
| `screenshot-1..5-*.png` | Version → **Media** (carousel, one caption each) | 1840 × 900 |
| `hero-960x600.png` | Version → **Highlights** → hero **Banner image** — *unused*: the hero is the YouTube video instead | 960 × 600 |

The hero is the 35s film (voiceover cut) on YouTube: <https://youtu.be/vQfuQDDDXs8> — the Highlights tab
takes a **video id** (`vQfuQDDDXs8`), never an uploaded file.

## Provenance

Every screenshot is a frame of the promo film's per-shot clips (`promo/out/shots/*.mp4`), which are real
captures of the product against the dev stack — no mockups, and no burned-in captions (those exist only in
`final.mp4`). Regenerate the clips with the commands in `promo/README.md`, then:

```bash
F=promo/out/shots ; OUT=docs/listing/marketplace
mid () { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" | awk '{print $1/2}'; }
frame () { ffmpeg -v error -ss "$(mid "$F/$1.mp4")" -i "$F/$1.mp4" -frames:v 1 -y "/tmp/$1.png"; }

frame 17-it-runs ; frame 13-ready ; frame 15-publish ; frame 24-comment ; frame 04-detail-panel

# full-bleed 1:1 crops (no resampling) — content-rich frames can lose 180px vertically
ffmpeg -v error -i /tmp/17-it-runs.png      -vf "crop=1840:900:40:0"   -y $OUT/screenshot-1-live-in-page.png
ffmpeg -v error -i /tmp/24-comment.png      -vf "crop=1840:900:40:150" -y $OUT/screenshot-4-decide-in-place.png
ffmpeg -v error -i /tmp/04-detail-panel.png -vf "crop=1840:900:40:0"   -y $OUT/screenshot-5-any-bundle.png

# modal shots sit on a flat #e8ebf1 field, so padding the sides is invisible and keeps the whole modal
pad () { ffmpeg -v error -i "/tmp/$1.png" -vf \
  "scale=1840:900:force_original_aspect_ratio=decrease:flags=lanczos,pad=1840:900:(ow-iw)/2:(oh-ih)/2:color=0xe8ebf1" -y "$2"; }
pad 13-ready   $OUT/screenshot-2-publish-a-folder.png
pad 15-publish $OUT/screenshot-3-validated-scanned.png

ffmpeg -v error -i /tmp/17-it-runs.png -vf \
  "scale=960:600:force_original_aspect_ratio=decrease:flags=lanczos,pad=960:600:(ow-iw)/2:(oh-ih)/2:color=0xffffff" \
  -y $OUT/hero-960x600.png
```

## Gotcha: edit the *latest* version

Marketplace media and highlights are per **version**. The manage UI's version table listed 3.3.0 as the
newest, but `/rest/2/addons/com.zenuml.confluence.minisite/versions/latest` reported **3.4.0** (build
`3002020`) — and that is the version the public listing renders. Check the REST endpoint for the build
number before editing `…/manage/apps/4169123443/versions/<build>/{media,highlights}`.
