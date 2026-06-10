# Validation — Practice & Tools

A workspace where I build small, real things while learning to develop software
with AI tools. It contains an Angular practice app and a set of standalone
Python tools. The goal is shipping working things, not collecting tutorials.

## 🛠️ Python Tools

### Study Tracker (`study_tracker.py`)

A command-line tool to log study sessions and track how many hours I put in —
built to keep myself accountable while learning.

**Features**
- Log a study session (topic + hours)
- Saves sessions to a local file so they persist between runs
- Shows total hours and hours studied in the last 7 days

**Run it**
```bash
python study_tracker.py
```

You'll get a simple menu:
```
1) Log a study session
2) Show summary
3) Quit
```

> Personal data is stored in `study_log.json`, which is intentionally kept out
> of version control (see `.gitignore`).

## 🅰️ Angular App

An Angular 21 single-page app (standalone components) used for front-end practice.

```bash
npm start        # run dev server at http://localhost:4200/
npm run build    # production build to dist/
npm test         # run unit tests (Vitest)
```

## 🚀 About

I'm learning to build useful software with AI, focused on shipping real, working
things rather than collecting certificates. This repo is where that practice
lives — it will grow as I build more.
