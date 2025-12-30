
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

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Data Manager
    if (typeof DataManager !== 'undefined') {
        DataManager.init();
    }
    await initializeState();
    setupNavigation();
    updateBranding();
    renderCurrentTab();
});

async function initializeState() {
    ['women', 'men'].forEach(gender => {
        if (!appState.events[gender]) appState.events[gender] = {};
        Object.keys(OLYMPIC_CONFIG[gender]).forEach(dist => {
            if (!appState.events[gender][dist]) {
                appState.events[gender][dist] = { results: [], status: 'pending' };
            }
        });
    });
    await loadFromStorage();
}

async function loadFromStorage() {
    try {
        // Use DataManager to load (from Cloud or Local)
        let data = null;
        if (typeof DataManager !== 'undefined') {
            data = await DataManager.load();
        } else {
            const saved = localStorage.getItem('olympicTrials_v1');
            if (saved) data = JSON.parse(saved);
        }

        if (data) {
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
            // Legacy Migration (Local Only usually)
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

        // Calculate results for any race that has finishOrder but no results
        ['women', 'men'].forEach(gender => {
            [1, 2, 3, 4].forEach(raceNum => {
                const race = appState.msRaces[gender][raceNum];
                if (race && race.finishOrder && race.finishOrder.length > 0 && !race.results) {
                    const sprintConfig = SPRINT_POINTS[race.format || 16];
                    race.results = calculateRacePoints(race.finishOrder, race.intermediates || [], sprintConfig);
                    console.log(`Calculated results for ${gender} race ${raceNum}`);
                }
            });
        });

    } catch (e) { console.error('Error loading data:', e); }
}

function saveToStorage() {
    const data = {
        athletes: appState.athletes,
        msRaces: appState.msRaces,
        events: appState.events
    };

    if (typeof DataManager !== 'undefined') {
        DataManager.save(data);
    } else {
        localStorage.setItem('olympicTrials_v1', JSON.stringify(data));
    }
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
        case 'results': main.innerHTML = renderMassStartStandings(); break;
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

    // Calculate filled spots - ONLY count actual athletes, not placeholders like "Team Pursuit Slot X"
    const isRealAthlete = (name) => !name.startsWith('Team Pursuit Slot');
    const menRealAthletes = menStats.roster.filter(a => isRealAthlete(a.name));
    const womenRealAthletes = womenStats.roster.filter(a => isRealAthlete(a.name));

    const menCount = Math.min(menRealAthletes.length, menStats.teamCap);
    const womenCount = Math.min(womenRealAthletes.length, womenStats.teamCap);

    return `
        <div class="section-header">
            <h2>📊 Dashboard</h2>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">🦅</div>
                <div class="stat-info">
                    <span class="stat-value">${getBranding('TEAM_NAME')}</span>
                    <span class="stat-label">${getBranding('SHORT_EVENT_NAME')}</span>
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
                    <span class="stat-label">Total Team Size (Women/Men)</span>
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
        const { roster: fullRoster, teamCap } = calculateReduction(gender);

        // Filter out placeholder entries - only count real athletes
        const isRealAthlete = (name) => !name.startsWith('Team Pursuit Slot');
        const roster = fullRoster.filter(a => isRealAthlete(a.name));

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
            <div class="section-header" style="flex-direction: row;">
                <div class="btn-group" style="margin-right: 20px;">
                    <button class="btn ${gender === 'women' ? 'btn-primary' : 'btn-outline-primary'}" 
                        onclick="appState.viewGender='women'; renderCurrentTab()">Women</button>
                    <button class="btn ${gender === 'men' ? 'btn-primary' : 'btn-outline-primary'}" 
                        onclick="appState.viewGender='men'; renderCurrentTab()">Men</button>
                </div>
                <h2>${getBranding('TRACKER_TITLE')}</h2>
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
                        <span class="stat-value">${fullRoster.filter(r => r.reductionRank === 0).length}</span>
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
                        ${fullRoster.slice(0, teamCap).map((t, idx) => {
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
                        ${fullRoster.length === 0 ? '<tr><td colspan="5" class="text-muted text-center">No athletes qualified yet. Enter results to see projections.</td></tr>' : ''}
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
        while (displayList.length < totalQuota) {
            if (dist === 'team_pursuit') {
                displayList.push({ name: 'Available', type: 'HP Discretion' });
            } else {
                displayList.push({ name: 'Available', type: 'O. Trials' });
            }
        }

        return `
                <div class="result-box" style="border:1px solid #ddd; padding:10px; border-radius:8px;">
                     <h4 style="margin:0 0 5px 0; border-bottom:2px solid #eee; padding-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
                        <span>${dist}</span>
                        <span style="display:flex; align-items:center; gap:8px;">
                            <button class="btn btn-sm" onclick="showSkatersToWatch('${gender}', '${dist}')" style="background:#337ab7; padding:2px 6px; font-size:11px;" title="Skaters to Watch">👀</button>
                            <span>Quota: ${config.quota}</span>
                        </span>
                    </h4>
                    <ul style="list-style:none; padding:0; margin:0;">
                         ${displayList.map(s => {
            let bgColor = '#5cb85c'; // Default green for Trials qualifiers
            let textColor = '#fff';
            if (s.type === 'Direct' || s.type === 'Protected') {
                bgColor = '#d9534f'; textColor = '#fff';
            } else if (s.type === 'HP Discretion') {
                bgColor = '#888'; textColor = '#fff';
            } else if (s.type === 'O. Trials' && s.name === 'Available') {
                bgColor = '#337ab7'; textColor = '#fff';
            }
            return `
                            <li style="padding:4px 0; border-bottom:1px dashed #ccc; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:500">${s.name}</span>
                                <span class="badge" style="background:${bgColor}; color:${textColor}">${s.type}</span>
                            </li>
                        `;
        }).join('')}
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

    // Helper to render Reduction Matrix/Path
    const renderReductionMatrix = (g, quotas) => {
        // 1. Gather all spots with SOQC ranks
        let allSpots = [];

        // Define protected spots (which index is protected for which distance)
        const protectedIndices = g === 'women'
            ? { '500m': [0], 'mass_start': [0] }
            : { '500m': [0], '1000m': [0], '1500m': [0], 'mass_start': [0] };

        Object.entries(quotas).forEach(([dist, q]) => {
            if (q.soqcRanks && dist !== 'team_pursuit') {
                q.soqcRanks.forEach((rank, i) => {
                    // Check if this specific spot index is protected
                    const isProtected = protectedIndices[dist] && protectedIndices[dist].includes(i);

                    if (!isProtected) {
                        allSpots.push({
                            distance: dist.replace(/_/g, ' ').toUpperCase(),
                            spotName: i === 0 ? '1st Spot' : (i === 1 ? '2nd Spot' : '3rd Spot'),
                            rank: rank
                        });
                    }
                });
            }
        });

        // 2. Sort by Rank High -> Low (Highest number = Worst rank = First to cut)
        // Tie-breaker: If ranks equal, sort alphabetically (e.g. 10000M comes before 5000M, so 10k is cut first)
        allSpots.sort((a, b) => {
            if (b.rank !== a.rank) return b.rank - a.rank;
            return a.distance.localeCompare(b.distance);
        });

        // 3. Render
        return `
            <div style="margin-top: 25px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px;">
                <h5 style="color: #ef4444; margin-bottom: 15px; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.5em">✂️</span> 
                    <div>
                        Reduction Order / The "Chopping Block"
                        <div style="font-size:0.7em; color:#aaa; font-weight:normal;">If Team Size > Cap, spots are cut in this order until we reach <strong>${g === 'women' ? '6' : '8'} athletes</strong>.</div>
                    </div>
                </h5>
                <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;">
                    ${allSpots.map((spot, i) => `
                        <div style="min-width: 120px; background: ${i === 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)'}; 
                                    border: 1px solid ${i === 0 ? '#ef4444' : 'rgba(255,255,255,0.1)'}; 
                                    padding: 10px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 0.8em; color: #888;">#${i + 1} to Cut</div>
                            <div style="font-weight: bold; color: ${i === 0 ? '#ef4444' : '#fff'}; margin: 5px 0;">${spot.distance}</div>
                            <div style="font-size: 0.85em; color: #aaa;">${spot.spotName}</div>
                            <div style="font-size: 1.2em; font-weight: 900; color: #D4AF37; margin-top: 5px;">${spot.rank}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    // Helper to render gender table
    const renderTable = (g, quotas) => `
        <div style="display:flex; align-items:flex-end; justify-content:space-between; margin-top:30px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">
            <h4 style="text-transform:capitalize; color: #D4AF37; margin:0;">${g} Results</h4>
        </div>
        
        <div class="table-container">
            <table class="data-table" style="font-size: 0.95em;">
                <thead style="background: rgba(255,255,255,0.02);">
                    <tr>
                        <th style="padding: 12px;">Event</th>
                        <th style="text-align:center;">Total Spots</th>
                        <th>Already Qualified</th>
                        <th style="text-align:center; color:#D4AF37; border-left: 1px solid #333; border-right: 1px solid #333;">Spots available<br>at Trials</th>
                        <th style="font-size:0.9em; color:#aaa;">Cut Priority (SOQC)</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(quotas).map(([dist, q]) => {
        // Format Distance Name (e.g. mass_start -> Mass Start)
        const distName = dist.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // Check if 0 spots
        const isZero = q.quota === 0;
        const rowStyle = isZero ? 'opacity: 0.4;' : '';

        // Team Pursuit Logic
        const isTP = dist === 'team_pursuit';
        const spotsAvailable = isTP ? '<span style="font-size:0.7em; letter-spacing:1px; text-transform:uppercase;">Discretionary</span>' : q.trialsSpots;

        return `
                        <tr style="${rowStyle}">
                            <td style="font-weight:bold; padding: 12px;">${distName}</td>
                            <td style="text-align:center; font-size: 1.1em;">${q.quota}</td>
                            <td>${isTP
                ? '<span class="badge" style="background:#22c55e; color:black;">Discretionary</span>'
                : (q.preNominated.length ? q.preNominated.map(name => {
                    const color = '#22c55e'; // All Green
                    const text = `${name} ✓`;
                    return `<span class="badge" style="background:${color}; color:black; margin-right:5px;">${text}</span>`;
                }).join(' ') : '<span style="color:#666;">-</span>')
            }</td>
                            <td style="text-align:center; font-weight:900; color:#D4AF37; font-size: 1.2em; border-left: 1px solid #333; border-right: 1px solid #333; background: rgba(212, 175, 55, 0.05);">
                                ${spotsAvailable}
                            </td>
                            <td style="color:#fff; font-family:monospace; font-size:1.4em; font-weight:bold;">
                                ${isTP ? `Protected` : (q.soqcRanks ? q.soqcRanks.join(', ') : '-')}
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            ${renderReductionMatrix(g, quotas)}
        </div>
    `;

    return `
        <div class="section-header">
            <h2>📖 Qualification Guide 2026</h2>
        </div>

        <div class="card" style="border-top: 4px solid #D4AF37;">
            <h3><span style="background:#D4AF37; color:black; padding:2px 8px; border-radius:4px; font-size:0.8em; margin-right:10px;">USA</span> How to Make ${getBranding('TEAM_NAME')}</h3>
            <p class="text-muted" style="margin-bottom: 20px;">The process is nuanced, but the goal is simple: Be fast.</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 20px;">
                <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 2em; color: #D4AF37; margin-bottom: 5px;">1. Win</div>
                    <strong style="color: #fff; display:block; margin-bottom:5px;">Finish Top 2 or 3 at Selection</strong>
                    <p style="font-size: 0.9em; color: #aaa;">Most spots are earned directly by finishing on the podium at the ${getBranding('SHORT_EVENT_NAME')} in Milwaukee.</p>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 2em; color: #D4AF37; margin-bottom: 5px;">2. Rank</div>
                    <strong style="color: #fff; display:block; margin-bottom:5px;">Earn a Quota Spot</strong>
                    <p style="font-size: 0.9em; color: #aaa;">${getBranding('TEAM_NAME')} has a limited number of "tickets" (quotas) for each distance. Often, only the top 2 or 3 finishers get to go.</p>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 2em; color: #D4AF37; margin-bottom: 5px;">3. Survive</div>
                    <strong style="color: #fff; display:block; margin-bottom:5px;">Avoid the "Cut"</strong>
                    <p style="font-size: 0.9em; color: #aaa;">${getBranding('TEAM_NAME')} is capped at <strong>8 Men</strong> and <strong>6 Women</strong>. If more people qualify, the skaters with the lowest "SOQC Rankings" get cut.</p>
                </div>
            </div>

            <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid #D4AF37; border-radius: 8px; padding: 15px; display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2em;">🦅</div>
                <div>
                    <strong style="color: #D4AF37;">Team Size Limit</strong>
                    <p style="margin: 0; font-size: 0.9em;">Based on Fall World Cup results, ${getBranding('TEAM_NAME')} is restricted to <strong style="color:white;">8 Men</strong> and <strong style="color:white;">6 Women</strong> for the 2026 Games.</p>
                </div>
            </div>
        </div>

        <div class="card mt-2">
            <h3>📊 Detailed Quota Breakdown</h3>
            <p class="text-muted">Below shows exactly how many spots exist for each distance and who is pre-nominated.</p>
            ${renderTable('women', config.women)}
            ${renderTable('men', config.men)}
        </div>

        <div class="card mt-2">
            <h3>📜 Official Rules & Documentation</h3>
            <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                 <a href="https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/bltcd66ae352ae96e83/694b3ece1e351c40b71969db/LT_Regs_25-26_Final_v2.2.pdf" target="_blank" style="text-decoration:none;">
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
                        <span style="font-size: 1.5em;">📄</span>
                        <div>
                            <strong style="display:block; color:#fff;">USS Rules 2025-26</strong>
                            <span style="font-size: 0.8em; color: #888;">Complete Regulations PDF</span>
                        </div>
                    </div>
                </a>
                <a href="https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/blt328a2be74a7640b7/69248cbe33936a0790e5d9ce/Athlete_Selection_Procedures_-_USS_Long_Track_-_Amendment_2_SIGNED.pdf" target="_blank" style="text-decoration:none;">
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
                        <span style="font-size: 1.5em;">⚖️</span>
                        <div>
                            <strong style="display:block; color:#fff;">Selection Procedures</strong>
                            <span style="font-size: 0.8em; color: #888;">Official Olympic Criteria</span>
                        </div>
                    </div>
                </a>
            </div>
            
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); color: #888; font-size: 0.9em;">
                <h4 style="color: #666; margin-bottom: 10px;">Technical Terminology</h4>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 5px;"><strong style="color:#aaa;">SOQC (Special Olympic Qualification Classification):</strong> The "priority ranking" of every quota spot. Lower number = Safer from being cut.</li>
                    <li style="margin-bottom: 5px;"><strong style="color:#aaa;">Direct Qualification:</strong> Skaters who medaled at World Championships are "Protected" and cannot be cut.</li>
                    <li style="margin-bottom: 5px;"><strong style="color:#aaa;">Team Pursuit Specialists:</strong> Up to 2 skaters can be selected specifically for TP, but they count towards the team cap.</li>
                </ul>
            </div>
        </div>

        <div class="card mt-2">
            <h3>🌍 IOC & ISU Qualification Rules</h3>
            <div style="text-align: left; padding: 0 10px; color: #ccc; line-height: 1.6;">
                <p><strong>Total Olympic Quota:</strong> 164 Skaters (82 Men / 82 Women) worldwide.</p>
                
                <h4 style="color: #D4AF37; margin-top: 15px;">Country Limits (NOC Quotas)</h4>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 8px;"><strong>Max 9:</strong> If a country qualifies a Team Pursuit team AND earns spots in every individual event.</li>
                    <li style="margin-bottom: 8px;"><strong>Max 8:</strong> If a country qualifies a Team Pursuit team + at least 1 individual spot.</li>
                    <li style="margin-bottom: 8px;"><strong>Max 7:</strong> Base limit for all other countries.</li>
                </ul>

                <h4 style="color: #D4AF37; margin-top: 15px;">How Spots are Earned (SOQC)</h4>
                <p>Quotas are earned for the <strong>Country</strong>, not the specific athlete, based on the 2025 Fall World Cups.</p>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 8px;">📊 <strong>SOQC Points:</strong> Ranking based on World Cup points scored.</li>
                    <li style="margin-bottom: 8px;">⏱️ <strong>SOQC Times:</strong> Ranking based on fastest times skate at World Cups.</li>
                </ul>

                <h4 style="color: #D4AF37; margin-top: 15px;">Athlete Eligibility</h4>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 8px;"><strong>Age:</strong> Born before July 1, 2010.</li>
                    <li style="margin-bottom: 8px;"><strong>Times:</strong> Must have skated the ${getBranding('QUALIFIER_NAME')} for their distance.</li>
                </ul>
            </div>
    `;
}

// =============================================================================
// MASS START STANDINGS (PUBLIC VIEW)
// =============================================================================
function renderMassStartStandings() {
    const gender = appState.viewGender;
    const standings = calculateMassStartStandings(gender);

    // Filter out athletes with 0 points
    const filteredStandings = standings.filter(s => s.total > 0);

    // Get pre-nominated athletes for this gender's mass start
    const preNominated = OLYMPIC_CONFIG[gender].mass_start?.preNominated || [];

    return `
        <div class="section-header" style="flex-direction: row;">
            <div class="btn-group" style="margin-right: 20px;">
                <button class="btn ${gender === 'women' ? 'btn-primary' : 'btn-outline-primary'}" 
                    onclick="appState.viewGender='women'; renderCurrentTab()">Women</button>
                <button class="btn ${gender === 'men' ? 'btn-primary' : 'btn-outline-primary'}" 
                    onclick="appState.viewGender='men'; renderCurrentTab()">Men</button>
            </div>
            <div class="btn-group" style="margin-right: 20px;">
                <button onclick="shareMsStandingsImage()" class="btn btn-sm" style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #8a3ab9); color:white; border:none; font-size: 0.9rem; padding: 6px 14px; margin-right: 8px;">📸 Insta Post</button>
                <button onclick="shareMsStandingsPdf()" class="btn btn-sm" style="background: #333; color:white; border:1px solid #555; font-size: 0.9rem; padding: 6px 14px;">📄 PDF</button>
            </div>
            <h2>🏆 Mass Start Series Standings</h2>
        </div>

        <div class="card" id="ms-standings-card">
            <h3 style="margin-top:0;">${gender === 'women' ? "Women's" : "Men's"} Overall Points</h3>
            <p class="text-muted">Accumulated points from Races 1-4. (Official selection uses Best 3 of 4).</p>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:50px">Rank</th>
                            <th>Athlete</th>
                            <th class="text-center">Race 1</th>
                            <th class="text-center">Race 2</th>
                            <th class="text-center">Race 3</th>
                            <th class="text-center">Race 4</th>
                            <th class="text-center" style="font-size:1.1em; color:#D4AF37;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredStandings.length > 0 ? filteredStandings.map((s, i) => {
        const rank = i + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'rank-1';
        if (rank === 2) rankClass = 'rank-2';
        if (rank === 3) rankClass = 'rank-3';

        const isQualified = preNominated.includes(s.name);

        return `
                            <tr>
                                <td class="${rankClass}" style="font-weight:bold; font-size:1.1em;">${rank}</td>
                                <td>
                                    <strong>${s.name}</strong>
                                    ${isQualified ? '<span class="badge" style="background:#28a745; margin-left:8px; font-size:0.7em;">✅ Pre-Qualified</span>' : ''}
                                </td>
                                <td class="text-center">${s.races[1] || '<span class="text-muted">-</span>'}</td>
                                <td class="text-center">${s.races[2] || '<span class="text-muted">-</span>'}</td>
                                <td class="text-center">${s.races[3] || '<span class="text-muted">-</span>'}</td>
                                <td class="text-center">${s.races[4] || '<span class="text-muted">-</span>'}</td>
                                <td class="text-center" style="font-weight:bold; font-size:1.1em; color:#D4AF37;">${s.total}</td>
                            </tr>
                            `;
    }).join('') : '<tr><td colspan="7" class="text-center text-muted">No results recorded yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Share MS Standings as Image (for Instagram - 1080x1350 format)
