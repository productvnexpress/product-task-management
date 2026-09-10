
# Design System: VnExpress

> 🚨 **QUY TẮC PHÔNG CHỮ BẮT BUỘC (MANDATORY TYPOGRAPHY RULE - PRIORITY #1)**
> 1. **Merriweather (serif):** Dùng cho tiêu đề bài viết (Article Title).
> 2. **Merriweather Sans:** Chỉ nên áp dụng cho các cụm từ ngắn dưới 8 từ (chỉ dẫn UI, button ngắn, nhãn heading ngắn).
> 3. **Arial:** Áp dụng cho tất cả các trường hợp còn lại (nội dung bài viết, sapo, văn bản dài, chú thích ảnh, bảng dữ liệu, disclaimer, câu trả lời AI, v.v.).
> *Yêu cầu áp dụng triệt để, ưu tiên hàng đầu trên toàn bộ ứng dụng và giao diện.*

**Purpose:** This file is the single source of truth for generating new UI modules, widgets, and components in the VnExpress visual language. It is intended for AI design tools (Stitch, coding agents) — not for recreating the VnExpress homepage.

**Strictness:** VnExpress's design system is tightly controlled. Every value below is intentional. Do NOT improvise, interpolate, or invent values outside of what is documented here. When in doubt, choose the more restrained option.

---

## 1. Visual Theme & Atmosphere

VnExpress is a formal, classically-minded system — precise, restrained, and quietly authoritative. If it were a person, it would be a serious man in a well-tailored suit who never raises his voice.

**Aesthetic DNA:** Newspaper-dense, editorially neutral, classically refined. This system prioritizes information density over decorative whitespace. It descends from print newspaper tradition — content is packed tightly, every pixel serves a purpose, and ornamentation is almost entirely absent.

**Three governing principles — all generated UI must obey these:**

**Clarity:** Content is the sole protagonist of every screen. UI elements must never compete with content for attention. All labels and microcopy must describe function and action precisely. Avoid ambiguous wording, clever metaphors, or playful copy.

**Refinement:** Every element must feel deliberate, stable, and visually quiet. No decorative flourishes. No gratuitous animations. No effects that exist to impress rather than inform. Layouts must feel composed and controlled, never jarring.

**Neutral:** The system is a transparent medium for delivering information. It must never editorially influence the reader through visual emphasis, emotional color choices, or suggestive microcopy. No persuasive language. No exclamation marks in UI copy. No adjectives or adverbs in labels.

**Depth & Elevation:** The system is intentionally flat. Do NOT add box-shadows, drop-shadows, or elevation layers to any element. The only permitted shadow in the entire system is the focus ring glow: `0 0 8px rgba(66, 144, 217, 0.5)`, which appears exclusively on keyboard-focused interactive elements. There are no other shadows.

### Do NOT

- Add decorative gradients, glows, or ambient shadows
- Use rounded "friendly" or "playful" geometry — this is not a consumer app aesthetic
- Introduce large empty gaps between content blocks — density is intentional
- Use emoji, decorative icons, or illustrations in UI chrome
- Apply motion/animation beyond a single 100ms state-layer transition on interactive elements
- Use `text-transform: uppercase` or ALL CAPS text anywhere — VnExpress never shouts

---

## 2. Color Palette & Roles

All colors below are the **only** colors permitted. Do NOT create new colors, tint existing ones, or blend between them.

### 2.1 Brand & Accent — Use Sparingly

The accent palette is a deep, muted rose — not a bright pink, not a warm red. Think dried rose petals pressed between the pages of a hardcover book. It appears only on primary actions, brand marks, and selected states. It must never dominate a screen.

| Name | Light | Dark | Role |
|------|-------|------|------|
| Accent Rest | `#b13460` | `#b13460` | Deep Pressed Rose. Primary CTA background, brand identity. Bold weight text. |
| Accent Subdued Surface | `rgba(177, 52, 96, 0.1)` | `rgba(177, 52, 96, 0.2)` | A whisper of rose — barely tinted. Background for secondary accent actions. |
| Accent Bright | `#df4670` | `#df4670` | Vivid Rose. Reserved strictly for live indicators and subscription accents. |
| Accent Text | `#c14872` | `#e68fad` | Muted Rose text (darkens to read on light; softens to blush on dark). |
| Accent Text Strong | `#b13460` | `#db7499` | Full-strength rose text, selected state labels |
| Accent Surface | `#fce6eb` | `#430012` | Faintest blush tint (light) / near-black claret (dark). Accent-area backgrounds. |

**Rule:** Accent color must not appear on more than 2 elements per screen simultaneously (excluding brand logo). If both a primary CTA and a selected state exist, that already consumes the budget.

### 2.2 Support — Secondary Actions

A quiet steel blue — the color of a formal envelope lining. Understated and trustworthy, never attention-seeking. Used for secondary CTAs, badges, and informational links.

| Name | Light | Dark | Role |
|------|-------|------|------|
| Support Rest | `#466fa1` | `#466fa1` | Muted Steel Blue. Secondary CTA background. Bold weight text. |
| Support Text | `#365983` | `#92afd3` | Ink-blue text (light) / softened sky-blue (dark) |
| Support Surface | `#eaf0f8` | `#192c43` | Faintest blue wash (light) / deep navy (dark). Support-area backgrounds. |

### 2.3 Neutral Surfaces — Background Layering

Surfaces stack in a strict hierarchy, each level a barely perceptible step darker than the previous — like sheets of tracing paper laid one atop another. Depth is created through this quiet layering, never through shadows.

| Name | Light | Dark | Role |
|------|-------|------|------|
| Surface 000 | `#ffffff` | `#0d1013` | Clean white canvas (light) / near-black void (dark). The base page. |
| Surface Paper | `#fcfaf6` | `#20242a` | Warm aged-newsprint cream. Editorial warmth. Use for special content areas, subscription modules, featured sections. |
| Surface 100 | `#fafafa` | `#20242a` | Barely-off-white. Input field backgrounds, subtle card fills. |
| Surface 200 | `#f3f3f3` | `#2c2f35` | Cool light grey. Contained button rest, search bars, widget backgrounds. |
| Surface 300 | `#ececec` | `#373b41` | Visible grey. Stronger separation, summary area backgrounds. |

**Seashell palette** — a warm sandy-beige scale (`#fff7f0` through `#a78261`) exists for premium or editorially warm contexts such as subscription panels and special promotional modules. Use sparingly and only when a distinctly warmer tone than Surface Paper is needed.

**Rule:** Surface layering must always go darker as elements are nested. Surface 000 → 100 → 200, never reversed. In dark mode the same nesting logic applies (0d1013 → 20242a → 2c2f35).

### 2.4 Text Hierarchy — Exactly 5 Levels

Five levels of ink, from full-black authority to a faint pencil whisper. Do NOT create intermediate text colors or adjust opacity of these values.

| Name | Light | Dark | Role |
|------|-------|------|------|
| Text Strong | `#000000` | `rgba(255,255,255,0.93)` | Pure black ink. Maximum emphasis. Brand name, critical labels only. |
| Text Regular | `#202020` | `rgba(255,255,255,0.88)` | Near-black. Default body text, article titles, primary content. The workhorse. |
| Text Regular Lighter | `#5f5f5f` | `rgba(255,255,255,0.70)` | Medium grey. Secondary text, most button labels, metadata. Steps back without disappearing. |
| Text Subdued | `#7f7f7f` | `rgba(255,255,255,0.70)` | Quiet grey. Helper text, timestamps, captions. Present but undemanding. |
| Text Subdued Lighter | `#9f9f9f` | `rgba(255,255,255,0.50)` | Faint grey. Placeholder text, disabled hints. Nearly invisible until needed. |

**Article-specific text colors:**

| Name | Light | Dark | Role |
|------|-------|------|------|
| Article Title | `#202020` | `rgba(255,255,255,0.88)` | Headline text |
| Article Lead | `#5f5f5f` | `rgba(255,255,255,0.70)` | Standfirst / summary paragraph |
| Article Paragraph | `#404040` | `rgba(255,255,255,0.81)` | Long-form body text — slightly lighter than regular for reading comfort |

### 2.5 On-Color Text & Icons — For Dark or Colored Backgrounds

When text or icons sit on accent, support, or dark surfaces, use these values exclusively:

| Name | Value | Role |
|------|-------|------|
| On-Color Regular | `rgba(255,255,255,0.88)` | Default text/icon on colored backgrounds |
| On-Color Strong | `rgba(255,255,255,0.93)` | Emphasized text on colored backgrounds |
| On-Color Subdued | `rgba(255,255,255,0.50)` | Secondary text on colored backgrounds |

### 2.6 Semantic Status Colors — 4 Contexts, No Exceptions

Four functional colors — clinical, not decorative. Each behaves like a traffic signal: immediately recognizable, never ambiguous. Each context has a complete set: surface, border, text, and icon. Do NOT mix tokens across contexts (e.g., info border with positive text).

| Context | Surface (Light) | Surface (Dark) | Border | Text (Light) | Text (Dark) |
|---------|----------------|----------------|--------|-------------|------------|
| Info | `#d0eaf9` | `#03517d` | `#0590de` | `#0590de` | `#4cbbed` |
| Positive | `#d5eddc` | `#145b29` | `#24a148` | `#24a148` | `#62c078` |
| Warning | `#fce8da` | `#864b21` | `#ee853b` | `#ee853b` | `#f3a670` |
| Negative | `#f8d4d6` | `#7b1117` | `#da1e28` | `#da1e28` | `#e45b62` |

### 2.7 Link Colors

| Name | Light | Dark | Role |
|------|-------|------|------|
| Link Regular | `#0590de` | `#4cbbed` | Inline text links |
| Link Strong | `#0471ae` | `#b9e0f6` | Link button labels |

### 2.8 Border Colors

| Name | Light | Dark | Role |
|------|-------|------|------|
| Border Subdued Lighter | `#f3f3f3` | `#2c2f35` | Barely visible separation |
| Border Subdued | `#d6d6d6` | `#43464c` | Default borders for ghost buttons, contained-bordered |
| Border Regular | `#9f9f9f` | `#5b5d62` | Input field borders, selected-a state |
| Border Strong | `#5f5f5f` | `#7e8084` | Structural emphasis |
| Border Focus | `#0590de` | `#4cbbed` | Focus ring border — the only glowing border in the system |

---

## 3. Typography Rules

### 3.1 Font Families — Exactly 5 Roles

| Role | Font Family | Fallback | Usage |
|------|-------------|----------|-------|
| Article Titles (primary) | Merriweather | Georgia, serif | **Article titles ONLY.** News headlines and article title displays. Never for UI elements. |
| Article Titles (secondary) | Merriweather Sans | sans-serif | Secondary article headlines, lighter editorial tone |
| UI (headings, labels, microcopy) | Merriweather Sans | sans-serif | ALL non-article UI text: buttons, tabs, labels, helpers, navigation, headings. |
| Body / Article paragraphs | Arial | Helvetica, sans-serif | Long-form reading. Roboto on Android. |
| Numeric data | Roboto Mono | monospace | Prices, statistics, counters, timestamps with numbers. Tabular alignment. |

**Rule:** Merriweather (serif) is exclusively for article title displays. It must NEVER appear on buttons, labels, headings, navigation, tabs, helpers, or any other UI element. All non-article text uses Merriweather Sans. Do NOT substitute with Inter, Helvetica, San Francisco, or system-ui.

### 3.2 Font Sizes — Fixed Scale

All sizes are from this exact scale. Do NOT interpolate between sizes or create new ones.

**Article titles (Merriweather):** 12 / 16 / 20 / 22 / 32px. Line-height: 160%.

**UI headings (Merriweather Sans):** 16 / 18 / 20 / 28px. Weight: bold (700).

**UI labels (Merriweather Sans):** 10 / 12 / 13 / 15 / 17 / 19 / 21px. Weight: regular (400) or bold (700).

**UI helper text (Merriweather Sans):** 10 / 12 / 14px. Weight: regular (400).

**Article paragraphs (Arial):** 14 / 16 / 17 / 18px. Line-height: 140%.

**Numeric (Roboto Mono):** 10 / 12 / 13 / 15 / 17 / 19 / 21px.

### 3.3 Font Weights — Only These Values

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Default for body, labels, helpers, most buttons |
| Medium | 500 | Reserved — rarely used |
| Semi-bold | 600 | Reserved — rarely used |
| Bold | 700 | Headings, accent/support button labels, emphasis |
| Extra-bold | 800 | Reserved — rarely used |
| Black | 900 | Article title maximum emphasis only |

**Rule:** Most UI text is weight 400. Bold (700) is reserved for headings and primary action button labels (accent, support variants only). Do NOT bold body text for emphasis — use text color hierarchy instead.

### 3.4 Line Height

- UI elements (labels, buttons, helpers): exactly `1.5` (unitless)
- Article titles: `160%`
- Article paragraphs: `140%`

### 3.5 Letter Spacing

Always `0`. VnExpress does not use letter-spacing adjustments. Do NOT add tracking to any element.

### 3.6 Text Transform

Never use `text-transform: uppercase`, `text-transform: capitalize`, or manually write text in ALL CAPS. All text must appear in natural sentence case or title case as appropriate. VnExpress's tone is calm and authoritative — all-caps text reads as shouting and violates the Neutral principle.

---

## 4. Component Stylings

### 4.1 Interaction Model — StateLayer + FocusRing

Every interactive component in VnExpress shares the same interaction architecture. Do NOT deviate from this pattern.

**StateLayer** is a transparent overlay that sits between a component's background and its content (text + icons). It provides hover and pressed feedback without generating new colors for every component variant.

```
Z-order (bottom to top):
  0 — Component background
  1 — StateLayer overlay (absolute, inset: 0)
  2 — Text, icons, content
```

**StateLayer values — exactly 2 types:**

| Type | Rest | Hover | Pressed |
|------|------|-------|---------|
| Standard (on light/neutral backgrounds) | `transparent` | `rgba(54, 68, 76, 0.08)` | `rgba(54, 68, 76, 0.18)` |
| On Color (on accent/support/dark backgrounds) | `transparent` | `rgba(222, 235, 255, 0.15)` | `rgba(222, 235, 255, 0.20)` |

Transition: `background-color 100ms ease-out`. No other transitions. No scale, no translate, no opacity animation on hover.

**FocusRing** appears only on keyboard focus (`:focus-visible`), never on mouse click:
- Border: `3px solid #0590de` (light) / `3px solid #4cbbed` (dark)
- Shadow: `0 0 8px rgba(66, 144, 217, 0.5)`
- The component must switch from `overflow: clip` to `overflow: visible` when focused so the ring is not clipped.

**Disabled state:** Reduce entire component opacity. Buttons: `opacity: 0.3`. Inputs: `opacity: 0.5`. Do NOT change colors, do NOT grey out individual elements, do NOT remove content.

### 4.2 Buttons

**Geometry — 3 sizes, no exceptions:**

| Size | Height | Horizontal Padding | Font Size | Label Font |
|------|--------|--------------------|-----------|------------|
| sm | 32px | 12px | 13px | Merriweather Sans |
| md | 40px | 16px | 15px | Merriweather Sans |
| lg | 44px | 16px | 17px | Merriweather Sans |

- Border-radius: `8px` for all standard buttons
- Border-radius: `360px` (circle) for icon-only circular buttons only
- Border: `1px solid` (color varies by variant, or `transparent` if no border)
- Gap between icon and label: `8px`
- Icon-only buttons: width equals height, no padding

**Variant system — 5 groups:**

**Filled buttons** (have a visible background):

| Variant | Background | Text Color | Font Weight | Border | StateLayer |
|---------|-----------|------------|-------------|--------|------------|
| contained | Surface 200 (`#f3f3f3`) | Text Regular Lighter | 400 | none | Standard |
| contained-bordered | Surface 100 (`#fafafa`) | Text Regular Lighter | 400 | Border Subdued | Standard |
| accent | Accent Rest (`#b13460`) | On-Color Regular | **700** | none | On Color |
| accent-subdued | Accent Subdued Surface | Accent Text | 400 | none | Standard |
| support | Support Rest (`#466fa1`) | On-Color Regular | **700** | none | On Color |

**Ghost buttons** (transparent background, has border):

| Variant | Background | Text Color | Border | StateLayer |
|---------|-----------|------------|--------|------------|
| ghost | transparent | Text Regular Lighter | Border Subdued | Standard |
| ghost-on-color | transparent | On-Color Regular | On-Color Border (`rgba(255,255,255,0.8)`) | On Color |
| ghost-subdued | transparent | Text Regular Lighter | Border Subdued | Standard |

**Uncontained buttons** (no background, no border):

| Variant | Text Color | StateLayer |
|---------|------------|------------|
| uncontained | Text Regular Lighter | Standard |

**Link buttons** (underlined text):

| Variant | Text Color | Text Decoration | StateLayer |
|---------|------------|----------------|------------|
| link | Link Strong (`#0471ae`) | underline | Standard |
| link-subtle | Text Regular Lighter | underline | Standard |

**Semantic buttons** (paired as contained + uncontained per context):

| Context | Contained Background | Uncontained Background | Text Color | StateLayer |
|---------|---------------------|----------------------|------------|------------|
| info | `#d0eaf9` / dark: `#03517d` | transparent | Info text | Standard |
| positive | `#d5eddc` / dark: `#145b29` | transparent | Positive text | Standard |
| warning | `#fce8da` / dark: `#864b21` | transparent | Warning text | Standard |
| negative | `#f8d4d6` / dark: `#7b1117` | transparent | Negative text | Standard |

**Selected states** — 2 variants:

| Selected Variant | Background | Border | Text Color |
|---------|-----------|--------|------------|
| a (neutral) | `rgba(0,0,0,0.1)` / dark: `rgba(255,255,255,0.3)` | Border Regular | Text Regular |
| b (accent) | Accent Subdued Surface | Border Accent Subdued (`#db7499`) | Accent Text Strong |

**Icon positions:** `none`, `left`, `right`, `both`, `far-left` (pinned to left edge), `far-right` (pinned to right edge), `only-rounded` (icon-only, 8px radius), `only-circle` (icon-only, 360px radius).

### 4.3 Input Fields

**TextField anatomy** — vertical stack with `8px` gap between each part:

```
[Label]           — 13px, weight 400, Text Regular Lighter
[Field container] — height varies by size, 1px border, 4px radius
[Helper / Error]  — 12px, weight 400, Text Subdued or Negative
```

**Field container specs:**

| Size | Height | Left Padding | Right Padding |
|------|--------|-------------|---------------|
| sm | 32px | 12px | 8px |
| md | 40px | 12px | 8px |
| lg | 48px | 12px | 8px |

- Background: `#fafafa` (Surface 100)
- Border: `1px solid` Border Regular (`#9f9f9f`). On error: Border Negative (`#da1e28`).
- Border-radius: `4px` (radii-md)
- Text entered: Text Regular. Placeholder: Text Subdued Lighter.
- May contain: a leading icon (left-aligned) and/or an inline button (right-aligned, 32px height, 8px radius)

**CodeField:** Row of individual cells, each `44×56px`, `4px` radius, `8px` gap between cells. Same background and border rules as TextField.

### 4.4 Alerts

**AlertToast** (prominent, with background):
- Width: `340px` fixed
- Background: semantic surface color for context
- Left border: `2px solid` semantic border color — this is the primary visual identifier
- Border-radius: `4px`
- Padding: `16px` all sides (right side extends to `56px` if dismiss button present)
- Layout: context icon (20×20px) + text block (title bold 14px + message regular 14px, `4px` gap between them)
- May contain: dismiss button (top-right corner) or action button (inline or line-break position)

**AlertInline** (minimal, no background):
- No background, no border, no padding
- Layout: horizontal — context icon (16×16px) + message text, `4px` gap
- Text: 12px helper weight, color matches context
- 5 contexts: Info, Info Alternative (uses subdued grey instead of blue), Positive, Warning, Negative
- 3 alignments: Left, Center, Right

### 4.5 Dividers — The Primary Separation Mechanism

VnExpress uses dividers the way a newspaper uses column rules — thin, quiet lines that organize dense information without consuming space. This is a defining characteristic of the system. Where Western SaaS products would insert 40–60px of empty air, VnExpress draws a hairline and keeps the content close.

| Level | Thickness | Color (Light) | Color (Dark) | Visual Quality | Usage |
|-------|-----------|--------------|-------------|----------------|-------|
| Subdued | `1px` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.1)` | Almost invisible — a ghost line. Only noticeable on close inspection. | Within a section: between list items, between cards in a group. |
| Regular | `1px` | `rgba(0,0,0,0.15)` | `rgba(255,255,255,0.3)` | Quietly present — a soft pencil rule. Clearly visible but not attention-drawing. | Between sections: content blocks, widget boundaries. |
| Strong | `2px` | `rgba(0,0,0,0.5)` | `rgba(255,255,255,0.5)` | Definitive — a firm ink stroke. Structural and authoritative. | Major breaks: header/content boundary, footer separation. |

There is also an `8px` thick divider token for exceptional structural breaks, but it is rarely used.

**Rule:** When separating content areas, always prefer a divider over adding whitespace. A `1px regular` divider with `16px` padding above and below is preferable to a `48px` empty gap.

### 4.6 Tabs & Navigation

**Tab pill:**
- Rest: background `rgba(0,0,0,0.1)` (light) / `rgba(255,255,255,0.1)` (dark)
- Selected: background `#ffffff` (light) / `rgba(255,255,255,0.8)` (dark)
- Height: `40px` (bar-md) or `44px` (bar-lg)
- Border-radius: `8px`

