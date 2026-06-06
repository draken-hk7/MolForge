# MolForge UI Audit Report

## Scope

Audited the full frontend experience across:

- Dashboard (`/`)
- Molecule Editor (`/editor`)
- Results (`/results`)
- Library (`/library`)
- Materials Project Database (`/materials`)
- Inverse Design (`/inverse-design`)
- Settings (`/settings`)

The audit covered typography, spacing, responsive layouts, data formatting, loading and empty states, Materials Project error handling, property comparison displays, and interactive workflows.

## Issues Found And Fixed

### Typography And Content

- Standardized page titles to `text-2xl font-semibold`.
- Standardized primary panel headings to `text-lg font-medium`.
- Replaced the custom SMILES font class with Tailwind `font-mono`.
- Added truncation and title tooltips to displayed SMILES strings.
- Kept short Materials Project IDs fully readable while allowing result headers to wrap around badges.

### Numeric And Property Formatting

- Added shared `formatNumber`, `formatScientific`, and `formatPercent` helpers.
- Limited property values to a maximum of three significant figures.
- Formatted conductivity with multiplication-style scientific notation such as `2.8 × 10^-9`.
- Standardized scores, confidence values, and percentages to one decimal place.
- Ensured deltas always display explicit positive or negative signs.
- Applied neutral delta styling to target-based properties and positive/negative styling to directional properties.
- Fixed MP comparisons so missing MP values are treated as `n/a` instead of numeric zero.

### Materials Project Experience

- Fixed stale “Material not found” errors after a valid result is displayed.
- Confirmed failed searches show an error and a subsequent successful search clears it.
- Standardized missing Materials Project values as gray italic `n/a`.
- Confirmed Material ID search immediately opens the full material detail panel.
- Confirmed `mp-3400` displays Lu(MnGe)6 and space group `P6/mmm (#191)`.

### Layout And Responsive Behavior

- Changed Editor and Materials DB to use a two-column intermediate desktop layout.
- Reserved the full three-column workbench layout for wider screens.
- Prevented dense panels from becoming cramped at 1280px and 1440px.
- Added radar-chart margins to reduce axis-label clipping.
- Verified all audited routes at 1280px, 1440px, and 1920px with no horizontal overflow or escaped elements.

### States And Controls

- Standardized all loading spinners to 16px indigo.
- Standardized empty states with a 32px indigo icon, clear title, and supporting description.
- Improved empty states for Properties, Simulation, Comparison, History, Materials results, and Inverse Design candidates.
- Confirmed session statistics update live after parsing and predicting molecules.

## Live Workflow Verification

- Material ID search: valid lookup displays the result and full detail panel.
- Materials error lifecycle: invalid lookup displays an error; valid lookup clears it.
- Editor workflow: parsed `CCO`, predicted properties, modified with `OH`, and predicted comparison.
- Property deltas: signed correctly with neutral, green, and red tones based on property type.
- Conductivity: displayed with `× 10^n` notation.
- Confidence values: displayed with one decimal place.
- Source link: points to `https://github.com/draken-hk7/MolForge`.

## Verification Results

- `npm run build`: passed.
- `npm run lint`: passed.
- Browser console errors: none.
- Responsive route matrix at 1280px, 1440px, and 1920px: passed with no overflow.
- Vite reports the existing large-chunk advisory warning; it does not fail the build.