function shareMsStandingsImage() {
    const gender = appState.viewGender;
    const standings = calculateMassStartStandings(gender);
    const filteredStandings = standings.filter(s => s.total > 0);
    const genderLabel = gender === 'women' ? "WOMEN'S" : "MEN'S";

    // Limit to top 12
    const displayAthletes = filteredStandings.slice(0, 12);

    // Create a container specifically for the image capture
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 1080px; height: 1350px; /* Instagram Portrait 4:5 */
        background: radial-gradient(circle at top, #1a1a2e, #000);
        color: white; font-family: 'Segoe UI', sans-serif;
        padding: 60px; box-sizing: border-box;
        z-index: -1; display: flex; flex-direction: column;
    `;

    exportContainer.innerHTML = `
        <div style="text-align: center; border-bottom: 4px solid #D4AF37; padding-bottom: 15px; margin-bottom: 10px;">
            <div style="font-size: 30px; letter-spacing: 4px; color: #888; text-transform: uppercase; font-weight: 300;">${getBranding('MASS_START_TITLE')}</div>
            <h1 style="font-size: 70px; margin: 0 0 5px 0; color: #fff; text-transform: uppercase; text-shadow: 0 4px 10px rgba(0,0,0,0.5); line-height: 0.9;">${genderLabel}<br>MASS START</h1>
            <div style="display: flex; justify-content: center; gap: 20px; align-items: center;">
                <div style="background: #D4AF37; color: #000; padding: 4px 15px; font-weight: bold; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">Current Standings</div>
                <div style="color: #D4AF37; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; border: 1px solid #D4AF37; padding: 3px 15px;">Top ${displayAthletes.length}</div>
            </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 5px;">
                <thead>
                    <tr style="font-size: 18px; color: #888; letter-spacing: 2px; text-transform: uppercase;">
                        <th style="padding: 0 20px; text-align: left; font-weight: normal; width: 50px;">Rank</th>
                        <th style="padding: 0 10px; text-align: left; font-weight: normal;">Athlete</th>
                        <th style="padding: 0 5px; text-align: center; font-weight: normal; width: 55px;">R1</th>
                        <th style="padding: 0 5px; text-align: center; font-weight: normal; width: 55px;">R2</th>
                        <th style="padding: 0 5px; text-align: center; font-weight: normal; width: 55px;">R3</th>
                        <th style="padding: 0 5px; text-align: center; font-weight: normal; width: 55px;">R4</th>
                        <th style="padding: 0 25px 0 0; text-align: right; font-weight: normal; width: 80px; color: #D4AF37;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayAthletes.map((s, i) => `
                        <tr style="background: rgba(255,255,255,0.05); font-size: 24px;">
                            <td style="padding: 6px 20px; font-weight: 900; color: #D4AF37;">${i + 1}</td>
                            <td style="padding: 6px 10px; font-weight: 600;">${s.name.toUpperCase()}</td>
                            <td style="padding: 6px 5px; color: #fff; font-size: 24px; font-weight: bold; text-align: center; font-family: monospace;">${s.races[1] || '-'}</td>
                            <td style="padding: 6px 5px; color: #fff; font-size: 24px; font-weight: bold; text-align: center; font-family: monospace;">${s.races[2] || '-'}</td>
                            <td style="padding: 6px 5px; color: #fff; font-size: 24px; font-weight: bold; text-align: center; font-family: monospace;">${s.races[3] || '-'}</td>
                            <td style="padding: 6px 5px; color: #fff; font-size: 24px; font-weight: bold; text-align: center; font-family: monospace;">${s.races[4] || '-'}</td>
                            <td style="padding: 6px 25px 6px 0; text-align: right; font-weight: bold; font-family: monospace; font-size: 30px;">
                                ${s.total}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div style="text-align: center; color: rgba(255,255,255,0.6); font-size: 18px; margin-top: 10px; font-style: italic; letter-spacing: 1px;">
            * Official selection based on best 3 of 4 race results
        </div>

        <div style="text-align: center; margin-top: auto; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 36px; font-weight: 900; color: #D4AF37; letter-spacing: 1px;">@SALTYGOLDSUPPLY</div>
            <div style="font-size: 18px; color: #888; margin-top: 5px; letter-spacing: 3px; font-weight: 300;">WWW.SALTYGOLDSUPPLY.COM</div>
        </div>
    `;

    document.body.appendChild(exportContainer);
    showToast('Generating high-res graphic... 🎨');

    html2canvas(exportContainer, {
        scale: 1,
        useCORS: true,
        backgroundColor: '#000'
    }).then(canvas => {
        document.body.removeChild(exportContainer);
        canvas.toBlob(blob => {
            const fileName = `OT2026_MS_Standings_${genderLabel}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'Mass Start Standings 🏆',
                    text: `Latest ${genderLabel} Mass Start standings! #OlympicTrials2026`
                })
                    .then(() => showToast('Shared successfully! 🚀'))
                    .catch((error) => {
                        console.log('Error sharing:', error);
                        saveAsFile(blob, fileName);
                    });
            } else {
                saveAsFile(blob, fileName);
            }
        });
    }).catch(err => {
        console.error(err);
        showToast('Error generating image');
        if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
    });
}