### 4.7 Badge, Avatar, Toggle, Pagination, Progress

**Badge:** Fill `#466fa1` (Support). Text: on-color. Used for counters and status indicators.

**Avatar:** Background `#e1e1e1`, text `#7f7f7f`. Circular (360px radius).

**Toggle:**
- Track disabled: `#fafafa`. Track enabled: `#e1e1e1` (light) / `#4f5257` (dark).
- Knob rest: `#ffffff`. Knob accent (active): `#c14872`.

**Pagination indicators:**
- Rest: `rgba(0,0,0,0.1)` (light) / `rgba(255,255,255,0.1)` (dark)
- Selected: `rgba(0,0,0,0.6)` (light) / `rgba(255,255,255,0.7)` (dark)

**Progress bar:** Background `#e1e1e1`. Foreground regular: `#5f5f5f`. Foreground subdued: `#b1b1b1`.

---

## 5. Layout Principles

### 5.1 Density Philosophy

VnExpress layouts are newspaper-dense. Content blocks sit close together. Whitespace exists to create readable structure, not for visual "breathing room." If a layout looks spacious, it is likely wrong.

**Do:** Pack content tightly. Use dividers to separate. Let headlines and metadata sit close to their images.

**Do NOT:** Add large padding between sections for aesthetic effect. Do NOT leave empty columns. Do NOT center a single column of content in a wide viewport with large margins on both sides — fill the space with content or related modules.

