# Session Checkpoint: Jan 4 - Live Update Fix

**Date:** 2026-01-04
**Time:** 12:27 PM
**Status:** Ready for 500m/1500m Live Tracking

## Changes Made
- **Fixed `isu_import.js`**:
    - Identified issue where "2nd 500m" (tomorrow) would overwrite "1st 500m" (today) in the auto-sync mapping because they share the same distance key (`women_500m` / `men_500m`).
    - Added logic to prioritize races based on:
        1. **Live Status**: If a race is currently live, it takes precedence.
        2. **Start Time**: If neither (or both) are live, the race with the *earlier* start time is selected.
    - This ensures the tracker automatically locks onto today's races first.

## Active Files
- `isu_import.js` (Core logic for ISU API integration)
- `app.js` (Main application logic)
- `config.js` (Configuration settings)

## Next Steps
- Monitor the live tracker during the races.
- If manual intervention is needed, use the "Admin -> Race Entry" tab to force specific results.
