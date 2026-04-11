# Host compatibility — VS Code vs Cursor

**Status:** Historical note only. The active v1 product direction is **VS Code only**.

Older docs discussed both VS Code and Cursor as supported hosts. That is not the active direction after the Larry rewrite.

## Current stance

- Build against **VS Code extension APIs** only for v1.
- Do not write active product or implementation docs as if Cursor host support is required.
- If host expansion is revisited later, write a fresh compatibility document from the then-current implementation state.

## Why this file still exists

This file remains only so older references do not fail abruptly during the documentation transition.

Treat it as superseded by:

- [`docs/01_GENERAL_PRD.md`](../../docs/01_GENERAL_PRD.md)
- [`docs/02_TECHNICAL_PRD.md`](../../docs/02_TECHNICAL_PRD.md)
- [`docs/07_LOCAL_CURSOR_AND_COMPANION.md`](../../docs/07_LOCAL_CURSOR_AND_COMPANION.md)