### 5.2 Spacing Scale — 13 Fixed Values

| Token | Value | Typical Use |
|-------|-------|-------------|
| none | `0px` | — |
| 4xs | `2px` | Hairline adjustments |
| 3xs | `4px` | Tightest gaps: icon-to-text in alerts, title-to-message |
| 2xs | `8px` | Standard small gap: icon-to-label in buttons, between form parts |
| xs | `12px` | Input left padding, small button horizontal padding |
| sm | `16px` | Standard horizontal padding, mobile page margin, inter-component gap |
| md | `24px` | Section internal padding |
| lg | `32px` | Desktop page margin, section-to-section gap |
| xl | `40px` | Large section spacing |
| 2xl | `48px` | Major layout breaks |
| 3xl | `56px` | Sparse use |
| 4xl | `64px` | Sparse use |
| 5xl | `80px` | Maximum spacing — rarely needed |

**Page margins by breakpoint:**
- Mobile: `16px`
- Tablet: `20px`
- Desktop: `32px`

**Rule:** Most intra-component spacing is `4–8px`. Most inter-component spacing is `8–16px`. Section spacing is `24–32px`. Anything above `32px` is unusual and must be justified.

### 5.3 Border-Radius Scale — Conservative

VnExpress corners are mostly sharp or barely rounded. Generous rounding is not part of this system's character.

