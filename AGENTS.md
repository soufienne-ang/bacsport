# AGENTS.md

## Project

Tunisia Baccalaureate PE grading app. React 18 + TypeScript + Vite + TailwindCSS. Static SPA, localStorage persistence, Capacitor Android.

**Two apps in this repo:**
- Root app (`/`) — Main grading app. Entry: `index.html` → `index.tsx` → `App.tsx`
- `dashboard/` — Separate admin dashboard. Entry: `dashboard/index.html` → `dashboard/src/App.tsx`

## Commands

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Build to dist/
npm run preview  # Preview production build

# Dashboard
cd dashboard && npm run dev
```

## Key Architecture

- **Frontend files at root level** — Not in `src/`. Entry: `index.html` → `index.tsx` → `App.tsx`
- **Vite `base: './'`** — Required for file:// protocol (local offline use). Never change to `/`
- **No backend** — Pure client-side, all data in localStorage
- **Capacitor** — `capacitor.config.ts`, Android appId: `com.bacsport.tunisie`
- **PDF generation** — `html2pdf.js`

## Build Requirements

- **tsconfig.json**: Must include `"vite/client"` in types
- **capacitor.config.ts**: Define `CapacitorConfig` interface inline (package may not be installed)
- **html2pdf.js options**: Cast options with `as any` to avoid TypeScript errors on `pagebreak`

## Services (Root App)

- `services/db.ts` — localStorage wrapper
- `services/excelParser.ts` — Parses Ministry `.xlsx` format
- `services/grading.ts` — Exemptions, absences, repechage logic
- `services/security.ts` — Multi-user auth (SHA-256, per-user salt, account lockout)
- `services/validation.ts` — Input validation for times/distances/scores

## Types

- `Gender`: M/F
- `SportType`: Course1(60m), Course2(Endurance), Course3(Haies), Saut1(Hauteur), Saut2(Longueur), Saut3(Triple), Lancer(Poids)
- `StudentStatus`: present/absent/exempt
- `Student`: has `exemptions`, `absences`, `repechage` per category; `assignedSports`, `performance`, `scores`
- `GradingConfig`: 7 sport types × 2 genders × score tables (BaremeRow[])
- `User`, `UserRole`: superadmin/admin/operator with granular permissions

## Grading

- Official 2011/2012 Ministry scales in `constants.ts`
- 7 sport types × 2 genders × ~40 score levels (0.5 to 20)
- Final average = mean of ≥2 numeric category scores
- 10 = passing threshold