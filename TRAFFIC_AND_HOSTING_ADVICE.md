# Traffic & Hosting Strategy for Olympic Tracker

## 1. Driving Traffic to Your Store (Without Being Annoying)

Since this tracker functions as a "second screen" for engaged fans, the goal is to provide value while creating brand awareness.

### Strategies
*   **The "Sponsor" Approach (High Trust):** Add a clear "Official Merch" or "Support the Tracker" button in the navigation. Fans often want to support creators of free tools.
*   **Contextual "Celebration" Discounts:** slightly more direct. When a user generates a **PDF** or **Shareable Image**, include a footer note like: *"Celebrate the team with 10% off at Salty Gold Supply: TRIALS2026"*. This offers value at a high-engagement moment.
*   **QR Codes on Artifacts:** Add a small QR code to the **PDF exports**. If these are printed and passed around an arena, the link bridges the gap between physical and digital.
*   **Subtle "Gear" Context:** In the "Skaters to Watch" modal, a small footer link (e.g., *"Shop skating fan gear at saltgoldsupply.com"*) serves as relevant context rather than an ad.

**Top Recommendation:** Combine **Discount Codes on Exports** (PDFs) with a **"Shop Merch" Nav Button**.

---

## 2. Hosting Strategy: Where should the app live?

### Option A: Subdomain (e.g., `results.saltygoldsupply.com`) - 🏆 RECOMMENDED
*   **Why:** It looks official and trustworthy.
*   **Benefit:** Every shared link advertises your brand URL.
*   **Marketing:** Allows for pixel tracking/retargeting of fans since they are visiting *your* domain properties.
*   **How:** Host code on Vercel/Netlify (easy/free), point a `CNAME` record in your DNS (GoDaddy/Shopify) to it.

### Option B: Embedded (e.g., `saltygoldsupply.com/pages/tracker`)
*   **Pros:** Nav bar is already there.
*   **Cons:** Technically difficult or buggy (iframes, scrolling issues on mobile, script blocking by Shopify). hard to maintain.

### Option C: Separate (e.g., `olympic-tracker.vercel.app`)
*   **Pros:** Easiest setup.
*   **Cons:** Zero brand equity. Users remember the tool, not your store. Requires reliance on "Back to Store" links.

**Verdict:** Go with **Option A (Subdomain)**. It strikes the perfect balance of professional branding and ease of maintenance.
