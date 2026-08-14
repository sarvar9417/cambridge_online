# CamPath

CamPath uses one repository and one Vercel project:

- `frontend/` - React and Vite
- `backend/` - Express and PostgreSQL
- `api/` - Vercel adapter for the Express backend

## Local development

Install dependencies once:

```bash
npm install
```

Then start the complete frontend and backend with one command:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/v1/health

Run all checks with:

```bash
npm run verify
```

## Production

- Application: https://cambridge-online.vercel.app
- Repository: https://github.com/sarvar9417/cambridge_online

The Vercel project must have `DATABASE_URL`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `FRONTEND_URL`, and `NODE_ENV=production` configured for
Production, Preview, and Development as appropriate. Do not commit `.env`.

Detailed product requirements are in `00-README.md` through `12-api.md`.
