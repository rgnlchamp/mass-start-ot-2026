let currentImportConfig = { gender: null, dist: null };

function openIsuImportModal(gender, dist) {
    currentImportConfig = { gender, dist };
    const savedEventId = (appState.isuConfig && appState.isuConfig.eventId) ? appState.isuConfig.eventId : '2026_USA_0002';

    const modal = document.createElement('div');
    modal.id = 'isu-modal';
    modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center; backdrop-filter:blur(5px);`;

    modal.innerHTML = `

        < div style = "background:#1a1a2e; border:1px solid #D4AF37; color:#fff; padding:25px; width:500px; max-width:90%; border-radius:12px; box-shadow: 0 0 30px rgba(0,0,0,0.8);" >
            <h3 style="color:#D4AF37; margin-top:0;">📡 Import Live Results (Stage for Review)</h3>
            <div style="color:#aaa; font-size:0.9rem; margin-bottom:20px;">
                Importing to: <strong style="color:#fff">${gender.toUpperCase()} ${dist}</strong><br>
                <i style="font-size:0.8em">Results will be STAGED for review before publishing.</i>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; color:#ccc;">ISU Event ID:</label>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="isu-event-id" value="${savedEventId}" class="form-control" style="background:#111; color:#fff; border:1px solid #444;">
                    <button class="btn btn-primary" onclick="fetchIsuSchedule()">Load Schedule</button>
                </div>
            </div>
            
            <div id="isu-schedule-container" style="margin-top:20px; display:none; border-top:1px solid #333; padding-top:15px;">
                <label style="font-weight:bold; color:#ccc;">Select Specific Race:</label>
                <select id="isu-race-select" class="form-control" style="background:#111; color:#fff; border:1px solid #444; margin-bottom:10px;"></select>
                
                ${dist === '500m' ? `
                <div style="margin-bottom:10px;">
                    <label style="font-weight:bold; color:#ccc;">Import into Column:</label>
                    <select id="isu-column-select" class="form-control" style="background:#111; color:#fff; border:1px solid #444;">
                        <option value="best">Best Time (Standard)</option>
                        <option value="time1">Race 1</option>
                        <option value="time2">Race 2</option>
                    </select>
                </div>
                ` : ''}

                <button class="btn btn-warning w-100" onclick="previewIsuResults()">Preview Results</button>
            </div>

            <div id="isu-preview-container" style="margin-top:15px; display:none;">
                <h5 style="color:#ddd; margin-bottom:5px;">Data Preview</h5>
                <div id="isu-preview-content" style="max-height:150px; overflow-y:auto; background:#000; padding:10px; border:1px solid #333; font-family:monospace; font-size:0.8rem; margin-bottom:10px;"></div>
                <button class="btn btn-success w-100" onclick="importAsPending()">📥 Import as Pending (Live Unofficial)</button>
                <div style="font-size:0.8em; color:#888; margin-top:5px; text-align:center;">Visible on Standings immediately. Roster unaffected.</div>
            </div>

            <div id="isu-status" style="margin-top:15px; padding:10px; border-radius:6px; font-size:0.85rem; display:none;"></div>

            <div style="margin-top:20px; text-align:right;">
                <button class="btn btn-secondary" onclick="document.getElementById('isu-modal').remove()">Close</button>
            </div>
        </div >
        `;
    document.body.appendChild(modal);
}

// ... (Helper functions remain the same) ...

function importAsPending() {
    if (!currentImportConfig.stagedData) return;

    const { gender, dist, stagedData } = currentImportConfig;

    // Convert to standard format
    const newResults = stagedData.map((d, i) => ({
        id: 'isu-' + Date.now() + '-' + i,
        name: d.name,
        rank: d.rank,
        time: d.time,
        best: d.time,
        status: 'official' // The result itself is 'official' data, but the EVENT is 'pending'
    }));

    // Save to Live State as PENDING
    if (!appState.events[gender]) appState.events[gender] = {};
    appState.events[gender][dist] = {
        results: newResults,
        status: 'pending' // Key: Pending = Unofficial on site, No Roster Effect
    };

    // SAVE TO FILE (Pending Status)
    if (appState.isAdmin) {
        try {
            fetch('/api/save-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gender,
                    distance: dist,
                    results: newResults,
                    status: 'pending'
                })
            });
        } catch (e) {
            console.error("Auto-pending save failed", e);
        }
    }

    saveToStorage();

    showToast(`✅ Imported as Unofficial! Review and PUBLISH to finalize.`);
    document.getElementById('isu-modal').remove();

    if (appState.currentTab === 'events') {
        renderCurrentTab();
    }
}

// Helper to find the proxy
async function getIsuProxyUrl() {
    // If we are on port 3000, use relative
    if (window.location.port === '3000') {
        console.log("[ISU Import] On port 3000, using relative proxy");
        return '/api/isu-proxy';
    }

    // Otherwise, try to see if port 3000 is alive
    try {
        console.log("[ISU Import] Checking for local proxy on port 3000...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const test = await fetch('http://localhost:3000/api/isu-proxy', {
            method: 'OPTIONS',
            signal: controller.signal
        }).catch(() => ({ ok: false }));
        clearTimeout(timeoutId);

        if (test.ok || test.status === 400) {
            console.log("[ISU Import] Local proxy found on port 3000");
            return 'http://localhost:3000/api/isu-proxy';
        }
    } catch (e) {
        console.warn("[ISU Import] Port 3000 check failed:", e);
    }

    // Fallback to relative (works on Vercel)
    console.log("[ISU Import] Falling back to relative proxy path");
    return '/api/isu-proxy';
}

function setImportStatus(msg, type = 'info') {
    const el = document.getElementById('isu-status');
    if (!el) return;
    el.style.display = 'block';
    el.innerText = msg;

    if (type === 'error') {
        el.style.background = 'rgba(239, 68, 68, 0.2)';
        el.style.color = '#fca5a5';
        el.style.border = '1px solid #ef4444';
    } else if (type === 'success') {
        el.style.background = 'rgba(34, 197, 94, 0.2)';
        el.style.color = '#86efac';
        el.style.border = '1px solid #22c55e';
    } else {
        el.style.background = 'rgba(59, 130, 246, 0.2)';
        el.style.color = '#93c5fd';
        el.style.border = '1px solid #3b82f6';
    }
}



function linkForAutoSync() {
    if (!currentImportConfig.stagedData) return;
    const { gender, dist } = currentImportConfig;
    const competitionId = document.getElementById('isu-race-select').value;
    const eventId = document.getElementById('isu-event-id').value;

    if (!appState.isuConfig.mappings) appState.isuConfig.mappings = {};

    // Save Mapping: "women_500m" -> { eventId: "...", compId: "..." }
    const key = `${gender}_${dist} `;
    appState.isuConfig.mappings[key] = { eventId, competitionId };
    saveToStorage();

    showToast(`🔗 Linked ${gender} ${dist} to Live Feed!`);
    document.getElementById('isu-modal').remove();

    // Suggest turning on Auto-Sync if not on
    if (!appState.isuConfig.autoSync) {
        if (confirm("Event Linked! Enable 'Auto-Pilot' now to keep it updated automatically?")) {
            toggleAutoSync(true);
        }
    }
}

// GLOBAL AUTO SYNC ENGINE
let autoSyncInterval = null;

function toggleAutoSync(forceState) {
    if (!appState.isuConfig) appState.isuConfig = {};

    // Toggle or Force
    const newState = (forceState !== undefined) ? forceState : !appState.isuConfig.autoSync;
    appState.isuConfig.autoSync = newState;
    saveToStorage();

    if (newState) {
        startAutoSyncLoop();
        showToast("🔄 Auto-Pilot ENGAGED");
    } else {
        stopAutoSyncLoop();
        showToast("🛑 Auto-Pilot DISABLED");
    }
    renderCurrentTab(); // Refresh UI to show badge
}

function startAutoSyncLoop() {
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    // Determine polling rate (e.g. 60s)
    autoSyncInterval = setInterval(runAutoSyncPass, 60000);
    runAutoSyncPass(); // Run immediately
}

function stopAutoSyncLoop() {
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    autoSyncInterval = null;
}

async function runAutoSyncPass() {
    if (!appState.isuConfig.mappings) return;
    const mappings = appState.isuConfig.mappings;

    console.log("[Auto-Pilot] Checking for updates...");

    for (const [key, map] of Object.entries(mappings)) {
        const [gender, dist] = key.split('_');
        try {
            const url = `https://api.isuresults.eu/events/${map.eventId}/competitions/${map.competitionId}/results`;
            const res = await fetch(`/api/isu-proxy?url=${encodeURIComponent(url)}`);
            if (!res.ok) continue;

            const data = await res.json();
            const parsed = parseIsuData(data);

            if (parsed.length > 0) {
                // Update State
                // TODO: Check if changed to avoid unnecessary saves? 
                // For now, just overwrite (Source of Truth)

                if (!appState.events[gender]) appState.events[gender] = {};
                if (!appState.events[gender][dist]) appState.events[gender][dist] = { results: [] };

                const newResults = parsed.map((d, i) => ({
                    id: 'isu-auto-' + i, // Stable IDs based on rank/index?
                    name: d.name,
                    time: d.time,
                    best: d.time,
                    rank: d.rank,
                    status: 'official' // Result is official data
                }));

                appState.events[gender][dist].results = newResults;

                // SAFEGUARD: If this event is hardcoded in MANUAL_RESULTS, force it to PUBLISHED
                // This prevents the Auto-Sync from reverting it to 'pending' (flickering issue)
                if (typeof window.MANUAL_RESULTS !== 'undefined' &&
                    window.MANUAL_RESULTS[gender] &&
                    window.MANUAL_RESULTS[gender][dist]) {
                    appState.events[gender][dist].status = 'published';
                    console.log(`[Auto-Pilot] Enforced PUBLISHED status for ${gender} ${dist} (Manual Override)`);
                }
                // Otherwise, standard logic:
                else if (appState.events[gender][dist].status !== 'published') {
                    appState.events[gender][dist].status = 'pending';

                    // AUTO-SAVE AS PENDING (Background DVR) - ADMIN ONLY
                    if (appState.isAdmin) {
                        try {
                            fetch('/api/save-results', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    gender,
                                    distance: dist,
                                    results: newResults,
                                    status: 'pending'
                                })
                            });
                            console.log(`[Auto-Pilot] Auto-saved Pending results for ${key}`);
                        } catch (e) {
                            console.warn(`[Auto-Pilot] Save failed for ${key}`, e);
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`[Auto-Pilot] Failed to sync ${key}`, e);
        }
    }
    saveToStorage();
    renderCurrentTab(); // Refresh UI
}

