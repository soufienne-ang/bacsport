# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tunisia Baccalaureate PE (Physical Education) grading application. A React/TypeScript web app for managing student sports performance data, calculating scores based on official 2011/2012 Ministry grading scales, and generating reports. Deployed as a static web app and packaged as a Capacitor mobile app.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Vite dev server
npm run build     # Build for production (outputs to dist/)
npm run preview   # Preview production build
```

## Architecture

**Stack:** React 18 + TypeScript + Vite + TailwindCSS + localStorage (no backend)

**Entry:** `index.html` → `index.tsx` → `App.tsx`

**Core modules:**

- **`App.tsx`** — Single-page app with tab-based navigation. Central state (students, grading config, history, settings) persisted to localStorage via `services/db.ts`. Contains the `calculateNote()` function that converts raw performance → score (0-20) using the official grading scales.

- **`services/`**
  - `db.ts` — localStorage wrapper with quota handling. Stores students, config, categories, history, audit logs, settings.
  - `excelParser.ts` — Parses Excel files (`.xlsx`) using the `xlsx` library. Extracts student data from the official Ministry spreadsheet format.
  - `grading.ts` — Business logic for exemptions, absences, repechage, and final result calculation (average of ≥2 numeric scores).
  - `security.ts` — Multi-user authentication system with SHA-256 hashing, per-user salt, account lockout (5 attempts → 15 min), recovery questions. Supports admin/operator roles, user CRUD operations.
  - `validation.ts` — Input validation for time/distance performances, scores, names.

- **`components/`** — View components matching App tabs: `DashboardView`, `ImportView`, `EntryView`, `FinalResultsView`, `ReportsView`, `ConfigView`, `StudentManagerView`, `UserManagerView`, `LoginView`, `Sidebar`.

- **`types.ts`** — TypeScript interfaces: `Student`, `GradingConfig`, `BaremeRow`, `StudentStatus`, `GlobalSettings`, `User`, `UserRole`.

- **`constants.ts`** — Official grading scales (`INITIAL_BAREME`) for 7 sport types (3 running, 3 jumping, 1 throwing), separated by gender.

- **`types.ts`** — TypeScript interfaces: `Student`, `GradingConfig`, `BaremeRow`, `StudentStatus`, `GlobalSettings`.

**Key data flow:**
1. Excel import → `parseExcelFile()` → students array → saved to localStorage
2. Performance entry → `handleUpdatePerformance()` → triggers `calculateNote()` → auto-recalculates scores and final average
3. Reports/Final results → reads from state → generates PDF via `html2pdf.js`

**Capacitor:** Configured in `capacitor.config.ts` for Android deployment (`com.bacsport.tunisie`). Build output (`dist/`) is the web directory.
