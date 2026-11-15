# StayStrong50

Free strength check and training plan for adults 50+, by Entwisle Fitness. Sister app to Barbell Five and HypeReps.

- Plain HTML/CSS/JS, no build, no backend. Static deploy on Vercel.
- Data in localStorage (`staystrong50.v1`, consent `staystrong50.consent`). Backup/restore JSON, CSV export, delete-all.

## Features
- **Strength check:** 30-s chair stand and 30-s arm curl compared with Senior Fitness Test ranges (Rikli & Jones, ages 60–94; 60–64 range shown for 50–59), single-leg balance, push-up test, optional grip with EWGSOP2 cut-offs. First check sets starting exercises. Retest prompt every 6 weeks.
- **Plan:** Workout A (legs, push, pull, balance) / B (legs, hips & back, carry, core, balance). Session-based with a minimum rest-day gap (default 2 = roughly 3 sessions per 9 days). Every 6th session is a lighter recovery session.
- **Readiness check:** sleep, energy, stiffness, soreness + pain question. Green = normal, amber = easy (2 sets, misses not counted), red = suggest recovery. Pain = stop + signposting.
- **Exercise swaps:** joint-friendly alternatives by exercise + area, with red-flag signposting.
- Progression in `progress()`: hit all sets = +1 rep / +5 s; top of range = next step, or add weight on loadable steps; 3 misses = ease back.

## Setup to-dos
1. GA4 ID in `window.GA_ID` (index + legal pages).
2. Search Console verification (`window.GSC_TOKEN`), submit sitemap, link to GA4.
3. Optional domain staystrong50.com / .co.uk (free at build time).