// Initialize on Load
if (appState.isuConfig && appState.isuConfig.autoSync) {
    startAutoSyncLoop();
}

// PUBLIC AUTO-START LOGIC
// Checks if we should auto-connect to a live event (for public viewers)
async function checkPublicAutoStart() {
    const activeId = BRANDING_CONFIG.ACTIVE_ISU_EVENT_ID;

    // 0. Reset if Event ID has changed (handle stale localStorage)
    if (activeId && appState.isuConfig && appState.isuConfig.eventId && appState.isuConfig.eventId !== activeId) {
        console.log(`[Public Auto-Start] Event ID changed from ${appState.isuConfig.eventId} to ${activeId}. Resetting Live Config.`);
        appState.isuConfig = {
            eventId: activeId,
            mappings: {},
            autoSync: false
        };
        saveToStorage(); // Commit the reset
    }

    // Always scan if we have an active Event ID to catch new races becoming live
    if (activeId) {

        console.log("[Public Auto-Start] Active Event Detected:", activeId);
        const eventId = activeId;

        try {
            // Fetch Schedule to find what is "Now"
            const proxyBase = await getIsuProxyUrl();
            const targetUrl = `https://api.isuresults.eu/events/${eventId}/schedule`;
            const res = await fetch(`${proxyBase}?url=${encodeURIComponent(targetUrl)}`);
            if (!res.ok) return;

            const data = await res.json();
            const races = Array.isArray(data) ? data : (data.competitions || []);

            console.log(`[Public Auto-Start] Scanning ${races.length} races from schedule...`);

            if (!appState.isuConfig) appState.isuConfig = {};
            if (!appState.isuConfig.mappings) appState.isuConfig.mappings = {};

            // Set the Event ID in state
            appState.isuConfig.eventId = eventId;

            let matchCount = 0;

            races.forEach(r => {
                const title = (r.title || r.name || "").toLowerCase();
                // Priority: Use 'identifier' (local ID, e.g. 1) if available, else 'id' (global ID, e.g. 5242)
                const compId = r.identifier || r.id;

                // 1. Detect Gender
                let g = null;
                if (title.includes('women') || title.includes('ladies')) g = 'women';
                else if (title.includes('men')) g = 'men';

                // 2. Detect Distance
                let d = null;
                // Robust Distance Matching (Order matters: Check longer numbers first)
                if (title.includes('mass start')) d = 'mass_start';
                else if (title.includes('team pursuit')) d = 'team_pursuit';
                else if (title.includes('10000') || title.includes('10k')) d = '10000m';
                else if (title.includes('5000') || title.includes('5k')) d = '5000m';
                else if (title.includes('3000') || title.includes('3k')) d = '3000m';
                else if (title.includes('1500')) d = '1500m';
                else if (title.includes('1000')) d = '1000m';
                else if (title.includes('500')) d = '500m';

                if (g && d) {
                    // Extract correct Competition/Result ID
                    let finalCompId = compId; // Default to top-level
                    let resLink = null;

                    if (r.links) {
                        resLink = r.links.find(l => l.type === 'results');
                        if (resLink) finalCompId = resLink.identifier;
                    }

                    // FORCE OVERRIDE for Today's Races (Jan 4) to ensure no ambiguity
                    // Women 500m -> 5
                    // Men 500m -> 6
                    if (g === 'women' && d === '500m') {
                        if (String(finalCompId) === '5') {
                            console.log("Found Women's 500m (ID 5)");
                        } else {
                            console.log(`Skipping Women's 500m ID ${finalCompId} (Target: 5)`);
                            return; // SKIP this iteration
                        }
                    }
                    if (g === 'men' && d === '500m') {
                        if (String(finalCompId) === '6') {
                            console.log("Found Men's 500m (ID 6)");
                        } else {
                            console.log(`Skipping Men's 500m ID ${finalCompId} (Target: 6)`);
                            return; // SKIP this iteration
                        }
                    }

                    const key = `${g}_${d}`;
                    const isNewLive = (resLink && resLink.isLive);

                    // CHECK CONFLICTS (e.g. 1st 500m vs 2nd 500m)
                    let shouldMap = true;
                    if (appState.isuConfig.mappings[key]) {
                        // We already have a mapping for this gender/dist
                        const existing = appState.isuConfig.mappings[key];

                        // Rule 1: LIVE always wins
                        if (existing.isLive && !isNewLive) {
                            shouldMap = false; // Keep existing live one
                        }
                        else if (!existing.isLive && isNewLive) {
                            shouldMap = true; // New one is live, take it
                        }
                        // Rule 2: If neither/both live, take EARLIER start time
                        else {
                            // We need start times. 'r' has it. 'existing' we must store it.
                            // Assuming we store it now.
                            const newStart = new Date(r.start || '9999-01-01').getTime();
                            const oldStart = existing.startTime || Number.MAX_SAFE_INTEGER;

                            if (newStart >= oldStart) {
                                shouldMap = false; // New one is later, keep earlier
                            }
                        }
                    }

                    if (shouldMap) {
                        appState.isuConfig.mappings[key] = {
                            eventId,
                            competitionId: finalCompId,
                            startTime: new Date(r.start || '9999-01-01').getTime(),
                            isLive: isNewLive
                        };
                        console.log(`[Public Auto-Start] Auto-Linked: ${key} -> Comp ${finalCompId} (Start: ${r.start})`);
                        // Only count as "new match" if we didn't have one or changed it? 
                        // Actually just counting found relevant races is fine for the toast.
                        matchCount++;

                        // Auto-focus the view if this race is LIVE
                        if (isNewLive) {
                            console.log(`[Public Auto-Start] Found LIVE race: ${g} ${d}. Switching view.`);
                            appState.viewGender = g;
                            appState.viewDistance = d;
                        }
                    }
                }
            });

            if (matchCount > 0) {
                appState.isuConfig.autoSync = true; // Enable the engine
                saveToStorage();
                showToast(`📡 Auto-Connected to ${matchCount} Live Races!`);
                // Trigger an immediate UI refresh if on data tab
                renderCurrentTab();
            }

        } catch (e) {
            console.warn("[Public Auto-Start] Failed:", e);
        }
    }
}