| Token | Value | Usage |
|-------|-------|-------|
| none | `0px` | Default for most containers, structural elements |
| sm | `2px` | Subtle rounding on small elements |
| md | `4px` | Input fields, alerts, code cells, containers |
| lg | `8px` | Buttons, tabs, inline buttons, article bar |
| xl | `12px` | Article bar, special surfaces |
| circle | `360px` | Avatars, icon-only circular buttons ONLY |

**Rule:** Do NOT use `16px`, `20px`, `24px` or larger radius values — they do not exist in this system. When unsure, use `4px` for containers and `8px` for interactive elements.

### 5.4 Separation Strategy

In order of preference when separating content areas:

1. **Divider line** (1px regular) + moderate padding (`16px` above/below)
2. **Surface color change** (e.g., from Surface 000 to Surface 100)
3. **Increased spacing** (use only when the above options are inappropriate)

Do NOT rely on whitespace alone to create visual separation. Always combine with a divider or surface shift.

---

## 6. Dark Mode

VnExpress dark mode is a full semantic remap, not a simple color inversion. All tokens listed above include their dark mode values. The following describes the strategy:

### 6.1 Surface Inversion

Light surfaces (`#ffffff` → `#fafafa` → `#f3f3f3`) become dark surfaces (`#0d1013` → `#20242a` → `#2c2f35`). The nesting hierarchy is preserved — deeper nesting = lighter dark surface.

