# BillBuffer Documentation

This directory holds all BillBuffer documentation, organized by tier. The repo
[`README`](../README.md) is the entry point; this file is the full index.

> **Supreme authority:** [`vision/BILLBUFFER_CONSTITUTION.md`](./vision/BILLBUFFER_CONSTITUTION.md).
> If any document here conflicts with the Constitution, the Constitution wins.

## Required reading order

1. [`vision/BILLBUFFER_CONSTITUTION.md`](./vision/BILLBUFFER_CONSTITUTION.md)
2. [`architecture/ARCHITECTURE_GUARDRAILS.md`](./architecture/ARCHITECTURE_GUARDRAILS.md)
3. [`engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md`](./engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md)
4. [`engineering/CALCULATION_ENGINE_SPEC.md`](./engineering/CALCULATION_ENGINE_SPEC.md)
5. [`engineering/TEST_MATRIX.md`](./engineering/TEST_MATRIX.md)

## Tiers

| Tier | Folder | Contains |
|---|---|---|
| **Vision** | [`vision/`](./vision/) | Why BillBuffer exists — the Constitution (supreme) and Philosophy. |
| **Product** | [`product/`](./product/) | Who it's for and what v1 is — privacy manifesto, MVP definition, personas, open questions. |
| **Architecture** | [`architecture/`](./architecture/) | The non-negotiable technical rules — guardrails and stack. |
| **Engineering** | [`engineering/`](./engineering/) | How to build it — implementation brief, calculation spec, test matrix. |
| **History** | [`history/`](./history/) | Retired / superseded documents. Nothing is deleted. Empty today. |

## Full index

### Vision
- [`vision/BILLBUFFER_CONSTITUTION.md`](./vision/BILLBUFFER_CONSTITUTION.md) — **supreme authority**
- [`vision/BILLBUFFER_PHILOSOPHY.md`](./vision/BILLBUFFER_PHILOSOPHY.md)

### Product
- [`product/BILLBUFFER_PRIVACY_MANIFESTO.md`](./product/BILLBUFFER_PRIVACY_MANIFESTO.md)
- [`product/BILLBUFFER_MVP_DEFINITION.md`](./product/BILLBUFFER_MVP_DEFINITION.md)
- [`product/BILLBUFFER_USER_PERSONAS.md`](./product/BILLBUFFER_USER_PERSONAS.md)
- [`product/BILLBUFFER_OPEN_QUESTIONS.md`](./product/BILLBUFFER_OPEN_QUESTIONS.md)

### Architecture
- [`architecture/ARCHITECTURE_GUARDRAILS.md`](./architecture/ARCHITECTURE_GUARDRAILS.md)
- [`architecture/BILLBUFFER_TECHNICAL_STACK.md`](./architecture/BILLBUFFER_TECHNICAL_STACK.md)

### Engineering
- [`engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md`](./engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md)
- [`engineering/CALCULATION_ENGINE_SPEC.md`](./engineering/CALCULATION_ENGINE_SPEC.md)
- [`engineering/TEST_MATRIX.md`](./engineering/TEST_MATRIX.md)

### History
- [`history/`](./history/) — archive (see [`history/README.md`](./history/README.md))

## Conventions

- Documents are referenced by their **unique filename** (e.g. `CALCULATION_ENGINE_SPEC.md`);
  filenames are unique across the tree, so a name alone locates a doc.
- A document is **canonical** if it is not under `history/`. All docs listed above
  are canonical today.
- To retire a doc: move it to `history/` (never delete), and leave a superseded note
  in the replacement pointing back to it.
