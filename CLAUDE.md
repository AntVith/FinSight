# FinSight · AI Collaboration Guide

> A working agreement for AI agents (Claude Code, Cursor, Codex, anything else) and human contributors collaborating on FinSight. Treat every rule below as load-bearing: each one encodes an architectural decision, a security posture, or a review-economics trade-off that has already been thought through.

If you are an AI agent reading this for the first time on a fresh task: **read the whole file before your first edit, then ground your plan in these constraints**. If you are a human reviewer: this is the contract you should be reviewing PRs against.

---

## 1. Project at a glance

FinSight is a personal finance analyzer that:

- links a bank via **Plaid** (OAuth handoff, idempotent transaction sync into PostgreSQL),
- narrates spending behavior with **Anthropic Claude** (top categories, anomalies, recommendations),
- serves it through a **Go (chi) backend + React 18 / TypeScript / Tailwind v4 frontend**,
- authenticates users with **bcrypt + HS256 access JWTs + opaque rotated refresh tokens** (single-flight refresh on 401).

Sandbox by design. No live customer money, no real PII, no production banking data lives in this repository.

---

## 2. Operating principles for agents

1. **Scope explicitly, edit minimally.** If the task is "fix the dashboard loading state," do not also reorganize the navbar. One concern per commit.
2. **Prefer extension over rewrite.** Existing patterns (hooks, context, repository layer, axios interceptors) were chosen deliberately. Match them before inventing alternatives.
3. **No silent dependencies.** Run `go mod tidy` after Go imports change. Run `npm install` after `package.json` edits. Restart the dev server if Vite stops emitting clean HMR.
4. **Type strictly.** `any` is forbidden in TypeScript. `interface{}` smuggling is forbidden in Go (use generics or named types).
5. **Comments narrate intent, never the obvious.** Explain why a `setTimeout(0)` defers a state write, not that "this calls setState."
6. **Never invent secrets.** If `.env` lacks a value, surface the gap, do not hardcode a placeholder into source.
7. **Surface assumptions in the PR description, not the diff.** A reviewer should not need to reconstruct your reasoning from `// note:` comments.

---

## 3. Security guardrails (non-negotiable)

- `.env`, `frontend/.env`, and `backend/.env` are gitignored. Never `git add -f` them, never paste their contents into a commit message, PR body, or chat transcript that ends up in source.
- Anything prefixed with `VITE_` is **inlined into the client bundle** at build time. Treat those values as public. The seeded sandbox demo credentials are the only acceptable `VITE_` secrets.
- Bearer tokens live in `sessionStorage`, not `localStorage`, by design (single-tab scope, cleared on tab close). Do not migrate them without an RFC.
- The axios response interceptor performs a single-flight refresh on 401. Do not bypass it with bespoke `fetch` calls or a second axios instance.
- Backend logs must never include passwords, JWTs, refresh tokens, Plaid access tokens, or Claude prompts that carry user PII.
- CORS is **env-driven** via `ALLOWED_ORIGINS`. Production must set this explicitly. The localhost fallback is dev only.

---

## 4. Frontend tech stack

- React 18 + TypeScript (strict mode)
- React Router v6
- Tailwind v4 (Bootstrap, react-bootstrap, MUI, Chakra are banned)
- Recharts for visualizations
- Axios via `frontend/src/api/client.ts` (single source for outbound HTTP)
- `react-plaid-link` consumed exclusively through `src/hooks/usePlaidLink.ts`

## 5. Frontend architecture rules

- **Views** live in `src/views/`: one file per page, no subfolders.
- **Components** live in `src/components/ComponentName/ComponentName.tsx`: folder per distinct UI section.
- **All HTTP traffic** flows through `src/api/client.ts`. No `fetch`, no second axios instance, no inline `axios.create`.
- **All shared types** live in `src/types/index.ts`. Use `import type`. Never redefine a model inside a feature file.
- **Plaid Link** is consumed only via `src/hooks/usePlaidLink.ts`. Do not import `react-plaid-link` directly in views or components.
- **Auth lives in `src/context/AuthContext.tsx`** plus `src/auth/tokenStore.ts`. Components consume `useAuthenticatedSession()`, never the token store directly.
- **State management** is `useState` + `useContext` only. No Redux, no Zustand, no Recoil unless an explicit RFC opens the door.

## 6. Files an agent may extend without ceremony

- `frontend/src/api/client.ts`: bearer attachment, `/api/auth/*` helpers, refresh-on-401 logic.
- `frontend/src/types/index.ts`: additive types (auth envelopes, payloads, response shapes).
- `frontend/src/main.tsx`: additive provider wiring (for example, wrapping a new context provider).

`frontend/src/hooks/usePlaidLink.ts` may receive **surgical** edits only (for example, `await onSuccess()` when the callback became async). Do not refactor it broadly.

---

## 7. Backend tech stack

- Go ≥ 1.21, `chi` router, `database/sql` over `lib/pq`
- PostgreSQL (schema `finsight.*`, no writes against the public schema)
- `github.com/golang-jwt/jwt/v5` for HS256 access tokens
- `golang.org/x/crypto/bcrypt` for password hashing
- Plaid Go SDK, Anthropic Claude HTTP client (in `internal/insights`)

