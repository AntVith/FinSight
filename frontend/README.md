# FinSight frontend

FinSight renders a landing experience, bearer-authenticated dashboards, Plaid Link, and AI insight panels against the Go API.

## Environment

Copy [`.env.example`](.env.example) to `.env` (or `.env.local`) and populate:

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Base URL of the API (usually `http://localhost:8080`). |
| `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` | Powers the navbar **Demo user** shortcut (calls `/api/auth/login`). Must match `backend/.env` `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` and a seeded account. Anything prefixed with `VITE_` ships in the bundle. treat these as sandbox-only material. |

## Seeding the demo user

The backend ships a one-shot Go command that creates the demo FinSight account **and** auto-links First Platypus Bank via Plaid sandbox so the demo dashboard hydrates with data on the first click of **Demo user**:

```bash
cd backend
go run ./cmd/seeddemo
```

It is idempotent. safe to re-run. Flags:

- `--skip-plaid`. only create the FinSight account, do not link Plaid.
- `--skip-sync`. link the bank but skip the initial transaction sync + insight regeneration (useful when `CLAUDE_API_KEY` is absent).

Plaid sandbox Link credentials (any institution): `user_good` / `pass_good`. The seed command never opens Link. it uses `/sandbox/public_token/create` directly.

## UX notes

The dashboard renders transactions first (“as of …” watermark derived from ledger max date) and lazily splits the Insight card chunk so Claude markdown rendering does not compete with shell paint.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
