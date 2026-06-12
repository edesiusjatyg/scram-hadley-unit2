<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:scram-project-rules -->
# Project: SCRAM — Hadley Nuclear Station Unit 2

A terminal-style BWR reactor shift simulation game. Full PRD and physics research in `../docs/`.

## Critical reading before writing any code
1. `../docs/SCRAM_PRD.md` — full game spec, all constants, cascade logic, command vocabulary
2. `../docs/deep-research-report.md` — real-world BWR physics reference

## Architecture rules
- Simulation engine is a PURE FUNCTION: `simulationTick(state): PlantState` — no side effects, no async
- All physics constants live in `lib/simulation/constants.ts` — never hardcode threshold values elsewhere
- Build order: constants → initialState → simulationTick → cascadeLogic → store → UI
- Do NOT build UI components until simulation engine is verified working in isolation

## Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand
- No additional libraries beyond `zustand` and `clsx`

## Aesthetic constraints
- Monospace font only, everywhere
- Terminal color palette: bg `#0a0a0a`, text `#33ff33`, alarm `#ff4444`, warning `#ffaa00`
- No gradients, no shadows, no rounded corners, no icons
- Every UI element must feel like a 1980s control room terminal
<!-- END:scram-project-rules -->