## 8. Backend conventions

- Migrations are **embedded** via `go:embed migrations/*.sql` and applied on boot inside transactions (`backend/db/migrate.go`). Migrations are append-only and idempotent.
- Every protected route lives inside the `authService.BearerMiddleware` group in `backend/api/http.go`. Do not attach handlers outside the group unless the route is genuinely public.
- Heavy work (Claude generation, long Plaid syncs) runs in a goroutine with `context.WithTimeout`. The user-facing HTTP path returns in under one second.
- All SQL is **schema-qualified** (`finsight.users`, `finsight.transactions`). Do not rely on `search_path`.
- Errors are wrapped with `fmt.Errorf("layer: action: %w", err)`. Bubble up, do not swallow.

---

## 9. API surface (canonical spec in `backend/openapi.yaml`)

Base: `${VITE_API_URL}/api` (default `http://localhost:8080/api`).

**Public:**
- `GET  /health`
- `POST /auth/register` · body: `{ email, password, first_name?, last_name? }`
- `POST /auth/login` · body: `{ email, password }`
- `POST /auth/refresh` · body: `{ refresh_token }`
- `POST /auth/logout` · body: `{ refresh_token }`

**Bearer-protected:**
- `GET  /link/token`
- `POST /link/exchange` · body: `{ public_token, institution_name }`
- `POST /transactions/sync`
- `GET  /transactions`
- `GET  /insights`

---

## 10. Code style (frontend)

- Functional components only. No class components, except `RouteErrorBoundary` (React requires a class for `componentDidCatch`).
- Props typed via `interface Props { ... }`, not `type Props =`.
- **Named exports only.** Never `export default`.
- `async/await`, never `.then()` chains.
- Every component that fires an API call must handle loading and error states.
- Tailwind utilities only. Inline `style` is reserved for dynamic geometry (chart dimensions, computed widths).
- Descriptive identifiers (`transactionsLedger`, not `t` or `data`). Destructured API fields keep the API's name when reasonable.
- `formatCategoryName` from `src/utils/formatters` is the only acceptable formatter for Plaid category strings.

## 11. Code style (backend)

- Repositories live in `backend/db/repository/*.go`. HTTP handlers in `backend/api/*.go`. Domain logic in `backend/internal/*`. Do not blur these boundaries.
- Exported functions and types carry a brief `// Name does X` doc comment. Internal helpers do not need one unless behavior is surprising.
- Database calls accept a `context.Context` first parameter and respect cancellation.
- HTTP handlers respond with `application/json`, never plain text, except `/health`.

---

## 12. Writing voice (applies to code, copy, commits, PRs, docs)

- **No em-dashes anywhere.** Use commas, semicolons, colons, or periods. (This applies to AI-generated text in particular.)
- No marketing fluff in user-facing copy. Tell the user what is happening (`Signing you in…`), not what we wish to evoke (`Negotiating bearer tokens…`).
- Sentence case headers everywhere except code (which follows language conventions).
- Commit titles follow Conventional Commits with optional scope: `feat(fe): ...`, `fix(be): ...`, `chore: ...`, `refactor: ...`.

---

## 13. Definition of done (per change)

Before opening a PR, an agent or human must confirm:

- [ ] `go build ./...` succeeds.
- [ ] `npm run build` succeeds (typecheck + Vite production build).
- [ ] No new lint errors on touched files.
- [ ] Touched components handle loading and error states.
- [ ] No `console.log`, debug `fmt.Println`, or commented-out code in the diff.
- [ ] No secrets in the diff, commit messages, or PR body.
- [ ] Commit titles use a Conventional Commit prefix.
- [ ] If the change touches a route, auth flow, or migration, it is also reflected in `backend/openapi.yaml` and/or the root `README.md`.

---

## 14. Things never to do

- Add Redux, Zustand, Recoil, MobX, or any other global state library.
- Add Bootstrap, MUI, Chakra, or any other UI kit.
- Move auth tokens to `localStorage`.
- Add `// @ts-ignore`, `// @ts-expect-error`, or `any` to silence the compiler.
- Run destructive git operations (`push --force`, `reset --hard origin/main`, `--no-verify` commits) without an explicit user request.
- Generate fake transactions or insights directly into the live database. The only sanctioned seed path is `go run ./cmd/seeddemo`.
- Commit `.env`, `*.pem`, `*.key`, or any file containing a real secret. If unsure, run `git diff --staged` before committing.

---

## 15. Quick agent boot sequence (recommended)

When opening a new task on FinSight:

1. Read this file end to end.
2. Skim `backend/openapi.yaml` for the current API surface.
3. Skim `frontend/src/types/index.ts` for the current shared model shapes.
4. Skim the directory listing of `frontend/src/components/` to know what already exists.
5. Confirm the dev environment is up: `go run ./cmd` in one terminal, `npm run dev` in another.
6. State the plan (3–5 bullets) before editing. Update it as the task evolves.
7. Stay scoped. When in doubt, ask before expanding scope.

---

<sub>This document evolves with the project. If a rule is wrong, change it deliberately, in its own commit, with the rationale in the message.</sub>
