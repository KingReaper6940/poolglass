# Retained-success study

Regenerate with `npm run example`.

- `project.json`: reopenable settings and notes.
- `receipt.json`: complete exact results; BigInt values stored as decimal strings.
- `distribution.csv`: all three retained-success counts.
- `targets.csv`: all ten face targets from 0 through 9.
- `study.html`: full human-readable report and chart.
- `distribution.svg`: actual generated chart, not an application screenshot.

The example rolls four independent fair eight-sided dice and retains the two lowest. A face at most four passes; the selected event is at least one passing retained die. Exact event probability is 15/16, baseline is 3/4, and the probability difference is 3/16 (+18.75 percentage points).

This is generic arithmetic, not a published game's rules or a physical-dice fairness test.
