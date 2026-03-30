# Healthy Me — Icon Index

> 45 pixel art icons, 64×64px, transparent PNG.
> Generated: 2026-03-30. Method: Hand-crafted pixel art via Python/Pillow (16×16 grid, 4× nearest-neighbor upscale).

---

## P0 — Tab Bar Icons

| File | Replaces | Tab | Description |
|------|----------|-----|-------------|
| `heart.png` | ❤️ | Home | Pixel heart, soft pink fill, darker outline, highlight |
| `plate.png` | 🍽️ | Food | Plate with fork (left) and knife (right), peach/cream |
| `dumbbell.png` | 🏋️ | Move | Dumbbell with two weights and bar, mint green |
| `bottle.png` | 🧴 | Skin | Skincare bottle with label area, lavender |
| `microscope.png` | 🔬 | Health | Microscope with eyepiece, stage, and base, baby blue |
| `health-monitor.png` | 🔬 | Health (alt) | Clipboard with ECG line and heart, baby blue (alternative) |

## P1 — Supplement Icons

| File | Replaces | Description |
|------|----------|-------------|
| `pill.png` | 💊 | Horizontal capsule, half lavender half white |
| `powder-scoop.png` | — | Scoop with powder mound, cream/peach (Ovasitol) |
| `softgel.png` | — | Golden oval softgel with center seam (Omega-3) |
| `gummy.png` | — | Pink gummy bear with face, kawaii style (BionerLab) |

## P2 — Food/Meal Icons

| File | Replaces | Description |
|------|----------|-------------|
| `breakfast.png` | 🌅 | Toast slice + fried egg, warm tones |
| `lunchbox.png` | 🌞 | Pink bento box with divider, rice ball + veggies |
| `dinner.png` | 🌆 | Round plate with food and garnish, cream/peach |
| `snack.png` | 🍿 | Chocolate chip cookie, warm brown tones |
| `camera.png` | 📷 | Camera with lens and flash, lavender body |

## P3 — UI Elements

| File | Replaces | Description |
|------|----------|-------------|
| `gear.png` | ⚙️ | Settings gear with center hole, gray/purple |
| `calendar.png` | 📅 | Calendar page with rings, purple header, pink highlight |
| `star.png` | ⭐ | 5-point star, golden yellow (streaks) |
| `trophy.png` | 🏆 | Trophy cup with handles, star detail, golden (achievements) |
| `ring.png` | 💍 | Circle ring, soft purple (Oura ring) |

## Additional Icons

| File | Replaces | Description |
|------|----------|-------------|
| `sun.png` | ☀️ | Sun with 8 rays, yellow (morning supplements) |
| `moon.png` | 🌙 | Crescent moon with stars, cream/yellow (evening supplements) |
| `notepad.png` | 📝 | Spiral notepad with lines and pencil (daily check-in) |
| `flame.png` | 🔥 | Flame with inner glow, orange/yellow (calories) |
| `blood-drop.png` | 🩸 | Teardrop shape, red/pink (period tracker) |
| `scale.png` | ⚖️ | Balance scale with two pans, baby blue (weight) |
| `warning.png` | ⚠️ | Yellow warning triangle with exclamation (triggers) |
| `lightning.png` | ⚡ | Lightning bolt, yellow (adrenal/energy) |
| `flexed-arm.png` | 💪 | Flexed bicep, peach (protein goal) |
| `sparkle.png` | ✨ | 4-point sparkle with small dots (magic link) |
| `envelope.png` | 💌 | Envelope with heart, white/pink (email sent) |
| `info.png` | ℹ️ | Info circle with "i", baby blue (tips) |
| `hourglass.png` | ⏳ | Hourglass with sand, lavender frame (pending) |
| `lightbulb.png` | 💡 | Lightbulb with glow, yellow (AI insights) |
| `party.png` | 🎉 | Party popper with confetti (celebration) |

## Mood Faces (5 levels)

| File | Replaces | Description |
|------|----------|-------------|
| `mood-1-crying.png` | 😢 | Blue circle face, tears, sad mouth |
| `mood-2-sad.png` | 😕 | Lavender circle face, frown |
| `mood-3-neutral.png` | 😐 | Cream circle face, straight mouth |
| `mood-4-happy.png` | 🙂 | Pink circle face, smile |
| `mood-5-great.png` | 😊 | Mint circle face, wide smile, blush |

## Energy Icons (5 levels)

| File | Replaces | Description |
|------|----------|-------------|
| `energy-1-empty.png` | 🪫 | Horizontal battery, red sliver (1 bar) |
| `energy-2-low.png` | 😴 | Horizontal battery, orange (2 bars) |
| `energy-3-medium.png` | 😐 | Horizontal battery, yellow (3 bars) |
| `energy-4-high.png` | ⚡ | Horizontal battery, mint (4 bars) |
| `energy-5-full.png` | 🔋 | Horizontal battery, green + lightning bolt (full) |

---

## Technical Details

- **Source grid**: 16×16 pixels
- **Output size**: 64×64 pixels (4× nearest-neighbor upscale)
- **Format**: PNG with transparency (RGBA)
- **Color palette**: Uses DESIGN-SYSTEM.md theme colors exclusively
- **Outline style**: 1px colored outlines (not black — matches lofi aesthetic)
- **Generation script**: `scripts/generate-icons.py` (main) + `scripts/fix-*.py` (refinements)

## Still Needed (Not Generated)

These icons from ICON-INVENTORY.md were not created because they're best handled as text glyphs or reuse existing icons:

- **Checkmark ✓** — Render via PressStart2P font glyph or simple draw call
- **X mark ✕** — Render via font glyph
- **Arrows ◀▶** — PressStart2P glyphs work well as-is
- **Arrow →** — Text glyph, keep as-is
- **Triangles ▲▼** — Font glyphs for expand/collapse

## Usage in React Native

```tsx
import HeartIcon from '@/assets/images/icons/heart.png';

// In component:
<Image source={HeartIcon} style={{ width: 24, height: 24 }} />

// For tab bar (in navigation config):
tabBarIcon: ({ focused }) => (
  <Image 
    source={require('@/assets/images/icons/heart.png')} 
    style={{ width: 22, height: 22, opacity: focused ? 1 : 0.5 }}
  />
)
```
