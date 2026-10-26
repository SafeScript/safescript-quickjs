# Changelog

## [1.1.0] — 2026-10-25

### Changed
- Bumped version to 1.1.0.
- Updated dependency to `safescript >=1.1.0`.
- Rebuilt `dist/safescript-quickjs.js` bundle to include the updated compiler with `allow` option support.

### Note
The QuickJS bridge exposes `compile()` without an opts parameter. A future release may expose the `allow` option for C/C++ hosts that compile code referencing host-provided identifiers.
