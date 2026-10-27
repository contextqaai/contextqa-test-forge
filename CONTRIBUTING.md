# Contributing

This repository is currently private and unlicensed for external redistribution; organization owners can choose an open-source license and public launch after review. Repository visibility does not itself grant a license.

Run `npm test` and `node examples/demo.js output/new-run`. Verify generated code and all three browser jobs before merging exporter changes. Keep dependencies pinned, examples synthetic and source reads explicit. Add transport tests instead of requiring real provider credentials in CI. Document any unsupported source fields or actions. Do not add telemetry, live customer fixtures or model-generated code execution. Never work on excluded organizations as part of this repo.
