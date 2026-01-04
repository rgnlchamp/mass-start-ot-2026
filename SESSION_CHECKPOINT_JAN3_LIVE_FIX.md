# Session Checkpoint - Jan 3 (Live Fix)
**Time:** 2026-01-03 PM
**Status:** ✅ STABLE & LIVE

## 🚀 Deployment Status
- **URL:** https://saltygold-trials.vercel.app
- **Feature:** Live Results Auto-Refresh
- **Status:** **WORKING** (Confirmed)

## 🛠️ Major Fixes Applied
1. **API Endpoint Correction:**
   - Problem: The app was fetching from `live.isuresults.eu` which returned an HTML SPA instead of JSON, causing 500 errors in the proxy.
   - Fix: Switched all endpoints (in `isu_import.js` and fetch scripts) to `api.isuresults.eu`.
   
2. **"No Time" (NT) Filtering:**
   - Problem: Skaters with no result yet (or "NT") were clogging up the standings view.
   - Fix: Added a filter in `parseIsuData` to exclude any entry where `time === "NT"`.

## 📂 Key Files Modified
- `isu_import.js` (Core logic for Import & Auto-Pilot)
- `fetch_results.js` (Utility for manual checking)
- `fetch_results_final.js` (Utility)

## ⚠️ Known Issues / Notes
- Users must still click "Auto-Pilot" to enable the background polling (this is by design).
- The "Public Auto-Pilot" (`startPublicAutoRefresh`) runs automatically for everyone on the site to catch the 1000m.

---
**Ready for next task (1000m Men/Women specific adjustments if needed).**
