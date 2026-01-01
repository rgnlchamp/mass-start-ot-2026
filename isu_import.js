let currentImportConfig = { gender: null, dist: null };

function openIsuImportModal(gender, dist) {
    currentImportConfig = { gender, dist };
    const savedEventId = (appState.isuConfig && appState.isuConfig.eventId) ? appState.isuConfig.eventId : '2026_USA_0002';

    const modal = document.createElement('div');
    modal.id = 'isu-modal';
    modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center; backdrop-filter:blur(5px);`;

    modal.innerHTML = `
        <div style="background:#1a1a2e; border:1px solid #D4AF37; color:#fff; padding:25px; width:500px; max-width:90%; border-radius:12px; box-shadow: 0 0 30px rgba(0,0,0,0.8);">
            <h3 style="color:#D4AF37; margin-top:0;">📡 Import Live Results</h3>
            <div style="color:#aaa; font-size:0.9rem; margin-bottom:20px;">
                Importing to: <strong style="color:#fff">${gender.toUpperCase()} ${dist}</strong><br>
                <i style="font-size:0.8em">Requires "Start Live Tracker.bat"</i>
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
                        <option value="time1">Race 1</option>
                        <option value="time2">Race 2</option>
                        <option value="best">Best Time (Direct Overwrite)</option>
                    </select>
                </div>
                ` : ''}

                <button class="btn btn-warning w-100" onclick="previewIsuResults()">Preview Results</button>
            </div>

            <div id="isu-preview-container" style="margin-top:15px; display:none;">
                <h5 style="color:#ddd; margin-bottom:5px;">Data Preview</h5>
                <div id="isu-preview-content" style="max-height:150px; overflow-y:auto; background:#000; padding:10px; border:1px solid #333; font-family:monospace; font-size:0.8rem; margin-bottom:10px;"></div>
                <button class="btn btn-success w-100" onclick="commitIsuImport()">✅ Confirm Import</button>
                <button class="btn btn-outline-info w-100 mt-2" onclick="linkForAutoSync()">🔗 Link for Auto-Pilot (Updates Automatically)</button>
            </div>

            <div id="isu-status" style="margin-top:15px; padding:10px; border-radius:6px; font-size:0.85rem; display:none;"></div>

            <div style="margin-top:20px; text-align:right;">
                <button class="btn btn-secondary" onclick="document.getElementById('isu-modal').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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
    const key = `${gender}_${dist}`;
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
            const url = `https://live.isuresults.eu/api/events/${map.eventId}/competitions/${map.competitionId}/results`;
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
                    rank: d.rank
                }));

                appState.events[gender][dist].results = newResults;
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
        `https://live.isuresults.eu/api/events/${eventId}/competitions/${competitionId}/results`
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
        const rawTime = item.time || item.result || item.totalTime || "NT";
        const rank = item.rank || 0;

        return { name: cleanName(name), time: cleanTime(rawTime), rank };
    });

    return entries;
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
    const btn = document.getElementById('autopilot-btn');
    if (!btn) return;

    // Show if Admin OR if mapping exists
    const hasMappings = appState.isuConfig && appState.isuConfig.mappings && Object.keys(appState.isuConfig.mappings).length > 0;

    if (appState.isAdmin || hasMappings) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
        return;
    }

    if (appState.isuConfig && appState.isuConfig.autoSync) {
        btn.innerHTML = '🔄 Auto-Pilot ON';
        btn.style.background = 'rgba(0, 255, 0, 0.2)';
        btn.style.color = '#4ade80';
        btn.style.border = '1px solid #4ade80';
        btn.classList.add('pulse-eye');
    } else {
        btn.innerHTML = '🔄 Auto-Pilot OFF';
        btn.style.background = '#222';
        btn.style.color = '#888';
        btn.style.border = '1px solid #444';
        btn.classList.remove('pulse-eye');
    }
}
