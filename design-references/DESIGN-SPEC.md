# Healthy Me — Design Spec

## Vision
The entire app IS a Tamagotchi device. The phone screen shows a pixel art Tamagotchi toy, and the "inner screen" of the device is where all content lives.

## Reference Mockups (by Tina, Mar 27 2026)
- `mockup-town-day.jpg` — Daytime town scene, buildings = app sections (HM Kitchen, Vitamin Shop, Fit Studio, Health Clinic, LADY), character sits on content frame, mochi blobs
- `mockup-city-night.jpg` — Nighttime city skyline with water reflections, purple/pink sky, moon, character on frame, same layout structure
- `mockup-tamagotchi-device.jpg` — Full Tamagotchi device shell: purple body, egg shape, ball chain, yellow button, stars, inner screen with "HEALTHY ME" title + character

## Layout Architecture
```
┌─────────────────────────────┐
│     Ball chain (decorative)  │
│  ┌─────────────────────────┐│
│  │   ╭─────────────────╮   ││ ← Device shell (purple, egg shape)
│  │   │  Town/City BG    │   ││
│  │   │  "HEALTHY ME"    │   ││ ← Inner screen
│  │   │   [Character]    │   ││
│  │   │ ┌─────────────┐  │   ││
│  │   │ │  Content     │  │   ││ ← Scrollable content frame
│  │   │ │  (checklist, │  │   ││
│  │   │ │   food, etc) │  │   ││
│  │   │ └─────────────┘  │   ││
│  │   ╰─────────────────╯   ││
│  │         [●]              ││ ← Yellow button
│  └─────────────────────────┘│
│         Tab Bar              │
└─────────────────────────────┘
```

## Day/Night Cycle
- 6am–6pm: Town scene (daytime, shops, bright colors)
- 6pm–6am: City scene (nighttime, skyline, reflections, stars)
- Auto-switch based on local time

## Character States (positive only)
| User Action | Character State |
|---|---|
| Neutral / default | Sitting, calm |
| All supplements done | Celebrating ✨ |
| Hit protein target | Eating / strong 💪 |
| Logged food | Happy |
| 7-day streak | Level up / new outfit |
| Period week | Cozy / blanket mode |
| Good sleep | Bright & energetic |

## Evolution / Rewards
- Consistency streaks → character levels up
- Level up = new accessories (bow changes, outfit changes, sparkle effects)
- No negative consequences (no "sick" or "dead" states)
- Neutral is the baseline, everything else is positive reinforcement

## Color Palette
- Device shell: Deep purple (#4a1a7a → #7c4dff gradient)
- Inner screen: Pink-to-cyan gradient background
- Stars/sparkles: Yellow (#ffd54f), white, pink
- Character: Lavender hair, pink bow, sparkly eyes (per approved design)

## Typography
- "HEALTHY ME" title: PressStart2P
- All body text: Silkscreen
- Consistent with existing theme.ts

## Buildings → Tabs Mapping
| Building | Tab | Emoji |
|---|---|---|
| HM Kitchen / HM Cafe | Food | 🍽️ |
| Vitamin Shop | Home (supplements) | 💊 |
| Fit Studio | Move | 🏋️ |
| Health Clinic | Health | 🔬 |
| LADY / Dream Club | Skin | 🧴 |

## Phases
### Phase 1 (MVP — current sprint)
- Functional daily logging (supplements, food, mood, symptoms)
- Character as static decoration
- Simple card-based UI

### Phase 2 (Tamagotchi frame)
- Device shell wrapping the app
- Town/city backgrounds inside the screen
- Day/night auto-switch
- Character positioned on frame

### Phase 3 (Living character)
- Character states change based on data
- Streak tracking → evolution
- Accessories/outfit rewards
- Animations (subtle idle, celebrating, eating)

### Phase 4 (Polish)
- Onboarding (pick your pet/character)
- Sound effects (optional, muted by default)
- Mini-games?
- Social sharing (progress screenshots)
