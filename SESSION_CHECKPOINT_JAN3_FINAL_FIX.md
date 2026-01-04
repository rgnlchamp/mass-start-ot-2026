# Session Checkpoint: Live Results Fix & Roster Protection
**Date:** January 3, 2026
**Status:** STABLE - DEPLOYED

## Critical Fixes Implemented
1.  **Live Results Visibility:**
    - Fixed a `ReferenceError` in `isu_import.js` where `newResults` was used instead of `parsed`. This was causing silent failures in the live update loop.
    - Live results for Men's 1000m (and future races) now appear correctly in the "Standings" view as "Unofficial".

2.  **Roster Protection (No Spoilers):**
    - Implemented a "Force Pending" mechanism in `isu_import.js` and `app.js`.
    - Live results are strictly forced to `status: 'pending'`.
    - The "Projected Team Roster" logic (`app.js` `calculateReduction`) now completely ignores pending/live results.
    - Added a "Safety Scrub" on page load to reset any accidentally "Official" statuses (from old localStorage) to 'Pending', effectively cleaning up "ghost" entries.

3.  **Visual Feedback:**
    - Added a Toast notification (`📡 Live Update: X Skaters`) to `isu_import.js` so admins/users know when data arrives.
    - Updated `index.html` with Version Query Strings (`?v=JAN3_FIX_2`) to force all users to receive the new code (Cache Busting).

## Key Files Modified
- `isu_import.js`: Live polling logic, retry mechanism, ReferenceError fix.
- `app.js`: Roster calculation logic (filtering), `loadFromStorage` safety scrub.
- `index.html`: Cache busting tags.

## Deployment
- **Production:** `saltygold-trials.vercel.app` is verified running the latest code.
- **Verification:** User confirmed "I see them now".

## Restore Instructions
If future changes break this state, revert to the commit message:
`Fix: Critical ReferenceError in live update loop`
