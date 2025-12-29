
// Mass Start & Olympic Trials Live Tracker
// Expanded to cover all distances

// =============================================================================
// STATE & INIT
// =============================================================================
let appState = {
    athletes: [],
    // Specialized Mass Start Detailed Data
    msRaces: {
        women: { 1: null, 2: null, 3: null, 4: null },
        men: { 1: null, 2: null, 3: null, 4: null }
    },
    // Generic Event Results (Ranked Lists for each distance)
    events: {
        women: {},
        men: {}
    },
    currentTab: 'dashboard',
    viewGender: 'women',
    viewDistance: '500m',
    selectedMsRace: 3,
    isAdmin: false
};

// Points Constants
const INTERMEDIATE_POINTS = [3, 2, 1];
const FINAL_SPRINT_POINTS = [60, 40, 20, 10, 6, 3];
const ACRS_POINTS = [
    60, 54, 48, 43, 40, 38, 36, 34, 32, 31,
    30, 29, 28, 27, 26, 25, 24, 23, 22, 21,
    20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
    10, 9, 8, 7, 6, 5, 4, 3, 2, 1
];
const SPRINT_POINTS = {
    16: { intermediate: [3, 2, 1], final: [60, 40, 20, 10, 6, 3], intermediateLaps: [4, 8, 12] },
    10: { intermediate: [3, 2, 1], final: [30, 20, 10, 4, 2, 1], intermediateLaps: [4, 7] }
};

document.addEventListener('DOMContentLoaded', () => {
    initializeState();
    setupNavigation();
    renderCurrentTab();
});

function initializeState() {
    ['women', 'men'].forEach(gender => {
        if (!appState.events[gender]) appState.events[gender] = {};
        Object.keys(OLYMPIC_CONFIG[gender]).forEach(dist => {
            if (!appState.events[gender][dist]) {
                appState.events[gender][dist] = { results: [], status: 'pending' };
            }
        });
    });
    loadFromStorage();
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem('olympicTrials_v1');
        if (saved) {
            const data = JSON.parse(saved);
            appState.athletes = data.athletes || [];
            appState.msRaces = data.msRaces || appState.msRaces;

            if (data.events) {
                ['women', 'men'].forEach(gender => {
                    Object.keys(OLYMPIC_CONFIG[gender]).forEach(dist => {
                        if (data.events && data.events[gender] && data.events[gender][dist]) {
                            appState.events[gender][dist] = data.events[gender][dist];
                        }
                    });
                });
            }
        } else {
            const legacy = localStorage.getItem('massStartData_v2');
            if (legacy) {
                const lData = JSON.parse(legacy);
                appState.athletes = lData.athletes || [];
                if (lData.races) appState.msRaces = lData.races;
                console.log('Migrated legacy Mass Start data');
                saveToStorage();
            } else if (typeof PRELOADED_DATA !== 'undefined') {
                appState.athletes = PRELOADED_DATA.athletes;
                appState.msRaces = PRELOADED_DATA.races;
                saveToStorage();
            }
        }
    } catch (e) { console.error('Error loading data:', e); }
}

function saveToStorage() {
    localStorage.setItem('olympicTrials_v1', JSON.stringify({
        athletes: appState.athletes,
        msRaces: appState.msRaces,
        events: appState.events
    }));
}

function setupNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            appState.currentTab = tab.dataset.tab;
            renderCurrentTab();
        });
    });
}

// =============================================================================
// RENDERING
// =============================================================================
function renderCurrentTab() {
    const main = document.getElementById('main-content');
    document.body.dataset.tab = appState.currentTab;

    switch (appState.currentTab) {
        case 'dashboard': main.innerHTML = renderDashboard(); break;
        case 'olympic': main.innerHTML = renderOlympicTeamTracker(); break;
        case 'events': main.innerHTML = renderEventEntry(); break;
        case 'athletes': main.innerHTML = renderAthletes(); break;
        case 'help': main.innerHTML = renderRules(); break;
    }

    // Post-render hooks
    if (appState.currentTab === 'events') {
        const gender = appState.viewGender;
        const dist = appState.viewDistance;
        const config = OLYMPIC_CONFIG[gender][dist];
        if (config && config.isMassStartPoints) {
            renderMsEntryForm(appState.selectedMsRace);
        }
    }
}


function renderDashboard() {
    // Get quick stats
    const menStats = calculateReduction('men');
    const womenStats = calculateReduction('women');

    // Calculate filled spots actually on the team (after cuts)
    const menCount = Math.min(menStats.roster.length, menStats.teamCap);
    const womenCount = Math.min(womenStats.roster.length, womenStats.teamCap);

    return `
        <div class="section-header">
            <h2>📊 Dashboard</h2>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">🦅</div>
                <div class="stat-info">
                    <span class="stat-value">Team USA</span>
                    <span class="stat-label">Olympic Trials</span>
                </div>
            </div>
             <div class="stat-card">
                <div class="stat-icon">♂️</div>
                <div class="stat-info">
                    <span class="stat-value">${menCount} / ${menStats.teamCap}</span>
                    <span class="stat-label">Men's Team</span>
                </div>
            </div>
             <div class="stat-card">
                <div class="stat-icon">♀️</div>
                <div class="stat-info">
                    <span class="stat-value">${womenCount} / ${womenStats.teamCap}</span>
                    <span class="stat-label">Women's Team</span>
                </div>
            </div>
             <div class="stat-card">
                <div class="stat-icon">👤</div>
                <div class="stat-info">
                    <span class="stat-value">${menCount + womenCount}</span>
                    <span class="stat-label">Total Team Size</span>
                </div>
            </div>
        </div>
        
        </div>
        
        <div class="mt-2">
            ${renderOlympicTeamTracker()}
        </div>
    `;
}