// Run check
// Run check immediately and then loop
checkPublicAutoStart();
setInterval(checkPublicAutoStart, 60000); // Check for new live races every 60s

let publicRefreshInterval = null;

function startPublicAutoRefresh(gender, dist) {
    if (publicRefreshInterval) clearInterval(publicRefreshInterval);

    // Only auto-refresh if we have a valid mapping or active event ID
    // And if we are NOT on localhost (let admin control their own sync)
    // Actually, simple logic: just run it. If it fails, it fails silently.

    // Find the relevant mapping
    let map = null;
    if (appState.isuConfig && appState.isuConfig.mappings) {
        map = appState.isuConfig.mappings[`${gender}_${dist}`];
    }

    // If no mapping, try to use the hardcoded one + guess competition ID? 
    // Hard without compID. So we rely on mapping being present (which happens if checkPublicAutoStart succeeds)

    // If no mapping, try to run check once to see if we can find it
    if (!map) {
        console.warn(`[Public LIVE] No mapping found for ${gender} ${dist}. Retrying check...`);
        checkPublicAutoStart().then(() => {
            // Try again after check
            if (appState.isuConfig && appState.isuConfig.mappings && appState.isuConfig.mappings[`${gender}_${dist}`]) {
                startPublicAutoRefresh(gender, dist);
            }
        });
        return;
    }

    console.log(`[Public LIVE] Started polling for ${gender} ${dist}`);

    console.log(`[Public LIVE] Started polling for ${gender} ${dist}`);

    // shared fetch function
    const performFetch = async () => {
        // Fetch silently
        try {
            const url = `https://api.isuresults.eu/events/${map.eventId}/competitions/${map.competitionId}/results`;
            // Use relative proxy path which works on both Vercel and Local
            // Add cache busting timestamp
            const res = await fetch(`/api/isu-proxy?url=${encodeURIComponent(url)}&t=${Date.now()}`);
            if (!res.ok) return;

            const data = await res.json();
            const parsed = parseIsuData(data);

            // SORTING FIX: Ensure valid time sort and re-rank logic
            const parseTimeVal = (t) => {
                if (!t || t === 'NT') return Infinity;
                try {
                    // Handle "1:23.45" or "34.56"
                    let seconds = 0;
                    if (t.includes(':')) {
                        const parts = t.split(':');
                        seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                    } else {
                        seconds = parseFloat(t);
                    }
                    return isNaN(seconds) ? Infinity : seconds;
                } catch (e) { return Infinity; }
            };

            parsed.sort((a, b) => parseTimeVal(a.time) - parseTimeVal(b.time));

            // Re-assign ranks based on sorted order so "Pos" column is correct
            parsed.forEach((p, idx) => {
                const val = parseTimeVal(p.time);
                if (val === Infinity) {
                    p.rank = p.time && p.time.length < 5 ? p.time : '-';
                } else {
                    p.rank = idx + 1;
                }

                // 500m Column Mapping Logic
                // If this is the 1st 500m (Women ID 5, Men ID 6), map 'time' -> 'time1'
                if (dist === '500m') {
                    const cId = String(map.competitionId);
                    if (cId === '5' || cId === '6') {
                        p.time1 = p.time;
                    }
                    // If 2nd 500m (Women ID 12, Men ID 11), map 'time' -> 'time2'
                    else if (cId === '11' || cId === '12') {
                        p.time2 = p.time;
                    }
                }
            });

            if (parsed.length > 0) {
                // Update State in Memory Only (Don't save to localStorage)

                // SAFETY CHECK: If status is 'official' (Manual Override), DO NOT OVERWRITE with live data
                if (appState.events[gender][dist] && appState.events[gender][dist].status === 'official') {
                    console.log(`[Public LIVE] Skipping update for ${gender} ${dist} - Marked Official`);
                    return;
                }

                if (!appState.events[gender][dist]) appState.events[gender][dist] = { results: [] };

                const oldLen = (appState.events[gender][dist].results || []).length;

                // For 500m, we might need to MERGE with existing data if we want to keep Race 1 when doing Race 2
                // BUT for today (Race 1), we can just overwrite. 
                // However, the requested logic is just to show it in the column.
                appState.events[gender][dist].results = parsed;
                appState.events[gender][dist].status = 'pending';

                // Re-render ONLY if current tab is still results
                if (window.renderCurrentTab) window.renderCurrentTab();

                // Show toast if count changed (to avoid spamming)
                if (parsed.length !== oldLen && window.showToast) {
                    window.showToast(`📡 Live Update: ${parsed.length} Skaters`);
                }
            }
        } catch (e) {
            console.warn("Poll failed", e);
        }
    };

    // Run Immediately!
    performFetch();

    // Then Loop
    publicRefreshInterval = setInterval(performFetch, 10000); // 10 seconds

}

