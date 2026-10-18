# Verg Health — presentation proposal

Isolated, additive presentation package. The visual direction is a proposal under review, not a final design approval or a clinical product. Deep navy, cyan historical-data lines, ruby accent and the abstract blue emblem follow the supplied visual study. The chart and source table are initial HTML and need no browser JavaScript. The consolidated emblem is static; the reference animation is not enabled in this package.

## Files

- `src/index.mjs`: dependency-free pure ESM model and HTML renderers.
- `src/theme.css`, `src/logo.svg`: visual assets, no remote resources.
- `examples/fixtures.mjs`: exclusively invented demonstration records.
- `examples/VergHealth-demo.html`: generated static preview with no scripts.
- `reference/VergHealth-proposal-v4.html`: unchanged standalone visual reference, including its optional in-memory interactions. This is not imported into the module.
- `tests/presentation.test.mjs`: model, escaping, adversarial and static-output checks.

## Run from repository root (Node 20+)

    node packages/health-presentation/examples/build-demo.mjs
    node --test packages/health-presentation/tests/*.test.mjs
    node packages/health-presentation/examples/build-demo.mjs --out /tmp/VergHealth-demo.html

No installation, third-party packages, backend startup or network connection is needed. The builder reads only bundled synthetic fixtures and local visual assets, and writes one HTML file. An explicit `--out` destination is created exclusively: an existing file is refused. The default command regenerates the bundled demonstration. It is a development utility; the exported runtime module has no file, network, DOM or storage access.

## Input and reuse

Import `createViewModel` or `renderDashboard` from `src/index.mjs`. Supply at most 10,000 plain records with string fields limited to 2,048 characters each, in an array containing `metric`, `date` (strict ISO calendar date), `result`, `unit`, `reference` and `source`. Supply invented records to public previews. Do not place real records in this package, a public fixture, a URL or a repository.

`renderDashboard({profile: 'synthetic_demo', records})` returns an escaped main fragment. Add the stylesheet and identity SVG in a host shell. `createViewModel(records)` returns `rows` and unit-separated `groups`. Chart/group renderers are internal and consume only models produced by that function. Non-plain records, extra fields, accessors and unsupported field types are rejected. Missing optional fields are displayed explicitly.

## Presentation contract

- Only finite JavaScript numbers are exact. All strings remain literal non-exact text or comparator labels; no decimal/thousands parsing is performed here. A future authorized upstream parser must explicitly provide validated numeric values.
- Comparators such as `<5` remain literal limits in tables; no point at 5 is invented.
- Missing values remain missing. Non-numeric values stay textual. No implicit zero.
- Invalid/unknown dates remain visible in the table, but never enter the plotted chronology. Any unknown chronology suppresses connecting lines and delta for that group.
- Duplicated dates have no inferred intra-day order. Points may overlap and every source row remains in the table. Duplicate dates interrupt lines and suppress aggregate delta.
- Missing/text/comparator dated records interrupt lines. A delta is displayed only when every row belongs to one exact, uniquely dated, unit-consistent segment.
- Units are distinct exact strings. There is no conversion or joining across different or missing units.
- References are preserved per row, not interpreted or reduced to a shared normal range.
- Connections are visual links between records, not interpolation, clinical progress, diagnosis or recommendations.

The runtime requires an explicit `synthetic_demo` profile envelope before rendering. This declaration is not anonymization, content inspection or proof that the caller supplied synthetic data; the caller remains responsible for using exclusively invented records. Fictitious labels are intentional. It is not an adapter for real clinical records.

No routing, production application, OCR, backend, authentication, patient storage, telemetry, or deployment is introduced. Integration into an actual application remains separate work. The original reference has optional interactions; this reusable first consolidation intentionally keeps the essential chart/table static and does not wire those interactions into a runtime.

## Verification boundaries

The module and synthetic static output have executable unit checks. Browser rendering, responsive pixel inspection, assistive-technology testing, application integration and production build are not established by these unit tests. Manual visual review remains needed before final design approval.