function switchToTab(tab) {
    appState.currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    renderCurrentTab();
}


// =============================================================================
// OLYMPIC TEAM TRACKER (WITH REDUCTION LOGIC)
// =============================================================================
function renderOlympicTeamTracker() {
    try {
        const gender = appState.viewGender;
        // Calculate the full team with reduction
        const { roster, teamCap } = calculateReduction(gender);

        const qualifiedCount = roster.length;
        const cutCount = Math.max(0, qualifiedCount - teamCap);
        const onTeamCount = Math.min(qualifiedCount, teamCap);

        // Determine Bubble Context
        let statusMessage = "";
        let statusClass = "";
        if (cutCount > 0) {
            statusMessage = `⚠️ <strong>Reduction Active:</strong> ${cutCount} athlete(s) must be cut to meet the ${teamCap}-person cap.`;
            statusClass = "alert-error";
        } else if (qualifiedCount === teamCap) {
            statusMessage = `✅ <strong>Team Full:</strong> Roster is at exactly ${teamCap} athletes.`;
            statusClass = "alert-success";
        } else {
            statusMessage = `ℹ️ <strong>Open Spots:</strong> ${teamCap - qualifiedCount} roster spots remaining before reduction is needed.`;
            statusClass = "alert-info";
        }

        return `
            <div class="section-header">
                <h2>2026 Olympic Team Tracker</h2>
                <div class="btn-group">
                    <button class="btn ${gender === 'women' ? 'btn-primary' : 'btn-outline-primary'}" 
                        onclick="appState.viewGender='women'; renderCurrentTab()">Women</button>
                    <button class="btn ${gender === 'men' ? 'btn-primary' : 'btn-outline-primary'}" 
                        onclick="appState.viewGender='men'; renderCurrentTab()">Men</button>
                </div>
            </div>
            
            <!-- DASHBOARD SUMMARY -->
            <div class="stats-grid mb-2">
                <div class="stat-card ${cutCount > 0 ? 'border-error' : ''}">
                    <div class="stat-icon">${cutCount > 0 ? '✂️' : '👥'}</div>
                    <div class="stat-info">
                        <span class="stat-value">${onTeamCount} / ${teamCap}</span>
                        <span class="stat-label">Roster Size</span>
                    </div>
                </div>
                 <div class="stat-card">
                    <div class="stat-icon">🛡️</div>
                    <div class="stat-info">
                        <span class="stat-value">${roster.filter(r => r.reductionRank === 0).length}</span>
                        <span class="stat-label">Protected</span>
                    </div>
                </div>
            </div>
            
            <div class="card ${statusClass} mb-2" style="border-left: 5px solid; padding:15px;">
                ${statusMessage}
            </div>

            <div class="card mb-2">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>Predicted Team Roster</h3>
                    <span class="text-muted text-sm">Sorted by Reduction Priority (1 = Protected/Highest)</span>
                </div>
                
                <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:50px">Row</th>
                            <th>Athlete</th>
                            <th>Qualifying Basis</th>
                            <th>Priority Rank</th>
                            <th>Status</th>
                            <th style="width:60px">Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${roster.slice(0, teamCap).map((t, idx) => {
            let displayRank = t.reductionRank === 0 ? '1 (Protected)' : t.reductionRank;

            // Custom Display for Team Pursuit (User Request)
            if (t.events.includes('TpSpec')) {
                const tpRank = (gender === 'women') ? 3 : 1;
                displayRank = `${tpRank} (Protected)`;
            }

            return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td><strong>${t.name}</strong></td>
                                <td>${t.events.map(e => `<span class="badge ${e === 'TpSpec' ? 'badge-warn' : ''}">${e === 'TpSpec' ? 'Team Pursuit' : e}</span>`).join(' ')}</td>
                                <td><strong>${displayRank}</strong></td>
                                <td>
                                    ${t.reductionRank === 0 ? '<span class="status-qualified">🔒 Protected</span>' : '<span class="status-qualified">✅ On Team</span>'}
                                </td>
                                <td>
                                    ${!t.name.includes("Slot") && !t.name.includes("Available") ?
                    `<button class="btn btn-sm" onclick="openShareModal('${t.name}')" style="background:#D4AF37; padding:2px 8px; font-size:12px;">📸</button>`
                    : ''}
                                </td>
                            </tr>
                        `;
        }).join('')}
                        ${roster.length === 0 ? '<tr><td colspan="5" class="text-muted text-center">No athletes qualified yet. Enter results to see projections.</td></tr>' : ''}
                    </tbody>
                </table>
                </div>
            </div>

            <div class="card">
                <h3>Distance Breakdown & Quota Tracking</h3>
                ${renderDistanceBreakdown(gender)}
            </div>
        `;
    } catch (e) {
        console.error("Render Error:", e);
        return `<div class="card alert-error"><h3>Error Loading Tracker</h3><p>${e.message}</p><pre>${e.stack}</pre></div>`;
    }
}


function calculateReduction(gender) {
    const rosterMap = {}; // name -> {name, events: [], rank: 999}
    const teamCap = OLYMPIC_CONFIG.TEAM_CAP[gender];

    // 1. Ingest all qualifiers
    Object.keys(OLYMPIC_CONFIG[gender]).forEach(dist => {
        const config = OLYMPIC_CONFIG[gender][dist];
        let qualifiers = [];

        // A. Pre-Nominated
        // Direct Noms are protected (Rank 0), but Casey Dawson 10k matches SOQC 
        config.preNominated.forEach(name => {
            let protection = 0; // Default Direct Nom
            if (dist === '10000m' && name === 'Casey Dawson') protection = 4; // Special rule for CASEY
            qualifiers.push({ name, ranking: protection, type: 'Direct' });
        });

        // B. Trials Qualifiers
        let trialsResults = [];
        if (dist === 'mass_start') {
            // Rule: Mass Start qualifiers only count after Race #4 is complete
            const race4 = appState.msRaces[gender]?.[4];
            const isRace4Done = race4 && race4.finishOrder && race4.finishOrder.length > 0;

            if (isRace4Done) {
                const msR = calculateMassStartStandings(gender);
                trialsResults = msR.map((r, i) => ({ name: r.name, rank: i + 1 }));
            } else {
                trialsResults = []; // No trials qualifiers until series is finished
            }
        } else if (dist === 'team_pursuit') {
            // Team Pursuit Specialists & Placeholders
            const specialists = appState.events[gender]['team_pursuit']?.results || [];
            const conversion = OLYMPIC_CONFIG.TP_CONVERSION[gender]; // 0 (Protected)

            // 1. Add Named Specialists
            specialists.forEach(s => {
                qualifiers.push({ name: s.name, ranking: conversion, type: 'TpSpec' });
            });

            // 2. Add Placeholders for empty spots (Up to Quota 3)
            // This ensures the 3 protected spots are visible in the roster immediately
            for (let i = specialists.length; i < config.quota; i++) {
                qualifiers.push({ name: `Team Pursuit Slot ${i + 1}`, ranking: conversion, type: 'TpSpec' });
            }
        } else {
            trialsResults = (appState.events[gender][dist].results || []).sort((a, b) => a.rank - b.rank);
        }

        // Add standard event qualifiers
        let slotsFilledByPreNoms = 0;
        config.preNominated.forEach(pName => {
            // Only count if they are actually in the trials results (i.e., they took a spot)
            // This logic might need refinement based on exact rules if pre-noms don't "take" a trials spot
            // For now, assume they consume a slot from the quota.
            slotsFilledByPreNoms++;
        });


        // Filter out pre-noms from trials results to find who takes the spots
        const trialsQualifiers = trialsResults.filter(r => !config.preNominated.includes(r.name));

        // We need to assign slots.
        // config.soqcRanks is 0-indexed for the slots (0 = Spot #1, 1 = Spot #2, etc.)
        let slotIndex = 0;

        // First, assign slots to Pre-Noms.
        // Important: Pre-noms take the *best* slots available.
        config.preNominated.forEach(p => {
            // They take a slot, but the 'ranking' they carry in the roster is their Protected Status (Rank 0 internally), not the slot's SOQC.
            // However, they CONSUME the slot so the next person gets the Next Best Slot.
            slotIndex++;
        });

        // Now assign remaining slots to Trials finishers
        trialsQualifiers.forEach(q => {
            if (slotIndex < config.quota) {
                // They got a spot!
                const soqc = config.soqcRanks[slotIndex] || 99;
                qualifiers.push({ name: q.name, ranking: soqc, type: 'Trials' });
                slotIndex++;
            }
        });

        // C. Merge into Roster Map
        qualifiers.forEach(q => {
            if (!rosterMap[q.name]) {
                const isSpecialCasey = (q.name === 'Casey Dawson');
                rosterMap[q.name] = {
                    name: q.name,
                    events: [],
                    reductionRank: isSpecialCasey ? 4 : 999
                };
            }

            const p = rosterMap[q.name];
            p.events.push(dist === 'team_pursuit' ? 'TpSpec' : dist);

            // Check Protection
            // INTERNAL LOGIC: 0 is Protected. Visuals will show 1.
            // If Mass Start: 2nd spot is NOT protected. It gets the SOQC rank (e.g., 16 or 15).
            // Pre-Noms are protected (0).

            if (q.ranking === 0 || (config.preNominated.includes(q.name) && q.name !== 'Casey Dawson')) {
                p.reductionRank = 0; // Protected
            } else {
                // Take the BEST (lowest) SOQC rank they have earned
                if (q.ranking < p.reductionRank) {
                    p.reductionRank = q.ranking;
                }
            }
        });
    });

    // 2. Sort buffer
    // Primary: Reduction Rank (Ascending) -> 0 is best
    // Secondary: If tied? Tiebreaker rules.
    // Rule: "Higher total WC points", "Faster combined WC times", "Best individual finish"
    // Since we don't have WC points data here, we'll just allow ties effectively or stable sort.

    const sortedRoster = Object.values(rosterMap).sort((a, b) => a.reductionRank - b.reductionRank);

    // 3. Mark cuts
    // (Handled in the render function by index comparison with Team Cap)

    return { roster: sortedRoster, teamCap };
}

function renderDistanceBreakdown(gender) {
    // ... Simplified logic to match the new Reduction engine ...
    // To save space in this function replacement, I will keep the structure similar to before but updated
    return `
        <div class="breakdown-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
        ${Object.keys(OLYMPIC_CONFIG[gender]).map(dist => {
        const config = OLYMPIC_CONFIG[gender][dist];

        // Re-calc who got what spot for display
        let qualifiers = [];
        config.preNominated.forEach(n => qualifiers.push({ name: n, type: 'Direct' }));

        if (dist === 'team_pursuit') {
            (appState.events[gender]['team_pursuit']?.results || []).forEach(r => {
                qualifiers.push({ name: r.name, type: 'Protected' });
            });
        } else {
            let trialsResults = [];
            if (dist === 'mass_start') {
                // Rule: Mass Start qualifiers only count after Race #4 is complete
                const race4 = appState.msRaces[gender]?.[4];
                const isRace4Done = race4 && race4.finishOrder && race4.finishOrder.length > 0;

                if (isRace4Done) {
                    const msR = calculateMassStartStandings(gender);
                    trialsResults = msR.map((r, i) => ({ name: r.name }));
                } else {
                    trialsResults = []; // No qualifiers yet
                }
            } else {
                trialsResults = (appState.events[gender][dist].results || []);
            }
            // Filter Pre-noms
            const realTrials = trialsResults.filter(r => !config.preNominated.includes(r.name));
            // Fill remaining quota
            let spotsLeft = config.quota - config.preNominated.length;
            realTrials.forEach(r => {
                if (spotsLeft > 0) {
                    qualifiers.push({ name: r.name, type: 'Trials' });
                    spotsLeft--;
                }
            });
        }

        // Fillers
        let displayList = [...qualifiers];
        let totalQuota = config.quota;
        // Team Pursuit now shows open spots (Quota 3) - suppression removed
        while (displayList.length < totalQuota) {
            if (dist === 'team_pursuit') {
                displayList.push({ name: 'Available', type: 'Protected Slot' });
            } else {
                displayList.push({ name: 'Available', type: 'Open' });
            }
        }

        return `
                <div class="result-box" style="border:1px solid #ddd; padding:10px; border-radius:8px;">
                     <h4 style="margin:0 0 5px 0; border-bottom:2px solid #eee; padding-bottom:5px; display:flex; justify-content:space-between;">
                        ${dist} <span>Quota: ${config.quota}</span>
                    </h4>
                    <ul style="list-style:none; padding:0; margin:0;">
                         ${displayList.map(s => `
                            <li style="padding:4px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:500">${s.name}</span>
                                <span class="badge" style="background:${(s.type === 'Direct' || s.type === 'Protected') ? '#d9534f' : s.type === 'Protected Slot' ? '#ffcccc' : s.type === 'Open' ? '#eee' : '#5cb85c'}; color:${(s.type === 'Open' || s.type === 'Protected Slot') ? '#555' : '#fff'}">${s.type}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
    }).join('')}
        </div>
    `;
}


// =============================================================================
// EVENT ENTRY
// =============================================================================
function renderEventEntry() {
    const gender = appState.viewGender;
    const dist = appState.viewDistance;
    const config = OLYMPIC_CONFIG[gender][dist];

    let content = `
        <div class="section-header"><h2>Event Data Entry</h2></div>
        ${renderEventSelectors()}
        <hr class="my-2">
    `;

    if (config && config.isMassStartPoints) {
        content += `
            <div class="card alert-info mb-2">
                <h4>Mass Start Manager</h4>
                <p>Detailed Points System Active</p>
            </div>
            <div class="race-tabs mb-1">
                ${[1, 2, 3, 4].map(r => `
                    <button class="race-tab ${appState.selectedMsRace === r ? 'active' : ''}" 
                    onclick="appState.selectedMsRace=${r}; renderCurrentTab()">Race ${r}</button>
                `).join('')}
            </div>
            <div id="ms-entry-container"></div>
        `;
    } else {
        const isTP = (dist === 'team_pursuit');
        const results = appState.events[gender][dist].results || [];
        results.sort((a, b) => a.rank - b.rank);

        // Prepare datalist for autocomplete
        const existingAthletes = appState.athletes.filter(a => a.gender === gender);
        const dataListHtml = `
            <datalist id="athlete-names">
                ${existingAthletes.map(a => `<option value="${a.name}">`).join('')}
            </datalist>
        `;

        content += `
            <div class="card mt-2">
                <h3>🏁 ${gender === 'women' ? "Women's" : "Men's"} ${dist}</h3>
                <p class="text-muted">${isTP ? "Type names of Team Pursuit Specialists." : "Type names in finishing order (1st, 2nd, etc). New names will be auto-added."}</p>
                
                <div class="form-group mb-1 p-2" style="background:#f9f9f9; border-radius:8px;">
                     <div style="display:flex; gap:10px; align-items:center;">
                        <span style="font-weight:bold; font-size:1.2em; width:30px; text-align:center;">${results.length + 1}.</span>
                        <div style="flex:2">
                            <input type="text" id="athlete-input" list="athlete-names" class="form-control" placeholder="Type Athlete Name" autocomplete="off">
                            ${dataListHtml}
                        </div>
                        ${!isTP ? `<div style="flex:1">
                            <input type="text" id="manual-time" class="form-control" placeholder="Time (Optional)">
                        </div>` : ''}
                        <button class="btn btn-primary" onclick="addEventResult()">Add</button>
                    </div>
                </div>

                <table class="data-table mt-1">
                    <thead><tr><th style="width:50px">Rank</th><th>Athlete</th>${!isTP ? '<th>Time</th>' : ''}<th>Action</th></tr></thead>
                    <tbody>
                        ${results.map((r, i) => `
                            <tr>
                                <td>${r.rank}</td>
                                <td>${r.name}</td>
                                ${!isTP ? `<td>${r.time || '-'}</td>` : ''}
                                <td><button class="btn btn-sm btn-danger" onclick="removeEventResult(${i})"> Remove</button></td>
                            </tr>
                        `).join('')}
                        ${results.length === 0 ? `<tr><td colspan="4" class="text-center text-muted">No entries yet.</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
    }
    return content;
}

function renderEventSelectors() {
    return `
        <div class="filter-bar">
            <div class="filter-group">
                <label>Gender:</label>
                <select class="form-control" onchange="appState.viewGender=this.value; renderCurrentTab()">
                    <option value="women" ${appState.viewGender === 'women' ? 'selected' : ''}>Women</option>
                    <option value="men" ${appState.viewGender === 'men' ? 'selected' : ''}>Men</option>
                </select>
            </div>
             <div class="filter-group">
                <label>Distance:</label>
                <select class="form-control" onchange="setDistance(this.value)">
                    ${Object.keys(OLYMPIC_CONFIG[appState.viewGender]).map(d =>
        `<option value="${d}" ${appState.viewDistance === d ? 'selected' : ''}>${d}</option>`
    ).join('')}
                </select>
            </div>
        </div>
    `;
}

function setDistance(val) {
    appState.viewDistance = val;
    renderCurrentTab();
}

function addEventResult() {
    const nameInput = document.getElementById('athlete-input');
    const name = nameInput.value.trim();
    if (!name) return;

    // Time is optional
    const timeInput = document.getElementById('manual-time');
    const time = timeInput ? timeInput.value : '';

    // Find or Create Athlete
    let athlete = appState.athletes.find(a => a.name.toLowerCase() === name.toLowerCase() && a.gender === appState.viewGender);

    if (!athlete) {
        // Auto-create
        athlete = {
            id: Date.now().toString(),
            name: name, // Use typed name (preserve case)
            nation: 'USA',
            gender: appState.viewGender
        };
        appState.athletes.push(athlete);
        // Don't save yet, will save at end of function
    }

    const currentResults = appState.events[appState.viewGender][appState.viewDistance].results || [];

    // Check duplicates
    if (currentResults.some(r => r.name.toLowerCase() === name.toLowerCase())) {
        alert('Athlete already added to this event.');
        return;
    }

    // Add Result
    const rank = currentResults.length + 1;
    appState.events[appState.viewGender][appState.viewDistance].results.push({
        id: athlete.id,
        name: athlete.name,
        rank: rank,
        time: time
    });

    saveToStorage();
    renderCurrentTab();

    // Refocus for next entry
    setTimeout(() => {
        const input = document.getElementById('athlete-input');
        if (input) input.focus();
    }, 50);
}

function removeEventResult(index) {
    const results = appState.events[appState.viewGender][appState.viewDistance].results;
    results.splice(index, 1);

    // Re-calculate ranks
    results.forEach((r, idx) => {
        r.rank = idx + 1;
    });

    saveToStorage();
    renderCurrentTab();
}


// =============================================================================
// MASS START SPECIFIC LOGIC
// =============================================================================
function renderMsEntryForm(raceNum) {
    const gender = appState.viewGender;
    const raceData = appState.msRaces[gender][raceNum];
    const format = (raceNum === 1 || raceNum === 2) ? 16 : 16; // Assumption: All 16 laps for now or selectable
    const sprintConfig = SPRINT_POINTS[16];

    const container = document.getElementById('ms-entry-container');
    if (!container) return; // Should not happen

    const athletes = appState.athletes.filter(a => a.gender === gender).sort((a, b) => a.name.localeCompare(b.name));

    let html = `
        <div class="card p-2">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Entry Form: Race ${raceNum}</h3>
                <button class="btn btn-success" onclick="submitMsRace(${raceNum}, '${gender}', 16)">💾 Save Results</button>
            </div>
            
            <h4 class="mt-1">Intermediate Sprints</h4>
            ${sprintConfig.intermediateLaps.map((lap, idx) => `
                <div class="sprint-row" style="margin-bottom:5px;">
                    <span style="width:60px; display:inline-block;">Lap ${lap}</span>
                    <select id="int${idx + 1}_1st" class="form-control w-auto d-inline">${athleteOptions(athletes, '1st')}</select>
                    <select id="int${idx + 1}_2nd" class="form-control w-auto d-inline">${athleteOptions(athletes, '2nd')}</select>
                    <select id="int${idx + 1}_3rd" class="form-control w-auto d-inline">${athleteOptions(athletes, '3rd')}</select>
                </div>
            `).join('')}
            
            <h4 class="mt-2">Finish Order</h4>
            <div style="display:flex; gap:10px; margin-bottom:5px; font-size:0.85em; font-weight:bold; color:#555;">
                <span style="width:150px;">Athlete</span>
                <span style="width:100px;">Status</span>
                <span style="width:70px;">Pos</span>
                <span style="width:80px;">Time</span>
            </div>
            <div id="finish-rows">
                ${athletes.map(a => `
                    <div style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
                        <span style="width:150px; font-weight:bold;">${a.name}</span>
                        <select id="status_${a.id}" class="form-control p-1" style="width:100px;">
                            <option value="finished">Finished</option>
                            <option value="dnf">DNF</option>
                            <option value="dsq">DSQ</option>
                            <option value="dns">DNS</option>
                        </select>
                        <select id="pos_${a.id}" class="form-control p-1 pos-select" style="width:70px;" onchange="updateMsDropdowns()">
                            <option value="">-</option>
                            ${Array.from({ length: athletes.length }, (_, i) => i + 1).map(n => `<option value="${n}">${n}</option>`).join('')}
                        </select>
                        <input type="text" id="time_${a.id}" class="form-control p-1" placeholder="Time" style="width:80px;">
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Restore values if exist
    if (raceData && raceData.intermediates) {
        raceData.intermediates.forEach((int, i) => {
            if (document.getElementById(`int${i + 1}_1st`)) document.getElementById(`int${i + 1}_1st`).value = int.first || '';
            if (document.getElementById(`int${i + 1}_2nd`)) document.getElementById(`int${i + 1}_2nd`).value = int.second || '';
            if (document.getElementById(`int${i + 1}_3rd`)) document.getElementById(`int${i + 1}_3rd`).value = int.third || '';
        });
    }
    if (raceData && raceData.finishOrder) {
        raceData.finishOrder.forEach(f => {
            if (document.getElementById(`status_${f.athleteId}`)) {
                document.getElementById(`status_${f.athleteId}`).value = f.status;
                const posEl = document.getElementById(`pos_${f.athleteId}`);
                if (posEl) posEl.value = f.position || '';
                document.getElementById(`time_${f.athleteId}`).value = f.time || '';
            }
        });
    }

    // Validate dropdowns after load
    updateMsDropdowns();
}

function updateMsDropdowns() {
    const selects = document.querySelectorAll('.pos-select');
    const usedValues = new Set();

    // Collect currently selected values
    selects.forEach(s => {
        if (s.value) usedValues.add(s.value);
    });

    // Update availability
    selects.forEach(s => {
        Array.from(s.options).forEach(opt => {
            if (!opt.value) return; // Skip empty placeholder

            // Disable if used by SOMEONE ELSE (used set has it, but it's not THIS select's current value)
            if (usedValues.has(opt.value) && s.value !== opt.value) {
                opt.disabled = true;
                opt.innerText = opt.value + " (Taken)";
            } else {
                opt.disabled = false;
                opt.innerText = opt.value;
            }
        });
    });
}

function submitMsRace(raceNum, gender, format) {
    const sprintConfig = SPRINT_POINTS[format];
    const numIntermediates = sprintConfig.intermediateLaps.length;

    // 1. Intermediates
    const intermediates = [];
    for (let i = 0; i < numIntermediates; i++) {
        intermediates.push({
            lap: sprintConfig.intermediateLaps[i],
            first: document.getElementById(`int${i + 1}_1st`).value,
            second: document.getElementById(`int${i + 1}_2nd`).value,
            third: document.getElementById(`int${i + 1}_3rd`).value
        });
    }

    // 2. Finish
    const finishOrder = [];
    appState.athletes.filter(a => a.gender === gender).forEach(a => {
        const status = document.getElementById(`status_${a.id}`).value;
        const pos = document.getElementById(`pos_${a.id}`).value;
        const time = document.getElementById(`time_${a.id}`).value;

        if (pos || status !== 'finished') {
            finishOrder.push({
                athleteId: a.id,
                status: status,
                position: pos ? parseInt(pos) : null,
                time: time
            });
        }
    });

    const results = calculateRacePoints(finishOrder, intermediates, sprintConfig);

    appState.msRaces[gender][raceNum] = {
        raceNum, gender, format,
        intermediates, finishOrder, results,
        date: new Date().toISOString()
    };

    saveToStorage();
    alert('Mass Start Race Saved!');
    renderCurrentTab();
}

function calculateRacePoints(finishOrder, intermediates, sprintConfig) {
    const results = {};
    finishOrder.forEach(f => {
        results[f.athleteId] = {
            intermediatePoints: 0, sprints: [], finalPoints: 0, totalRacePoints: 0,
            finishPosition: f.position, time: f.time, status: f.status
        };
    });

    intermediates.forEach((int, idx) => {
        [int.first, int.second, int.third].forEach((id, place) => {
            if (id && results[id]) {
                const pts = sprintConfig.intermediate[place];
                results[id].intermediatePoints += pts;
            }
        });
    });

    finishOrder.forEach(f => {
        if (f.status === 'finished' && f.position <= sprintConfig.final.length) {
            results[f.athleteId].finalPoints = sprintConfig.final[f.position - 1];
        }
    });

    Object.values(results).forEach(r => r.totalRacePoints = r.intermediatePoints + r.finalPoints);

    // Sort and Rank
    const sorted = Object.entries(results).sort((a, b) => {
        if (b[1].totalRacePoints !== a[1].totalRacePoints) return b[1].totalRacePoints - a[1].totalRacePoints;
        return (a[1].finishPosition || 999) - (b[1].finishPosition || 999);
    });

    sorted.forEach(([id, r], idx) => {
        r.rank = idx + 1;
        r.acrsPoints = (idx < ACRS_POINTS.length) ? ACRS_POINTS[idx] : 1;
    });

    return results;
}

function calculateMassStartStandings(gender) {
    const athleteScores = {};
    appState.athletes.filter(a => a.gender === gender).forEach(a => {
        athleteScores[a.id] = { id: a.id, name: a.name, races: {}, total: 0 };
    });

    [1, 2, 3, 4].forEach(raceNum => {
        const race = appState.msRaces[gender][raceNum];
        if (race && race.results) {
            Object.entries(race.results).forEach(([id, r]) => {
                if (athleteScores[id]) athleteScores[id].races[raceNum] = r.acrsPoints;
            });
        }
    });

    Object.values(athleteScores).forEach(s => {
        // Simple Total for now - implement "Best 3 of 4" if needed strictly
        s.total = Object.values(s.races).reduce((sum, v) => sum + v, 0);
    });

    // Sort by total points descending
    return Object.values(athleteScores).sort((a, b) => b.total - a.total);
}

// =============================================================================
// ATHLETES
// =============================================================================
function renderAthletes() {
    return `
        <div class="section-header">
            <h2>Athlete Management</h2>
            <button class="btn btn-primary" onclick="openAthleteModal()">➕ Add Athlete</button>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Name</th><th>Nation</th><th>Gender</th>${appState.isAdmin ? '<th>Actions</th>' : ''}</tr></thead>
                <tbody>
                    ${appState.athletes.map((a, i) => `
                        <tr>
                            <td><strong>${a.name}</strong></td>
                            <td>${a.nation}</td>
                            <td>${a.gender}</td>
                            ${appState.isAdmin ? `
                            <td>
                                <button class="btn btn-sm btn-outline-primary" onclick="editAthlete(${i})">Edit</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteAthlete(${i})">Del</button>
                            </td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>


    `;
}

function editAthlete(idx) {
    const athlete = appState.athletes[idx];
    if (!athlete) return;

    const newName = prompt("Edit Name:", athlete.name);
    if (newName && newName.trim() !== "" && newName !== athlete.name) {
        // Update Athlete Record
        athlete.name = newName.trim();

        // Update References in standard events (where name is cached)
        ['women', 'men'].forEach(gender => {
            Object.keys(appState.events[gender]).forEach(dist => {
                const results = appState.events[gender][dist].results;
                if (results) {
                    results.forEach(r => {
                        if (r.id === athlete.id) {
                            r.name = athlete.name;
                        }
                    });
                }
            });
        });

        // Mass start uses ID references, so it picks up the new name automatically on render.

        saveToStorage();
        renderCurrentTab();
    }
}

function openAthleteModal() {
    const name = prompt("Athlete Name:");
    if (!name) return;
    const gender = prompt("Gender (women/men):", "women").toLowerCase();
    const nation = "USA";
    appState.athletes.push({ id: Date.now().toString(), name, nation, gender });
    saveToStorage();
    renderCurrentTab();
}

function deleteAthlete(idx) {
    if (confirm('Delete athlete?')) {
        appState.athletes.splice(idx, 1);
        saveToStorage();
        renderCurrentTab();
    }
}

function athleteOptions(list, ph) {
    return `<option value="">${ph}</option>` +
        list.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

// =============================================================================
// RULES & INFO RENDERER (Clean HTML)
// =============================================================================
function renderRules() {
    const config = OLYMPIC_CONFIG;

    // Helper to render gender table
    const renderTable = (g, quotas) => `
        <h4 class="mt-2" style="text-transform:capitalize">${g} (Cap: ${config.TEAM_CAP[g]})</h4>
        <div class="table-container">
            <table class="data-table">
                <thead><tr><th>Distance</th><th>Quota</th><th>Trials Spots</th><th>Protected/Direct</th><th>SOQC Ranks (Priority)</th></tr></thead>
                <tbody>
                    ${Object.entries(quotas).map(([dist, q]) => `
                        <tr>
                            <td><strong>${dist}</strong></td>
                            <td>${q.quota}</td>
                            <td>${q.trialsSpots}</td>
                            <td>${dist === 'team_pursuit'
            ? '<span class="badge" style="background:#d9534f">Team Pursuit</span>'
            : (q.preNominated.length ? q.preNominated.map(name => {
                // Special visual handling for known non-protected nominations
                const isCasey = name.includes('Casey');
                const label = isCasey ? `${name} (Rank ${q.soqcRanks[0]})` : `${name} (Protected)`;
                const color = isCasey ? '#f0ad4e' : '#d9534f'; // Orange for rank-based, Red for protected
                return `<span class="badge" style="background:${color}">${label}</span>`;
            }).join(' ') : '-')
        }</td>
                            <td>${dist === 'team_pursuit' ? `${q.soqcRanks[0]} ➝ Protected` : (q.soqcRanks ? q.soqcRanks.join(', ') : '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    return `
        <div class="section-header">
            <h2>📖 Rules & Selection Criteria</h2>
        </div>
        
        <div class="card mb-2">
            <h3>Olympic Selection Procedures Summary</h3>
            <p><strong>Reduction Process:</strong> If more athletes qualify than the Team Cap allows, athletes are cut based on their SOQC Priority Ranking (lower is better).</p>
            <ul style="margin-left:20px; margin-top:10px;">
                <li><strong>Priority 1 (Protected):</strong> Direct Nominees & Team Pursuit Specialists (Top 3 World Rank).</li>
                <li><strong>Priority N:</strong> Additional qualifiers are ranked by the SOQC rank associated with their quota spot.</li>
                <li><strong>Mass Start:</strong> 2nd spot is NOT automatically protected; it carries a specific reduction ranking.</li>
            </ul>
        </div>

        <div class="card">
            <h3>Quota Configuration</h3>
            ${renderTable('women', config.women)}
            ${renderTable('men', config.men)}
        </div>
        
        <div class="card mt-2">
            <h3>Terminology</h3>
            <p><small><strong>SOQC:</strong> Special Olympic Qualification Classification. Defines the priority of each quota spot earned internationally.</small></p>
        </div>
        </div>

        <div class="card mt-2">
            <h3>📜 Selection Process Outline</h3>
            <div style="text-align: left; padding: 0 10px; color: #ccc; line-height: 1.6;">
                <p><strong>Team Size:</strong> Maximum 9 Men / 9 Women (Dependent on earned Quota spots).</p>
                
                <h4 style="color: #D4AF37; margin-top: 15px;">How to Qualify</h4>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 8px;"><strong>1. Direct Qualification:</strong> Athletes who medal at Worlds & have top Fall World Cup results.</li>
                    <li style="margin-bottom: 8px;"><strong>2. Olympic Trials:</strong> Top finishers at the Trials in Milwaukee (Jan 2-5, 2026) fill remaining spots.</li>
                    <li style="margin-bottom: 8px;"><strong>3. Mass Start:</strong> Based on <strong>Best 3 of 4</strong> races (2 Fall World Cups + 2 Trials races). Tiebreaker is finest finish at Mass Start #4.</li>
                    <li style="margin-bottom: 8px;"><strong>4. Team Pursuit:</strong> Up to 2 specialists may be selected via discretion (Priority given to World Cup performers).</li>
                </ul>

                <h4 style="color: #D4AF37; margin-top: 15px;">Reduction Process (Cutting the Team)</h4>
                <p>If more athletes qualify than legal spots available:</p>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 8px;">❌ Athletes are cut based on their <strong>World Cup (SOQC) Ranking</strong> (Lowest rank cut first).</li>
                    <li style="margin-bottom: 8px;">🔒 <strong>Protected:</strong> Direct Qualifiers and Top Team Pursuit Specialists cannot be cut.</li>
                </ul>
                
                <p style="font-size: 0.8em; margin-top: 20px; text-align: center; opacity: 0.6;">
                    *This is a simplified summary. Refer to the official USS Selection Procedures for full details.
                </p>
            </div>
        </div>

        <div class="card mt-2">
            <h3>🌍 IOC & ISU Qualification Rules</h3>
            <div style="text-align: left; padding: 0 10px; color: #ccc; line-height: 1.6;">
                <p><strong>Total Olympic Quota:</strong> 164 Skaters (82 Men / 82 Women) worldwide.</p>
                
                <h4 style="color: #61dafb; margin-top: 15px;">Country Limits (NOC Quotas)</h4>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 8px;"><strong>Max 9:</strong> If a country qualifies a Team Pursuit team AND earns spots in every individual event.</li>
                    <li style="margin-bottom: 8px;"><strong>Max 8:</strong> If a country qualifies a Team Pursuit team + at least 1 individual spot.</li>
                    <li style="margin-bottom: 8px;"><strong>Max 7:</strong> Base limit for all other countries.</li>
                </ul>

                <h4 style="color: #61dafb; margin-top: 15px;">How Spots are Earned (SOQC)</h4>
                <p>Quotas are earned for the <strong>Country</strong>, not the specific athlete, based on the 2025 Fall World Cups.</p>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 8px;">📊 <strong>SOQC Points:</strong> Ranking based on World Cup points scored.</li>
                    <li style="margin-bottom: 8px;">⏱️ <strong>SOQC Times:</strong> Ranking based on fastest times skate at World Cups.</li>
                </ul>

                <h4 style="color: #61dafb; margin-top: 15px;">Athlete Eligibility</h4>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li>🎂 Born before <strong>July 1, 2008</strong>.</li>
                    <li>⚡ Must achieve the <strong>ISU Qualifying Time Standard</strong> between July 1, 2025 – Jan 18, 2026.</li>
                </ul>
            </div>
        </div>
    `;
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "olympic_trials_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function toggleAdminMode() {
    if (!appState.isAdmin) {
        const password = prompt("Enter Admin Password:");
        if (password === "admin123") { // Simple protection
            appState.isAdmin = true;
            document.body.classList.add('admin-mode');
            document.getElementById('admin-login-btn').innerText = "🔓 Admin Active";
            alert("Admin Mode Unlocked");
        } else {
            alert("Incorrect Password");
        }
    } else {
        appState.isAdmin = false;
        document.body.classList.remove('admin-mode');
        document.getElementById('admin-login-btn').innerText = "🔒 Admin";
        // If on a hidden tab, switch to dashboard
        if (['events', 'athletes'].includes(appState.currentTab)) {
            appState.currentTab = 'dashboard';
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelector('[data-tab="dashboard"]').classList.add('active');
        }
    }
    renderCurrentTab();
}

function openShareModal(athleteName) {
    const gender = appState.viewGender;
    const rosterData = calculateReduction(gender).roster;
    const athlete = rosterData.find(a => a.name === athleteName);

    if (!athlete) return;

    // Populate Modal
    document.getElementById('share-athlete-name').innerText = athlete.name;
    const eventsList = document.getElementById('share-athlete-events');
    eventsList.innerHTML = athlete.events.map(e => {
        let label = e;
        if (e === 'TpSpec') label = 'Team Pursuit';
        if (e === 'mass_start') label = 'Mass Start';
        return `<span>${label}</span>`;
    }).join('');

    document.getElementById('share-overlay').style.display = 'flex';
}

function closeShareModal() {
    document.getElementById('share-overlay').style.display = 'none';
}

function downloadShareCard() {
    const element = document.getElementById('capture-target');
    const btn = document.querySelector('.share-download-btn');
    btn.innerText = 'Generating...';

    // Using toBlob with URL.createObjectURL is often more reliable than dataURIs for downloads
    html2canvas(element, { scale: 3, backgroundColor: "#000000", useCORS: true }).then(canvas => {
        canvas.toBlob((blob) => {
            if (!blob) {
                alert('Image generation failed (empty data).');
                btn.innerText = 'Error';
                return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const filename = `TeamUSA_${document.getElementById('share-athlete-name').innerText.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

            link.download = filename;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100);
            btn.innerText = '⬇️ Download Image';
        }, 'image/jpeg', 0.95);
    }).catch(err => {
        console.error("Capture Error:", err);
        alert('Error generating image. Check console.');
        btn.innerText = 'Error';
    });
}

// =============================================================================
// SHARE APP FEATURE
// =============================================================================
async function shareApp() {
    // Detect if running locally
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let urlToShare = window.location.href;

    if (isLocal) {
        // Warning for the admin/user testing this feature
        const usePlaceholder = confirm(
            "⚠️ You are sharing from Localhost.\n\n" +
            "The link 'localhost' only works on YOUR computer. If you share this email/text, others won't be able to open it.\n\n" +
            "Click OK to share a PLACEHOLDER Public URL instead (for testing).\n" +
            "Click Cancel to allow sharing the Localhost link anyway."
        );

        if (usePlaceholder) {
            urlToShare = "https://olympic-trials-tracker.vercel.app"; // Update this after actual deployment
        }
    }

    const shareData = {
        title: '2026 U.S. Olympic Trials Tracker',
        text: 'Check out the official 2026 U.S. Olympic Trials Qualification Tracker! Follow the standings live here:',
        url: urlToShare
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share canceled or failed', err);
        }
    } else {
        // Fallback to clipboard
        try {
            await navigator.clipboard.writeText(urlToShare);
            showToast('Link copied to clipboard! 📋');
        } catch (err) {
            console.error('Failed to copy', err);
            prompt('Copy this link:', urlToShare);
        }
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        background: rgba(40, 167, 69, 0.9);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        margin-top: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        backdrop-filter: blur(5px);
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });

    // Remove after delay
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