async function fetchIsuSchedule() {
    let inputVal = document.getElementById('isu-event-id').value.trim();
    let eventId = inputVal;
    let autoCompId = null;

    // Smart Extract: Handle full results URL
    // ex: https://live.isuresults.eu/events/2026_USA_0001/competition/11/results
    if (inputVal.includes('events/')) {
        // Try to capture Event ID
        const eventMatch = inputVal.match(/events\/([^\/]+)/);
        if (eventMatch && eventMatch[1]) {
            eventId = eventMatch[1];
        }

        // Try to capture Competition (Race) ID
        const compMatch = inputVal.match(/competition\/(\d+)/);
        if (compMatch && compMatch[1]) {
            autoCompId = compMatch[1];
        }

        // Update UI to show the clean Event ID
        document.getElementById('isu-event-id').value = eventId;
    }

    // Save Config
    if (!appState.isuConfig) appState.isuConfig = {};
    appState.isuConfig.eventId = eventId;
    saveToStorage();

    // Structure: https://api.isuresults.eu/events/{id}/schedule
    const targetUrl = `https://api.isuresults.eu/events/${eventId}/schedule`;

    // Find the button (more robustly)
    const btn = document.querySelector('button[onclick="fetchIsuSchedule()"]');
    if (btn) {
        btn.dataset.originalText = btn.innerText;
        btn.innerText = 'Loading...';
        btn.disabled = true;
    }

    console.log(`[ISU Import] Fetching schedule for event: ${eventId}`);
    console.log(`[ISU Import] Using target URL: ${targetUrl}`);

    setImportStatus(`Connecting to ISU for ${eventId}...`);

    try {
        const proxyBase = await getIsuProxyUrl();
        const res = await fetch(`${proxyBase}?url=${encodeURIComponent(targetUrl)}`);

        if (!res.ok) {
            if (res.status === 404) throw new Error('Proxy endpoint not found. Make sure "Start Live Tracker.bat" is running.');
            throw new Error(`ISU Server error (${res.status}).`);
        }

        const data = await res.json();
        setImportStatus(`Schedule loaded successfully!`, 'success');
        renderScheduleOptions(data, autoCompId);
    } catch (e) {
        console.error("[ISU Import] fetchIsuSchedule failed:", e);
        setImportStatus(`Connection Failed: ${e.message}`, 'error');
        alert("Connection Error!\n\n1. Run 'Start Live Tracker.bat'\n2. Ensure you have internet access.");
    } finally {
        if (btn) {
            btn.innerText = btn.dataset.originalText || 'Load Schedule';
            btn.disabled = false;
        }
    }
}

