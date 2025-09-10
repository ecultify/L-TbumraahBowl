# Benchmarks (Loaded by App)

Place exported benchmark pattern JSON files here (from the Analyze page → Export Benchmark Pattern).
Then list them in `public/benchmarks/index.json` as a simple array of filenames, for example:

[
  "bowler_side_ref.json",
  "bowler_front_ref.json"
]

Notes
- The app prefers multi-reference loading via this `index.json` file.
- If you remove or rename files, update `index.json` accordingly.
- Clear browser cache/localStorage key `benchmarkPattern.v2` after changes for a clean reload.
