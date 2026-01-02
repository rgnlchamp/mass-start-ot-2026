# ⛸️ Salty Gold Olympic Trials Tracker: Shopify Handoff

## 🌐 Live Production URL
**URL:** [https://saltygold-trials.vercel.app](https://saltygold-trials.vercel.app)
*This is the "Engine" that powers your tracker. It updates automatically whenever we save progress.*

---

## 🛍️ Shopify Embed Instructions
Use the code below to add the tracker to your Shopify store.

### **Step-by-Step:**
1. Log in to your **Shopify Admin**.
2. Go to **Online Store > Pages**.
3. Create a new page (e.g., "2026 Olympic Trials Tracker") or edit an existing one.
4. In the content editor, click the **Show HTML (`<>`)** button.
5. Paste the following code:

```html
<!-- Salty Gold Olympic Trials Tracker Embed -->
<div style="width: 100%; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); background: #0b0b18; margin: 20px 0;">
  <iframe 
    src="https://saltygold-trials.vercel.app" 
    style="width: 100%; height: 1000px; border: none; display: block;"
    title="2026 Olympic Trials Tracker"
    allow="clipboard-write"
    id="trials-tracker-iframe"
  ></iframe>
</div>

<style>
  /* Mobile-friendly resizing */
  @media screen and (max-width: 768px) {
    #trials-tracker-iframe {
      height: 850px;
    }
  }
</style>
```

---

## 🔑 Admin Access
To manage results once the tracker is in Shopify:
1. Open the tracker on your site.
2. Scroll to the very bottom and click **🔒 Admin**.
3. Use your password to unlock **Race Entry** mode.

---

## 📡 Live ISU Importing
*   **Production (Shopify/Vercel):** The importer works immediately! No local server or `.bat` file is needed.
*   **Local Development:** If you are working on your computer at home, you still use `Start Live Tracker.bat` as usual.

## 📤 Sharing & Exports
*   **Insta Post:** Background-generated high-res graphics downloaded directly to your computer/phone.
*   **PDF:** Generates a clean, printable selection report.

---
*Created: January 1, 2026*