function renderScheduleOptions(data, autoSelectId = null) {
    const select = document.getElementById('isu-race-select');
    select.innerHTML = '<option value="">-- Choose Race --</option>';

    // The new API returns a flat array of sessions/races
    const races = Array.isArray(data) ? data : (data.competitions || []);

    console.log(`[ISU Import] Found ${races.length} potential slots in schedule.`);
    setImportStatus(`Schedule loaded. Scanning for ${autoSelectId || 'races'}...`, 'success');

    let foundMatch = false;

    races.forEach(r => {
        // The "Competition ID" (e.g. 11) is inside the links array as "identifier"
        const resultsLink = (r.links || []).find(l => l.type === 'results');
        const compId = resultsLink ? resultsLink.identifier : r.id;

        const name = r.title || r.name || `Race ${compId}`;
        const option = document.createElement('option');
        option.value = compId;
        option.text = name;

        if (autoSelectId && String(compId) === String(autoSelectId)) {
            option.selected = true;
            foundMatch = true;
        }

        select.appendChild(option);
    });

    document.getElementById('isu-schedule-container').style.display = 'block';

    if (autoSelectId) {
        if (foundMatch) {
            setImportStatus(`Auto-selected race ${autoSelectId}! Loading names...`, 'success');
            setTimeout(previewIsuResults, 300);
        } else {
            setImportStatus(`Notice: Race ${autoSelectId} not found in schedule list, but trying anyway...`, 'info');
            // If not found in schedule, we still attempt the direct results URL fetch 
            // by forcing the select value if it's empty
            if (!select.value) {
                const manualOpt = document.createElement('option');
                manualOpt.value = autoSelectId;
                manualOpt.text = `Manual ID: ${autoSelectId}`;
                manualOpt.selected = true;
                select.appendChild(manualOpt);
            }
            setTimeout(previewIsuResults, 300);
        }
    }
}