// Share MS Standings as PDF
function shareMsStandingsPdf() {
    const gender = appState.viewGender;
    const standings = calculateMassStartStandings(gender);
    const filteredStandings = standings.filter(s => s.total > 0);
    const genderLabel = gender === 'women' ? "Women's" : "Men's";

    // Dynamic sizing for PDF based on athlete count
    const athleteCount = filteredStandings.length;
    const pdfPadding = athleteCount <= 12 ? 12 : athleteCount <= 16 ? 10 : 8;
    const pdfFontSize = athleteCount <= 12 ? 14 : athleteCount <= 16 ? 12 : 10;

    // Create printable HTML with Instagram-style design
    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${genderLabel} Mass Start Standings</title>
            <style>
                @page { margin: 0.5in; }
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 40px;
                    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
                    color: white;
                    min-height: 100vh;
                    margin: 0;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                .header { text-align: center; margin-bottom: 30px; }
                .header-top { font-size: 18px; color: #D4AF37; margin-bottom: 10px; }
                .header-title { font-size: 36px; font-weight: bold; color: #fff; margin-bottom: 10px; }
                .header-subtitle { font-size: 24px; color: #D4AF37; }
                .subtitle { text-align: center; color: rgba(255,255,255,0.6); margin-bottom: 25px; font-size: 14px; }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                    overflow: hidden;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                th { 
                    background: rgba(212,175,55,0.3); 
                    color: #D4AF37; 
                    padding: ${pdfPadding}px;
                    font-size: ${pdfFontSize}px;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                td { 
                    padding: ${pdfPadding}px; 
                    text-align: center;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    font-size: ${pdfFontSize}px;
                }
                .rank-1 { background: linear-gradient(135deg, #FFD700, #FFA500) !important; color: #000; font-weight: bold; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .rank-2 { background: linear-gradient(135deg, #C0C0C0, #A0A0A0) !important; color: #000; font-weight: bold; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .rank-3 { background: linear-gradient(135deg, #CD7F32, #8B4513) !important; color: #fff; font-weight: bold; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .name { text-align: left; font-weight: bold; }
                .total { font-weight: bold; color: #D4AF37; font-size: 16px; }
                .footer { 
                    text-align: center; 
                    margin-top: 30px; 
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }
                .footer-note { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
                .footer-brand { font-size: 14px; color: #D4AF37; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-top">★ ${getBranding('EVENT_NAME').toUpperCase()} ★</div>
                <div class="header-title">🏆 Mass Start Standings</div>
                <div class="header-subtitle">${genderLabel} Overall Points</div>
            </div>
            <p class="subtitle">Accumulated points from Races 1-4 (Best 3 of 4 for official selection)</p>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th style="text-align:left;">Athlete</th>
                        <th>R1</th>
                        <th>R2</th>
                        <th>R3</th>
                        <th>R4</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredStandings.map((s, i) => {
        const rank = i + 1;
        let rankClass = '';
        let medalEmoji = '';
        if (rank === 1) { rankClass = 'rank-1'; medalEmoji = '🥇'; }
        if (rank === 2) { rankClass = 'rank-2'; medalEmoji = '🥈'; }
        if (rank === 3) { rankClass = 'rank-3'; medalEmoji = '🥉'; }
        return `
                    <tr>
                        <td class="${rankClass}">${medalEmoji}${rank}</td>
                        <td class="name">${s.name}</td>
                        <td>${s.races[1] || '-'}</td>
                        <td>${s.races[2] || '-'}</td>
                        <td>${s.races[3] || '-'}</td>
                        <td>${s.races[4] || '-'}</td>
                        <td class="total">${s.total}</td>
                    </tr>`;
    }).join('')}
                </tbody>
            </table>
            <div class="footer">
                <div class="footer-note">Generated on ${new Date().toLocaleDateString()} | Unofficial Results</div>
                <div class="footer-brand">Powered by <a href="https://saltygoldsupply.com" style="color: #D4AF37; text-decoration: underline;">saltygoldsupply.com</a></div>
            </div>
        </body>
        </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);

    showToast('PDF ready to print/save 📄');
}

// Show Skaters to Watch modal
function showSkatersToWatch(gender, dist) {
    const data = SKATERS_TO_WATCH[gender]?.[dist];
    if (!data) {
        showToast('No data available for this distance');
        return;
    }

    const genderLabel = gender === 'women' ? "Women's" : "Men's";
    const distLabel = dist === 'mass_start' ? 'Mass Start' : dist === 'team_pursuit' ? 'Team Pursuit' : dist;

    let content = '';
    if (data.note) {
        content = `<p style="text-align: center; color: #D4AF37; font-style: italic; padding: 20px;">${data.note}</p>`;
    } else {
        content = `
            <table class="data-table" style="width:100%;">
                <thead>
                    <tr>
                        <th style="width:40px;">#</th>
                        <th>Athlete</th>
                        <th style="width:80px;">SB</th>
                        <th style="width:50px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${data.skaters.map(s => `
                        <tr>
                            <td>${s.rank}</td>
                            <td style="font-weight:bold;">
                                ${s.id ? `<a href="https://speedskatingresults.com/index.php?p=17&s=${s.id}" target="_blank" style="color:#D4AF37; text-decoration:none;">${s.name} ↗</a>` : s.name}
                            </td>
                            <td><strong>${s.time}</strong></td>
                            <td>${s.notes ? '<span style="color:#D4AF37; font-size:11px;">' + s.notes + '</span>' : ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:10px; font-size:12px; color:#888;">
                Season Bests 2025-26 | Source: speedskatingresults.com
            </p>
        `;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'skaters-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.8); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
    `;

    // Add Download Button to header
    modal.innerHTML = `
        <div style="background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; max-width: 450px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #D4AF37; font-size: 1.1rem;">👀 ${genderLabel} ${distLabel}</h3>
                <div style="display:flex; gap:10px; align-items:center;">
                    ${!data.note ? `<button onclick="downloadSkatersImage('${gender}', '${dist}')" class="btn btn-sm" style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #8a3ab9); color:white; border:none; font-size: 0.8rem; padding: 4px 10px;">📸 Insta Post</button>` : ''}
                    <button onclick="document.getElementById('skaters-modal').remove()" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                 <h4 style="margin: 0; color: #888; font-weight: normal; font-size: 0.9rem;">Skaters to Watch</h4>
            </div>
           
            <style>
                #skaters-modal .data-table td, #skaters-modal .data-table th { padding: 6px 8px; font-size: 0.9rem; }
                #skaters-modal .data-table tr:last-child td { border-bottom: none; }
            </style>
            
            <table class="data-table" style="width:100%;">
                <thead>
                    <tr>
                        <th style="width:40px;">#</th>
                        <th>Athlete</th>
                        <th style="width:100px;">SEASON BEST</th>
                        <th style="width:50px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${data.skaters.map(s => `
                        <tr>
                            <td>${s.rank}</td>
                            <td style="font-weight:bold;">
                                ${s.id ? `<a href="https://speedskatingresults.com/index.php?p=17&s=${s.id}" target="_blank" style="color:#D4AF37; text-decoration:none;">${s.name} ↗</a>` : s.name}
                            </td>
                            <td><strong>${s.time}</strong></td>
                            <td>${s.notes ? '<span style="color:#D4AF37; font-size:11px;">' + s.notes + '</span>' : ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="text-align:center; margin-top:10px; font-size:12px; color:#888;">
                Season Bests 2025-26 | Source: speedskatingresults.com
            </p>
        </div>
    `;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

function downloadSkatersImage(gender, dist) {
    const data = SKATERS_TO_WATCH[gender]?.[dist];
    if (!data || data.note) return;

    const genderLabel = gender === 'women' ? "WOMEN'S" : "MEN'S";
    const distLabel = dist === 'team_pursuit' ? 'TEAM PURSUIT' : dist.toUpperCase();

    // Create a container specifically for the image capture (off-screen but visible to html2canvas)
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 1080px; height: 1350px; /* Instagram Portrait 4:5 */
        background: radial-gradient(circle at top, #1a1a2e, #000);
        color: white; font-family: 'Segoe UI', sans-serif;
        padding: 60px; box-sizing: border-box;
        z-index: -1; display: flex; flex-direction: column;
    `;

    exportContainer.innerHTML = `
        <div style="text-align: center; border-bottom: 4px solid #D4AF37; padding-bottom: 25px; margin-bottom: 30px;">
            <div style="font-size: 32px; letter-spacing: 4px; color: #888; text-transform: uppercase; font-weight: 300;">${getBranding('MASS_START_TITLE')}</div>
            <h1 style="font-size: 90px; margin: 5px 0 10px 0; color: #fff; text-transform: uppercase; text-shadow: 0 4px 10px rgba(0,0,0,0.5); line-height: 0.9;">${genderLabel}<br>${distLabel}</h1>
            <div style="display: flex; justify-content: center; gap: 20px; align-items: center;">
                <div style="background: #D4AF37; color: #000; padding: 5px 20px; font-weight: bold; font-size: 22px; text-transform: uppercase; letter-spacing: 2px;">Skaters to Watch</div>
                <div style="color: #D4AF37; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; border: 1px solid #D4AF37; padding: 4px 20px;">Season Bests</div>
            </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
                ${data.skaters.slice(0, 10).map((s, i) => `
                    <tr style="background: rgba(255,255,255,0.05); font-size: 28px;">
                        <td style="padding: 10px 25px; font-weight: 900; color: #D4AF37; width: 60px;">${s.rank}</td>
                        <td style="padding: 10px; font-weight: 600;">${s.name.toUpperCase()}</td>
                        <td style="padding: 10px 25px; text-align: right; font-family: monospace; font-weight: bold; letter-spacing: 1px;">${s.time}</td>
                        <td style="padding: 10px 25px 10px 0; width: 100px; text-align: right;">
                            ${s.notes ? `<span style="background: #D4AF37; color: #000; font-size: 16px; padding: 4px 10px; border-radius: 4px; font-weight: bold; white-space: nowrap; display: inline-block;">${s.notes}</span>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </table>
        </div>

        <div style="text-align: center; margin-top: auto; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 42px; font-weight: 900; color: #D4AF37; letter-spacing: 1px;">@SALTYGOLDSUPPLY</div>
            <div style="font-size: 20px; color: #888; margin-top: 5px; letter-spacing: 3px; font-weight: 300;">WWW.SALTYGOLDSUPPLY.COM</div>
        </div>
    `;

    document.body.appendChild(exportContainer);
    showToast('Generating high-res graphic... 🎨');

    html2canvas(exportContainer, {
        scale: 1, // Already set to high res dimensions
        useCORS: true,
        backgroundColor: '#000'
    }).then(canvas => {
        // Remove container immediately
        document.body.removeChild(exportContainer);

        canvas.toBlob(blob => {
            const fileName = `SkatersToWatch_${gender}_${dist}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            // Detect Mobile Device (Simple check)
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // SMART SHARE: Only use native sharing on Mobile
            if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'Skaters to Watch',
                    text: `Check out the Season Bests for the ${getBranding('SHORT_EVENT_NAME')}! 🇺🇸⛸️`
                })
                    .then(() => showToast('Shared successfully! 🚀'))
                    .catch((error) => {
                        console.log('Error sharing:', error);
                        // Fallback if user cancels or share fails
                        saveAsFile(blob, fileName);
                    });
            } else {
                // DESKTOP: Always Download
                saveAsFile(blob, fileName);
            }
        });
    }).catch(err => {
        console.error(err);
        showToast('Error generating image');
        if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
    });
}

function saveAsFile(blob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    showToast('Image downloaded! 📸');
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
    const originalText = btn.innerText;
    btn.innerText = 'Generating...';

    // Using toBlob with URL.createObjectURL is often more reliable than dataURIs for downloads
    html2canvas(element, { scale: 3, backgroundColor: "#000000", useCORS: true }).then(canvas => {
        canvas.toBlob((blob) => {
            if (!blob) {
                alert('Image generation failed (empty data).');
                btn.innerText = 'Error';
                return;
            }

            const filename = `${getBranding('TEAM_NAME').replace(/ /g, '')}_${document.getElementById('share-athlete-name').innerText.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: `${getBranding('TEAM_NAME')} Qualifier 🇺🇸`,
                    text: `Officially Qualified! ${getBranding('HASHTAG')}`
                })
                    .then(() => {
                        btn.innerText = 'Shared! 🚀';
                        setTimeout(() => btn.innerText = originalText, 2000);
                    })
                    .catch((error) => {
                        console.log('Error sharing:', error);
                        // Fallback to download
                        saveAsFile(blob, filename);
                        btn.innerText = originalText;
                    });
            } else {
                // Desktop Direct Download
                saveAsFile(blob, filename);
                btn.innerText = originalText;
            }
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

// =============================================================================
// BRANDING UPDATE UTILITY
// =============================================================================
function updateBranding() {
    // 1. Page Title
    document.title = getBranding('EVENT_NAME') + " Tracker";

    // 2. Header Title (in .logo-section)
    const headerTitle = document.querySelector('.logo-section h1');
    if (headerTitle) headerTitle.innerText = getBranding('EVENT_NAME');

    // 3. Print Header
    const printTitle = document.querySelector('.print-title h1');
    if (printTitle) printTitle.innerText = getBranding('EVENT_NAME');

    // 4. Footer
    const footerTitle = document.querySelector('.footer-info p');
    if (footerTitle) footerTitle.innerText = getBranding('TRACKER_TITLE');

    // 5. Share Card (Instagram)
    const igTitle = document.querySelector('.ig-title');
    if (igTitle) igTitle.innerText = getBranding('TEAM_NAME').toUpperCase();

    const igFooter = document.querySelector('.ig-footer p');
    if (igFooter) igFooter.innerText = getBranding('TRACKER_TITLE').toUpperCase();
}
