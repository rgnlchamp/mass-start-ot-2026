# Session State: Mass Start & 500m Export Fixes
**Date:** December 30, 2025

## Current Objective
Fix the "Share/Export" functionality for the Standings (Image & PDF).

## Current Status
1.  **Buttons Hidden**: The "Insta Post" and "PDF" buttons have been commented out in `app.js` to prevent user errors while debugging.
2.  **Branding**: 
    *   Successfully updated to "Salty Gold Supply" branding.
    *   Includes "@SALTYGOLDSUPPLY" footer, "OLYMPIC TRIALS 2026" header, and correct gold colors (`#D4AF37`).
    *   Updated disclaimer to "* Unofficial Standings".
3.  **PDF Export**:
    *   **Problem**: Was printing blank/dark pages (browsers strip background colors).
    *   **Latest Attempt**: Switched to **Light Mode** (White background, Dark Text) for printer compatibility.
    *   **To Verify**: Check if the PDF now renders visibly with the new white theme.
4.  **Instagram Image Export**:
    *   **Problem**: Generation is stalling/freezing the app with the "Generating High-Res Image..." overlay.
    *   **Current Code**: Uses `dom-to-image` with a "Flash" method (briefly showing the container on screen).
    *   **Issues**: It seems to be timing out or hanging, possibly due to complex CSS gradients or DOM size.

## Next Actions (Start Here)
1.  **Uncomment Buttons**: Search for `div.btn-group` in `app.js` (around line 1860) and uncomment the buttons to resume testing.
2.  **Refactor Decision**: Decide whether to perform a code refactor (Split `app.js` into modules: `export.js`, `scoring.js`, etc.) before fixing the image bug. This would isolate the problem and make it easier to solve.
3.  **Test the PDF**: Confirm the new "Light Mode" PDF works and looks professional.
4.  **Fix Image Stall**: 
    *   Check browser console for errors during the "stall".
    *   Try "Plan C": Render the export container into a hidden `<iframe>` or a completely separate simplified view to ensure isolation.