async function previewIsuResults() {
    const eventId = document.getElementById('isu-event-id').value;
    const competitionId = document.getElementById('isu-race-select').value;
    if (!competitionId) return;

    // We try two common API patterns
    const urls = [
        `https://api.isuresults.eu/events/${eventId}/competitions/${competitionId}/results/?inSeconds=1`,
        `https://api.isuresults.eu/events/${eventId}/competitions/${competitionId}/results`
    ];

    setImportStatus(`Fetching results for competition ${competitionId}...`);
    document.getElementById('isu-preview-container').style.display = 'block';
    const previewEl = document.getElementById('isu-preview-content');
    previewEl.innerHTML = '<div style="text-align:center; padding:20px;">Searching for results...</div>';

    const proxyBase = await getIsuProxyUrl();

    for (const targetUrl of urls) {
        try {
            console.log(`[ISU Import] Trying Results URL: ${targetUrl}`);
            const res = await fetch(`${proxyBase}?url=${encodeURIComponent(targetUrl)}`);
            if (!res.ok) continue;

            const data = await res.json();
            const parsed = parseIsuData(data);

            if (parsed.length > 0) {
                setImportStatus(`Found ${parsed.length} skaters!`, 'success');
                previewEl.innerHTML = parsed.map(p =>
                    `<div><span style="color:#D4AF37">${p.rank}.</span> <strong>${p.name}</strong> (${p.time})</div>`
                ).join('');

                currentImportConfig.stagedData = parsed;
                return; // Success!
            }
        } catch (e) {
            console.warn(`[ISU Import] Failed URL ${targetUrl}:`, e);
        }
    }

    // If we reach here, both failed
    setImportStatus(`No results found yet.`, 'error');
    previewEl.innerHTML = '<div style="color:orange; text-align:center; padding:20px;">No results found yet.<br><small>If the race is in progress, check back in a moment.</small></div>';
}