### 6.2 Text Adaptation

Dark mode text uses white at varying alpha values, matching the same 5-level hierarchy. Note that Text Regular and Text Subdued converge to the same alpha in dark mode (`0.70`) — this is intentional, as the dark background provides less contrast differentiation.

### 6.3 Accent Shift

The accent hue (rose) is preserved but lightness increases for readability on dark backgrounds:
- Accent text: `#c14872` → `#e68fad`
- Accent strong: `#b13460` → `#db7499`
- Accent surface: `#fce6eb` → `#430012`

Accent button backgrounds (`#b13460`) remain the same in both modes.

### 6.4 Semantic State Surfaces

Semantic surfaces become deeply saturated dark tones rather than light tints:
- Info: `#d0eaf9` → `#03517d`
- Positive: `#d5eddc` → `#145b29`
- Warning: `#fce8da` → `#864b21`
- Negative: `#f8d4d6` → `#7b1117`

### 6.5 Border Adaptation

Solid grey borders transition to semi-transparent white borders:
- Border Subdued: `#d6d6d6` → `#43464c`
- Border Regular: `#9f9f9f` → `#5b5d62`
- Button borders: shift to `rgba(255,255,255,0.2)` and `rgba(255,255,255,0.3)`

### 6.6 StateLayer in Dark Mode

