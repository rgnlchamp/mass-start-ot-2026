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
                <button class="btn btn-warning w-100" onclick="previewIsuResults()">Preview Results</button>
            </div>

            <div id="isu-preview-container" style="margin-top:15px; display:none;">
                <h5 style="color:#ddd; margin-bottom:5px;">Data Preview</h5>
                <div id="isu-preview-content" style="max-height:150px; overflow-y:auto; background:#000; padding:10px; border:1px solid #333; font-family:monospace; font-size:0.8rem; margin-bottom:10px;"></div>
                <button class="btn btn-success w-100" onclick="commitIsuImport()">✅ Confirm Import</button>
                <button class="btn btn-outline-info w-100 mt-2" onclick="linkForAutoSync()">🔗 Link for Auto-Pilot (Updates Automatically)</button>
            </div>

            <div style="margin-top:20px; text-align:right;">
                <button class="btn btn-secondary" onclick="document.getElementById('isu-modal').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ... (Existing Functions) ...

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
    const eventId = document.getElementById('isu-event-id').value;

    // Save Config
    if (!appState.isuConfig) appState.isuConfig = {};
    appState.isuConfig.eventId = eventId;
    saveToStorage();

    // Try multiple generic ISU structures if one fails? For now, standard one.
    // Structure: https://live.isuresults.eu/api/events/{id}/schedule
    const targetUrl = `https://live.isuresults.eu/api/events/${eventId}/schedule`;

    const btn = document.querySelector('#isu-event-id + button');
    const originalText = btn.innerText;
    btn.innerText = 'Loading...';
    btn.disabled = true;

    try {
        const res = await fetch(`/api/isu-proxy?url=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) {
            if (res.status === 404) throw new Error('Proxy not found. Are you running the Live Tracker server?');
            throw new Error('Failed to fetch from ISU. Check Event ID.');
        }

        const data = await res.json();
        renderScheduleOptions(data);
    } catch (e) {
        alert("Error: " + e.message + "\n\nStep 1: Check your terminal is running 'Start Live Tracker'.\nStep 2: Check standard ISU Event ID.");
        console.error(e);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function renderScheduleOptions(data) {
    const select = document.getElementById('isu-race-select');
    select.innerHTML = '<option value="">-- Choose Race --</option>';

    // Handle different JSON structures
    let races = [];
    if (Array.isArray(data)) {
        races = data;
    } else if (data.competitions) {
        races = data.competitions;
    } else if (data.days) {
        // Nested days
        data.days.forEach(d => {
            if (d.competitions) races = races.concat(d.competitions);
        });
    }

    if (races.length === 0) {
        alert("No races found in schedule data.");
        return;
    }

    races.forEach(r => {
        const id = r.id; // Usually just 'id'
        const name = r.name || r.title || `Race ${id}`;
        select.innerHTML += `<option value="${id}">${name}</option>`;
    });

    document.getElementById('isu-schedule-container').style.display = 'block';
}

async function previewIsuResults() {
    const eventId = document.getElementById('isu-event-id').value;
    const competitionId = document.getElementById('isu-race-select').value;
    if (!competitionId) return;

    // Fetch Results
    // URL: https://live.isuresults.eu/api/events/{eventId}/competitions/{compId}/results
    const targetUrl = `https://live.isuresults.eu/api/events/${eventId}/competitions/${competitionId}/results`;

    try {
        const res = await fetch(`/api/isu-proxy?url=${encodeURIComponent(targetUrl)}`);
        const data = await res.json();

        // Process Data
        const parsed = parseIsuData(data);

        // Show Preview
        const previewEl = document.getElementById('isu-preview-content');
        if (parsed.length === 0) {
            previewEl.innerHTML = '<span style="color:orange">No results found or parsing failed. Check console.</span>';
        } else {
            previewEl.innerHTML = parsed.map(p =>
                `<div><span style="color:#D4AF37">${p.rank}.</span> <strong>${p.name}</strong> (${p.time})</div>`
            ).join('');

            // Store for commit
            currentImportConfig.stagedData = parsed;
            document.getElementById('isu-preview-container').style.display = 'block';
        }

    } catch (e) {
        alert("Error fetching results: " + e.message);
    }
}

function parseIsuData(data) {
    // Attempt to parse standard ISU JSON
    let entries = [];

    // Structure often: [ { rank: 1, competitor: { fullName: "..." }, result: "34.50" }, ... ]
    let list = Array.isArray(data) ? data : (data.results || []);

    entries = list.map(item => {
        const name = item.competitor ? (item.competitor.fullName || item.competitor.name) : (item.name || "Unknown");
        // Time parsing: might be in 'result', 'time', 'totalTime'
        const time = item.result || item.time || "NT";
        const rank = item.rank || 0;
        return { name: cleanName(name), time, rank };
    });

    return entries;
}

function cleanName(raw) {
    // ISU names are often "SURNAME Firstname". We want "Firstname Lastname" or similar?
    // App uses "Firstname Lastname".
    // Try to normalize if ALL CAPS SURNAME detected?
    // User data is usually title case.
    return raw; // Leave raw for now, admin can edit
}

function commitIsuImport() {
    if (!currentImportConfig.stagedData) return;

    const { gender, dist, stagedData } = currentImportConfig;

    // Save to AppState
    if (!appState.events[gender]) appState.events[gender] = {};
    if (!appState.events[gender][dist]) appState.events[gender][dist] = { results: [] };

    // Map to App Structure
    // simple structure: { id, name, time, rank }
    const newResults = stagedData.map((d, i) => ({
        id: 'isu-' + Date.now() + '-' + i,
        name: d.name,
        time: d.time,
        rank: d.rank
    }));

    appState.events[gender][dist].results = newResults;
    saveToStorage();

    showToast(`Successfully imported ${newResults.length} results!`);
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