function parseIsuData(data) {
    // Attempt to parse standard ISU JSON
    let entries = [];

    // Structure can be a direct array or nested in .results / .entries
    let list = Array.isArray(data) ? data : (data.results || data.entries || data.data || []);

    entries = list.map(item => {
        let name = "Unknown";

        // Handle nested skater object (new API)
        if (item.competitor && item.competitor.skater) {
            const s = item.competitor.skater;
            name = `${s.firstName} ${s.lastName}`;
        }
        // Handle competitor object (older API)
        else if (item.competitor) {
            name = item.competitor.fullName || item.competitor.name || name;
        }
        // Fallback to name field
        else if (item.name) {
            name = item.name;
        }

        // Time parsing: might be 'time', 'result', 'totalTime'



        // FIX: Check for IRM (Invalid Result Mark) or Status first
        // Refined logic: Only use Status if it is clearly NOT a number (e.g. "DNS", "DQ")
        // or if it comes from the specific IRM field.

        let rawTime = "NT";

        // Check Status / IRM FIRST to override any time (e.g. if they skated but got DQ'd)
        // Check Status / IRM FIRST to override any time (e.g. if they skated but got DQ'd)
        if (item.irm) {
            rawTime = item.irm;
        } else if (item.status !== undefined && item.status !== null) {
            if (isNaN(item.status)) {
                // String status like "DQ", "DNS"
                rawTime = item.status;
            } else {
                // Numeric Status Codes - OVERRIDE time if it's a "bad" status
                const sVal = parseInt(item.status);
                if (sVal === 2) rawTime = "DQ";
                else if (sVal === 3) rawTime = "DNF";
                else if (sVal === 1) rawTime = "DNS";
                else if (sVal !== 0) rawTime = "Status " + sVal; // Catch-all for unknown codes
                // Status 0 usually means OK/Finished, so we ignore it here
            }
        }

        // Only if we didn't find a special status, look for the time
        // FIX: handle status 0 explicitly (it is falsy in JS)
        if (rawTime === "NT" || (item.status !== undefined && parseInt(item.status) === 0 && !item.irm)) {
            rawTime = item.time || item.result || item.totalTime || rawTime;
        }

        const rank = item.rank || 0;

        return { name: cleanName(name), time: cleanTime(rawTime), rank };
    });

    return entries.filter(e => e.time !== "NT");
}

function cleanTime(raw) {
    if (!raw || raw === "NT") return "NT";

    let str = String(raw).trim();

    // If it's already in M:SS.hh format (has a colon), just truncate the thousandths
    if (str.includes(':')) {
        if (str.includes('.')) {
            const [main, decimals] = str.split('.');
            return `${main}.${decimals.substring(0, 2)}`;
        }
        return str;
    }

    // If it's a pure number (seconds only), like "72.358"
    if (!isNaN(parseFloat(str)) && str.includes('.')) {
        let totalSeconds = parseFloat(str);

        // If 60 seconds or more, convert to M:SS.hh
        if (totalSeconds >= 60) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            // Truncate decimals to 2 places (hundredths)
            const secondsStr = seconds.toFixed(3); // temporary to get enough decimals
            const [secMain, secDec] = secondsStr.split('.');
            const formattedSec = secMain.padStart(2, '0');
            const formattedDec = (secDec || "00").substring(0, 2);

            return `${minutes}:${formattedSec}.${formattedDec}`;
        } else {
            // Under 60 seconds, just truncate decimal
            const [main, decimals] = str.split('.');
            return `${main}.${decimals.substring(0, 2)}`;
        }
    }

    return str;
}