Standard StateLayer shifts to match the dark mode state-layer tokens:
- Hover: `rgba(222, 235, 255, 0.15)` (same as On Color hover in light mode)
- Pressed: `rgba(222, 235, 255, 0.20)`

---

## 7. Generating New Elements — Fallback Rules

When creating a UI element that is not explicitly described in Section 4, follow these rules strictly. They exist to prevent drift from the system's character.

### 7.1 Decision Hierarchy

For any visual property of a new element, resolve in this order:

1. **Exact match:** If a documented component (Button, Input, Alert, Divider, Tab, Badge, Avatar, Toggle) covers the need, use it exactly as specified. Do NOT create a new variant.
2. **Closest analog:** If the new element is similar to a documented component, inherit its properties. A "chip" should inherit from Button (sm size, contained variant). A "tooltip" should inherit from AlertToast (same radius, padding pattern, semantic surface).
3. **Token lookup:** If no component analog exists, build from the token tables in Sections 2, 3, and 5. Every color must come from Section 2. Every font size from Section 3.2. Every spacing value from Section 5.2. Every radius from Section 5.3.
4. **If a value is not in this file, it does not exist.** Do NOT invent a 6px radius, a 14px padding, a `#333333` text color, or a `font-weight: 500` label. If the exact value you want is missing, use the nearest documented value.

