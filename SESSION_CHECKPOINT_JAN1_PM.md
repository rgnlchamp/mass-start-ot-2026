# Olympic Trials Tracker - Session Checkpoint: Jan 1, 2026 (Evening)

## Summary of Progress:
This session focused on perfecting the **Shopify Integration** and refining the **Public Presentation** of the tracker. We moved from a static embed to a dynamic, "smart-height" integration.

### **Key Technical Milestones:**
1.  **Smart-Height Scaling:** Implemented a `postMessage` system where the Vercel app communicates its actual pixel height to the Shopify parent page. This ensures the iframe never has a "double scrollbar" and is never cut off at the bottom.
2.  **Navigation Clarity:** 
    *   Added a "Select Gender" label and a gold-themed border to the gender toggle.
    *   Improved the contrast of active tabs to guide users through the Dashboard, Standings, and Roster.
3.  **Data Refinement:**
    *   Updated the **"Skaters to Watch"** lists for Women's 3000m (5 skaters) and Men's 5000m (8 skaters).
    *   Corrected Samuel Hart-Gorman's personal data (ID: 72647, Time: 6:56.65) and re-sorted the 5000m rankings.
4.  **Social/Share Feature:**
    *   Modified the `shareApp()` function to hardcode the share link to the **Salty Gold Shopify Store** rather than the internal Vercel URL.
    *   Enabled `clipboard-write` and `web-share` permissions in the iframe embed code to allow sharing from mobile devices.

### **Deployment Status:**
*   **Vercel Live URL:** `https://saltygold-trials.vercel.app`
*   **Shopify Page:** `https://saltygoldsupply.com/pages/trials-tracker`
*   **Git State:** Committed and Pushed to `main`.

### **Official Embed Code (The "Smart" Version):**
```html
<div id="salty-gold-container" style="width: 100%; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); background: #0b0b18; overflow: hidden; margin: 0;">
  <iframe src="https://saltygold-trials.vercel.app" id="trials-tracker-iframe" style="width: 100%; height: 1200px; border: none; display: block; overflow: hidden;" scrolling="no" allow="clipboard-write; web-share"></iframe>
</div>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'setHeight') {
      const iframe = document.getElementById('trials-tracker-iframe');
      if (iframe) { iframe.style.height = (e.data.height + 40) + 'px'; }
    }
  }, false);
</script>
```

### **Maintenance Notes:**
*   **Admin Access:** Password remains `gold2026`.
*   **Data Entry:** Changes made in Admin mode on the live site are stored in your *local browser's storage*. To make them public for everyone, use the **Export/Import** tool to save the state and send it to the developer (me) to update the `preload_data.js`.