function cleanName(raw) {
    if (!raw) return "Unknown";

    // Normalize: "SURNAME Firstname" -> "Firstname Surname"
    // ISU often uses ALL CAPS for the surname
    const parts = raw.split(' ');
    if (parts.length >= 2) {
        // Find if any part is all caps (at least 2 letters)
        const allCapsIndex = parts.findIndex(p => p.length >= 2 && p === p.toUpperCase());
        if (allCapsIndex !== -1) {
            const surname = parts.splice(allCapsIndex, 1)[0];
            // Format as title case for better display
            const formattedSurname = surname.charAt(0) + surname.slice(1).toLowerCase();
            return `${parts.join(' ')} ${formattedSurname}`.trim();
        }
    }

    return raw;
}

function commitIsuImport() {
    if (!currentImportConfig.stagedData) return;

    const { gender, dist, stagedData } = currentImportConfig;
    const is500 = (dist === '500m');
    const targetColumn = document.getElementById('isu-column-select')?.value || 'time';

    // Save to AppState
    if (!appState.events[gender]) appState.events[gender] = {};
    if (!appState.events[gender][dist]) appState.events[gender][dist] = { results: [] };

    const existingResults = appState.events[gender][dist].results || [];
    const nameMap = {};
    existingResults.forEach(r => {
        nameMap[r.name.toLowerCase()] = r;
    });

    // Map to App Structure
    const newResults = stagedData.map((d, i) => {
        const nameKey = d.name.toLowerCase();
        const existing = nameMap[nameKey];

        let entry = {
            id: existing ? existing.id : ('isu-' + Date.now() + '-' + i),
            name: d.name,
            rank: d.rank
        };

        if (is500) {
            // Merge if existing
            entry.time1 = existing ? (existing.time1 || '') : '';
            entry.time2 = existing ? (existing.time2 || '') : '';
            entry.best = existing ? (existing.best || '') : '';

            // Update specific column
            if (targetColumn === 'time1') entry.time1 = d.time;
            else if (targetColumn === 'time2') entry.time2 = d.time;
            else entry.best = d.time;

            // Recalculate best
            if (entry.time1 && entry.time2) {
                entry.best = (entry.time1 < entry.time2) ? entry.time1 : entry.time2;
            } else {
                entry.best = entry.time1 || entry.time2 || entry.best;
            }
        } else {
            entry.time = d.time;
        }

        return entry;
    });

    appState.events[gender][dist].results = newResults;
    saveToStorage();

    showToast(`Successfully imported ${newResults.length} results into ${is500 ? targetColumn.toUpperCase() : 'Results'}!`);
    document.getElementById('isu-modal').remove();
    renderCurrentTab();
}

// UI Updater Hook
function updateAutoPilotBtn() {
    // 1. Update Modal Button (if open/exists)
    const btn = document.getElementById('autopilot-btn');
    const indicator = document.getElementById('live-status-indicator');

    // Check state
    const isAuto = appState.isuConfig && appState.isuConfig.autoSync;
    const hasMappings = appState.isuConfig && appState.isuConfig.mappings && Object.keys(appState.isuConfig.mappings).length > 0;

    // 2. Update Header Indicator
    if (indicator) {
        // Only show if Auto Pilot is ACTUALLY engaged
        if (isAuto) {
            indicator.style.display = 'inline-block';
            indicator.title = "Auto-Pilot Active: Scanning for results every 60s";
            indicator.classList.remove('pulse-eye'); // Remove pulse as requested
        } else {
            indicator.style.display = 'none';
        }
    }

    if (!btn) return;

    // Show button logic: Only visible to Admin or if configured
    if (appState.isAdmin || hasMappings) {
        btn.style.display = 'inline-block';
    } else {
        btn.style.display = 'none';
        return;
    }

    if (isAuto) {
        btn.innerHTML = '🔄 Auto-Pilot ON';
        btn.style.background = 'rgba(212, 175, 55, 0.2)'; // Goldish tint
        btn.style.color = '#D4AF37';
        btn.style.border = '1px solid #D4AF37';
        btn.classList.remove('pulse-eye'); // Remove pulse
    } else {
        btn.innerHTML = '🔄 Auto-Pilot OFF';
        btn.style.background = 'transparent';
        btn.style.color = '#555';
        btn.style.border = '1px solid #444';
        btn.classList.remove('pulse-eye');
    }
}