### 7.2 Default Properties for Unknown Elements

When building a container or card that has no documented analog:

| Property | Default Value | Rationale |
|----------|--------------|-----------|
| Background | Surface 100 (`#fafafa`) | Subtle lift from canvas without being prominent |
| Border | `1px solid` Border Subdued (`#d6d6d6`) | Quiet containment |
| Border-radius | `4px` (radii-md) | Conservative — containers are not buttons |
| Internal padding | `16px` (spacing-sm) | Standard comfortable padding |
| Internal gap | `8px` (spacing-2xs) | Standard small gap |
| Text | Text Regular Lighter (`#5f5f5f`), Merriweather Sans, 15px, weight 400 | Mid-hierarchy, unassuming |
| Heading inside | Merriweather Sans, 18px, weight 700, Text Regular (`#202020`) | Clear but not loud |

### 7.3 Interaction for Unknown Interactive Elements

All new interactive elements must use the StateLayer + FocusRing system described in Section 4.1. No exceptions.

- Background elements (light/neutral surfaces): StateLayer type `Standard`
- Colored/accent/dark backgrounds: StateLayer type `On Color`
- Keyboard focus: FocusRing with `3px #0590de` border + `0 0 8px rgba(66,144,217,0.5)` glow
- Disabled: reduce opacity (0.3 for action elements, 0.5 for content elements)
- Do NOT invent hover colors, pressed colors, or focus styles

### 7.4 New Component Checklist

Before finalizing any generated element, verify:

- [ ] Every color traces back to a named token in Section 2
- [ ] Every font size exists in the scale in Section 3.2
- [ ] Font family is Merriweather Sans (unless it is an article title)
- [ ] No text is uppercase or capitalized via CSS
- [ ] Every spacing value exists in Section 5.2
- [ ] Border-radius is one of: 0, 2, 4, 8, 12, or 360px
- [ ] No box-shadow exists (except FocusRing on focus state)
- [ ] Interactive states use StateLayer, not custom hover/pressed colors
- [ ] The element would not look out of place next to the documented Button or AlertToast

---

## 8. Constraints Summary — What This System Is NOT

- **NOT playful.** No rounded-pill containers, no bouncy animations, no bright multi-color palettes.
- **NOT spacious.** No hero sections with 200px padding. No centered single-column layouts with 40% of screen width unused.
- **NOT decorative.** No gradients, no background patterns, no ambient lighting effects, no glassmorphism.
- **NOT conversational.** No casual microcopy, no first-person UI voice, no emoji, no exclamation marks.
- **NOT shadowed.** No elevation system. No card shadows. No floating elements.
- **NOT loud.** No uppercase text, no oversized type, no high-contrast color clashes.

This is a system that values density, precision, restraint, and editorial neutrality above all else. Generate accordingly.
