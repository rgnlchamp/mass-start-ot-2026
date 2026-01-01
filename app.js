
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
    updateBranding();
    checkAdminStatus();
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
            appState.isuConfig = data.isuConfig || {};

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
    localStorage.setItem('olympicTrials_v1', JSON.stringify({
        athletes: appState.athletes,
        msRaces: appState.msRaces,
        events: appState.events,
        isuConfig: appState.isuConfig
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

    // Auto-Pilot Button Sync
    if (typeof updateAutoPilotBtn === 'function') updateAutoPilotBtn();
}


function renderDashboard() {
    // Get quick stats
    const menStats = calculateReduction('men');
    const womenStats = calculateReduction('women');

    // Calculate filled spots - ONLY count actual athletes, not placeholders like "Team Pursuit Slot X"
    const isRealAthlete = (name) => !name.startsWith('Team Pursuit Slot') && name !== 'Available';
    const menRealAthletes = menStats.roster.filter(a => isRealAthlete(a.name));
    const womenRealAthletes = womenStats.roster.filter(a => isRealAthlete(a.name));

    const menCount = Math.min(menRealAthletes.length, menStats.teamCap);
    const womenCount = Math.min(womenRealAthletes.length, womenStats.teamCap);

    const totalCount = menCount + womenCount;
    const maxViz = 18; // We show up to 18 to visualize overflow past the 14-spot cap
    const cutPercentage = (14 / maxViz) * 100;

    return `
        <div class="section-header">
            <h2>Qualification Guide 2026</h2>
        </div>

        <!-- QUALIFICATION GUIDE -->
        <div class="explainer-card" style="border: 2px solid var(--accent-gold); background: rgba(0,0,0,0.4); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                <span class="usa-badge" style="font-size: 0.65rem; padding: 2px 8px; letter-spacing: 1px; height: auto;">USA</span>
                <span style="color: var(--accent-gold); font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem;">How to Make The Team</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 20px;">The process is nuanced, but the goal is simple: Be fast.</p>

            <div class="explainer-steps" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 20px;">
                <div class="card" style="background: rgba(255,255,255,0.03); margin-bottom: 0; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="color: var(--accent-gold); font-size: 1.6rem; margin-bottom: 15px; font-weight: 900;">1. Win</h3>
                    <p style="font-weight: 800; color: #fff; font-size: 0.9rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Finish Top 2 or 3 at Selection</p>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">Most spots are earned directly by finishing on the podium at the <b>2026 Trials in Milwaukee</b>.</p>
                </div>
                <div class="card" style="background: rgba(255,255,255,0.03); margin-bottom: 0; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="color: var(--accent-gold); font-size: 1.6rem; margin-bottom: 15px; font-weight: 900;">2. Rank</h3>
                    <p style="font-weight: 800; color: #fff; font-size: 0.9rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">We Need a "Ticket"</p>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">The USA only has a set number of spots for each race. Even if you medal here, we need to have an Olympic "ticket" for you to use.</p>
                </div>
                <div class="card" style="background: rgba(255,255,255,0.03); margin-bottom: 0; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="color: var(--accent-gold); font-size: 1.6rem; margin-bottom: 15px; font-weight: 900;">3. Survive</h3>
                    <p style="font-weight: 800; color: #fff; font-size: 0.9rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">The 14 Skater Limit</p>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">We can only take <b>8 Men and 6 Women</b> total. If more people qualify, those with the lowest <b>World Rankings</b> get left home.</p>
            </div>
        </div>

        <div class="stats-grid" style="margin-bottom: 1.5rem;">
             <div class="stat-card">
                <div class="stat-icon" style="color: #3b82f6;">M</div>
                <div class="stat-info">
                    <span class="stat-value">${menCount} / ${menStats.teamCap}</span>
                    <span class="stat-label">Men's Spots</span>
                </div>
            </div>
             <div class="stat-card">
                <div class="stat-icon" style="color: #ec4899;">W</div>
                <div class="stat-info">
                    <span class="stat-value">${womenCount} / ${womenStats.teamCap}</span>
                    <span class="stat-label">Women's Spots</span>
                </div>
            </div>
             <div class="stat-card">
                <div class="stat-icon">T</div>
                <div class="stat-info">
                    <span class="stat-value">${totalCount} / 14</span>
                    <span class="stat-label">Total Roster</span>
                </div>
            </div>
        </div>

        <!-- PROGRESS TRACKER WITH CUT LINE -->
        <div class="card" style="margin-bottom: 2rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05);">
            <div class="progress-section" style="margin-bottom: 0;">
                <div class="progress-header" style="margin-bottom: 12px;">
                    <div class="progress-title" style="letter-spacing: 1.5px; font-weight: 900; opacity: 1;">COMBINED TEAM PROGRESSION</div>
                    <div class="progress-count" style="font-size: 1.2rem; font-weight: 900; color: var(--accent-gold);">${totalCount} / 14</div>
                </div>
                
                <div class="progress-bar-wrapper" style="position: relative; padding: 15px 0;">
                    <div class="progress-bar-container" style="background: rgba(255,255,255,0.03); height: 18px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); position: relative; display: flex; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);">
                        <!-- Main Roster (Gold) up to 14 -->
                        <div class="progress-segment" 
                             style="width: ${Math.min(cutPercentage, (totalCount / maxViz) * 100)}%; 
                                    background: var(--accent-gold); 
                                    height: 100%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                                    box-shadow: inset 0 0 10px rgba(255,255,255,0.2);"></div>
                        
                        <!-- Overflow (Red) beyond 14 -->
                        ${totalCount > 14 ? `
                            <div class="progress-segment pulse-red" 
                                 style="width: ${Math.min(100 - cutPercentage, ((totalCount - 14) / maxViz) * 100)}%; 
                                        background: var(--error); 
                                        height: 100%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                        ` : ''}
                    </div>

                    <!-- STATIC CUT LINE MARKER (OUTSIDE OVERFLOW) -->
                    <div style="position: absolute; left: ${cutPercentage}%; top: 5px; bottom: 5px; width: 3px; background: #fff; z-index: 20; box-shadow: 0 0 15px #fff, 0 0 5px #000; border-radius: 2px; pointer-events: none;">
                        <div style="position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #fff; font-weight: 900; white-space: nowrap; letter-spacing: 1px; text-shadow: 0 0 5px #000;">14 PERSON CUT LINE</div>
                        ${totalCount > 14 ? `<div style="position: absolute; bottom: -16px; left: 0; font-size: 8px; color: var(--error); font-weight: 900; white-space: nowrap; letter-spacing: 1px;">REDUCTION AREA</div>` : ''}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">
                    <span style="color: ${totalCount > 14 ? 'var(--error)' : 'var(--accent-gold)'}">
                        ${totalCount > 14 ? 'REDUCTION ACTIVE' : totalCount === 14 ? 'ROSTER FULL' : 'OPEN SPOTS REMAINING'}
                    </span>
                    <span style="color: var(--text-muted); opacity: 0.7;">MAX 14 SPOTS CAP</span>
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
        const { roster: fullRoster, teamCap } = calculateReduction(gender);

        const isRealAthlete = (name) => !name.startsWith('Team Pursuit Slot') && name !== 'Available';
        const roster = fullRoster.filter(a => isRealAthlete(a.name));

        const qualifiedCount = roster.length;
        const cutCount = Math.max(0, qualifiedCount - teamCap);
        const onTeamCount = Math.min(qualifiedCount, teamCap);

        let statusMessage = "";
        let statusClass = "";
        if (cutCount > 0) {
            statusMessage = `<strong>Reduction Active:</strong> ${cutCount} ${gender === 'women' ? 'Women' : 'Men'} must be cut to meet the ${teamCap}-person cap.`;
            statusClass = "alert-error";
        } else if (qualifiedCount === teamCap) {
            statusMessage = `<strong>Team Full:</strong> ${gender === 'women' ? "Women's" : "Men's"} Roster is at exactly ${teamCap} athletes.`;
            statusClass = "alert-success";
        } else {
            statusMessage = `<strong>Open Spots:</strong> ${teamCap - qualifiedCount} ${gender === 'women' ? "Women's" : "Men's"} roster spots remaining before reduction is needed.`;
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
            
            <div class="card ${statusClass} mb-2" style="border-left: 5px solid; padding:15px;">
                ${statusMessage}
            </div>

            <div class="card mb-2">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>Predicted ${gender === 'women' ? "Women's" : "Men's"} Roster</h3>
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
                        </tr>
                    </thead>
                    <tbody>
                        ${roster.map((t, idx) => {
            const isOverCap = idx >= teamCap;
            const isHighPriority = t.reductionRank > 0 && t.reductionRank <= 10;
            const isProtected = t.reductionRank === 0 || t.events.includes('TpSpec') || isHighPriority;
            const isActuallyAtRisk = roster.length > 14 && idx >= 11 && !isProtected;

            let displayRank = t.reductionRank === 0 ? 'Protected' : `Priority ${t.reductionRank}`;
            if (t.events.includes('TpSpec')) {
                const tpRank = (gender === 'women') ? 3 : 1;
                displayRank = `Priority ${tpRank} (Protected)`;
            }

            let rowClass = "";
            let statusBadge = "";

            if (isOverCap) {
                rowClass = "row-out";
                statusBadge = '<span class="status-note note-out">Outside Cap</span>';
            } else if (isActuallyAtRisk) {
                rowClass = "row-vulnerable";
                statusBadge = '<span class="status-note note-vulnerable">On the Bubble</span>';
            } else {
                rowClass = "row-protected";
                statusBadge = isProtected ? '<span class="status-note note-protected">Qualified</span>' : '<span class="status-note note-protected">In (Provisional)</span>';
            }

            return `
                            <tr class="${rowClass}">
                                <td>${idx + 1}</td>
                                <td>
                                    <strong>${t.name}</strong>
                                    ${statusBadge}
                                </td>
                                <td>${t.events.map(e => `<span class="badge ${e === 'TpSpec' ? 'badge-warn' : ''}">${e === 'TpSpec' ? 'Team Pursuit' : e}</span>`).join(' ')}</td>
                                <td><strong>${displayRank}</strong></td>
                                <td>
                                    ${isOverCap ? '<span style="color:var(--error)">X Cut</span>' : '<span style="color:var(--success)">On Team</span>'}
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
                <div style="display:flex; gap:15px; margin-bottom:15px; color:#aaa; font-size: 0.8rem; flex-wrap: wrap;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="background:#dc3545; color:#fff; padding:2px 6px; border-radius:3px; font-size:0.7em; text-transform:uppercase; font-weight:bold;">Direct</span>
                        <span>= Qual'd via World Cup (Protected)</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="background:#0d6efd; color:#fff; padding:2px 6px; border-radius:3px; font-size:0.7em; text-transform:uppercase; font-weight:bold;">O. Trials</span>
                        <span>= Spot earned at Trials</span>
                    </div>
                </div>
                ${renderDistanceBreakdown(gender)}
            </div>
        `;
    } catch (e) {
        console.error("Render Error:", e);
        return `<div class="card alert-error"><h3>Error Loading Tracker</h3><p>${e.message}</p></div>`;
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
                            <button class="pulse-eye" onclick="showSkatersToWatch('${gender}', '${dist}')" title="Skaters to Watch - Click to Share!">👀</button>
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
    // Admin Guard
    if (!appState.isAdmin) {
        return `
            <div style="text-align:center; padding:50px; color:#ccc;">
                <h2>🔒 Admin Access Required</h2>
                <p>You must be an administrator to enter race results.</p>
                <button class="btn btn-primary" onclick="toggleAdminMode()" style="margin-top:10px;">Login Here</button>
            </div>
        `;
    }

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
        `<option value="${d}" ${appState.viewDistance === d ? 'selected' : ''}>${d.replace(/_/g, ' ').toUpperCase()}</option>`
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

function clearMsRace(raceNum, gender) {
    if (!confirm(`Are you sure you want to CLEAR ALL results for Race ${raceNum}? This cannot be undone.`)) return;

    // Reset Data
    if (appState.msRaces[gender]) {
        appState.msRaces[gender][raceNum] = null;
    }

    // Recalculate Standings
    calculateMassStartStandings(gender);
    saveToStorage();
    renderCurrentTab();

    // Show Toast via global helper if available, or alert
    const toast = document.createElement('div');
    toast.innerText = `Race ${raceNum} Data Cleared`;
    toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#d9534f; color:white; padding:10px 20px; border-radius:4px; z-index:10000;";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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
                <button class="btn btn-secondary" style="margin-left:5px;" onclick="shareMassStartProtocolPdf('${gender}', ${raceNum})">🖨️ Referee PDF</button>
                <button class="btn btn-outline-danger" style="margin-left:5px;" onclick="clearMsRace(${raceNum}, '${gender}')">🗑️ Clear</button>
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
                <span style="width:200px;">Athlete</span>
                <span style="width:140px;">Status</span>
                <span style="width:80px;">Pos</span>
                <span style="width:120px;">Time</span>
            </div>
            <div id="finish-rows">
                ${athletes.map(a => `
                    <div style="display:flex; gap:10px; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #333; align-items:center;">
                        <span style="width:200px; font-weight:bold; font-size:1.1em;">${a.name}</span>
                        <select id="status_${a.id}" class="form-control p-1" style="width:140px;">
                            <option value="finished">Finished</option>
                            <option value="lapped">Lapped</option>
                            <option value="dnf">DNF</option>
                            <option value="dsq">DQ</option>
                            <option value="dns">DNS</option>
                        </select>
                        <select id="pos_${a.id}" class="form-control p-1 pos-select" style="width:80px;" onchange="updateMsDropdowns()">
                            <option value="">-</option>
                            ${Array.from({ length: athletes.length }, (_, i) => i + 1).map(n => `<option value="${n}">${n}</option>`).join('')}
                        </select>
                        <input type="text" id="time_${a.id}" class="form-control p-1" placeholder="M:SS.ms" style="width:120px;">
                        <button class="btn btn-sm btn-outline-danger" onclick="document.getElementById('status_${a.id}').value='dns'; this.parentElement.style.display='none';" title="Remove from this race (Set DNS)">❌</button>
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
        const f = document.getElementById(`int${i + 1}_1st`).value;
        const s = document.getElementById(`int${i + 1}_2nd`).value;
        const t = document.getElementById(`int${i + 1}_3rd`).value;

        // Validation: No duplicates in same sprint
        const selected = [f, s, t].filter(v => v !== "");
        const unique = new Set(selected);
        if (selected.length !== unique.size) {
            alert(`Duplicate athlete in Lap ${sprintConfig.intermediateLaps[i]} Sprint. Please fix.`);
            return;
        }

        intermediates.push({
            lap: sprintConfig.intermediateLaps[i],
            first: f,
            second: s,
            third: t
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
                name: a.name, // Save Name
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
            id: f.athleteId, name: f.name, // Copy Name
            intermediatePoints: 0, sprints: [0, 0, 0], finalPoints: 0, totalRacePoints: 0,
            finishPosition: f.position, time: f.time, status: f.status
        };
    });

    intermediates.forEach((int, idx) => {
        [int.first, int.second, int.third].forEach((id, place) => {
            if (id && results[id]) {
                const pts = sprintConfig.intermediate[place];
                results[id].intermediatePoints += pts;
                results[id].sprints[idx] = pts; // Assign to specific sprint index
            }
        });
    });

    finishOrder.forEach(f => {
        if (f.status === 'finished' && f.position <= sprintConfig.final.length) {
            results[f.athleteId].finalPoints = sprintConfig.final[f.position - 1];
        }
    });

    Object.values(results).forEach(r => {
        // Rule: Skaters who do not finish lose intermediate points
        if (r.status !== 'finished') {
            r.intermediatePoints = 0;
            r.sprints = [0, 0, 0];
            r.finalPoints = 0;
        }
        r.totalRacePoints = r.intermediatePoints + r.finalPoints;
    });

    // Sort and Rank
    const sorted = Object.entries(results).sort((a, b) => {
        // 1. Points (Desc)
        if (b[1].totalRacePoints !== a[1].totalRacePoints) return b[1].totalRacePoints - a[1].totalRacePoints;

        // 2. Finish Position (Asc)
        const posA = a[1].finishPosition || 999;
        const posB = b[1].finishPosition || 999;
        if (posA !== posB) return posA - posB;

        // 3. Time (Asc) - Fallback for Rule 6.2.c (if pos not entered)
        const timeA = a[1].time || 'ZZZ'; // ZZZ to put NT/Empty at bottom
        const timeB = b[1].time || 'ZZZ';
        return timeA.localeCompare(timeB, undefined, { numeric: true });
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
        // Best 3 of 4 Logic
        const raceNums = [1, 2, 3, 4];
        const scores = [];
        raceNums.forEach(r => {
            if (s.races[r] !== undefined) {
                scores.push({ race: r, score: s.races[r] });
            }
        });

        // Sort desc by score
        scores.sort((a, b) => b.score - a.score);

        // Sum top 3
        const top3 = scores.slice(0, 3);
        s.total = top3.reduce((sum, item) => sum + item.score, 0);

        // Identify dropped (lowest) races if 4 raced
        if (scores.length > 3) {
            const top3Races = new Set(top3.map(i => i.race));
            s.droppedRaces = scores.filter(i => !top3Races.has(i.race)).map(i => i.race);
        } else {
            s.droppedRaces = [];
        }
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
                ? '<span style="color:#666;">-</span>'
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
                                ${isTP ? `<span class="badge" style="background:#22c55e; color:black;">2x Specialists (If Needed)</span>` : (q.soqcRanks ? q.soqcRanks.join(', ') : '-')}
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
                    <strong style="color: #fff; display:block; margin-bottom:5px;">We Need a "Ticket"</strong>
                    <p style="font-size: 0.9em; color: #aaa;">The USA only has a set number of spots for each race. Even if you medal here, we need to have an Olympic "ticket" for you to use.</p>
                </div>
                <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 2em; color: #D4AF37; margin-bottom: 5px;">3. Survive</div>
                    <strong style="color: #fff; display:block; margin-bottom:5px;">The 14 Skater Limit</strong>
                    <p style="font-size: 0.9em; color: #aaa;">We can only take <strong>8 Men</strong> and <strong>6 Women</strong> total. If more people qualify, those with the lowest <strong>World Rankings</strong> get left home.</p>
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
                    <li style="margin-bottom: 5px;"><strong style="color:#aaa;">World Ranking (SOQC):</strong> Your global rank based on World Cups. Used to decide who gets cut if we qualify more than 14 skaters.</li>
                    <li style="margin-bottom: 5px;"><strong style="color:#aaa;">Direct Nomination:</strong> "Protected" status earned <em>before</em> these Trials by winning major World Cup medals. These athletes are already safe.</li>
                    <li style="margin-bottom: 5px;"><strong style="color:#aaa;">Trials Qualification:</strong> Earning your spot by finishing on the podium (Top 2 or 3) right here at the Olympic Trials.</li>
                    <li style="margin-bottom: 5px;"><strong style="color:#aaa;">Team Pursuit Specialists:</strong> Up to 2 skaters selected specifically for the Team event (they count toward the 8 Men / 6 Women cap).</li>
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
    const availableDistances = gender === 'women'
        ? ['mass_start', '500m', '1000m', '1500m', '3000m']
        : ['mass_start', '500m', '1000m', '1500m', '5000m'];

    // Default to mass_start if current viewDistance is not valid for gender
    if (!availableDistances.includes(appState.viewDistance)) {
        appState.viewDistance = 'mass_start';
    }
    const viewDist = appState.viewDistance;

    let html = `
        <div class="section-header" style="flex-direction: column; align-items: flex-start; gap: 15px;">
            <div style="display:flex; justify-content:space-between; width:100%; flex-wrap: wrap; gap: 10px;">
                <div class="segment-group">
                    <button class="btn-segment ${gender === 'women' ? 'active' : ''}" 
                        onclick="appState.viewGender='women'; renderCurrentTab()">Women</button>
                    <button class="btn-segment ${gender === 'men' ? 'active' : ''}" 
                        onclick="appState.viewGender='men'; renderCurrentTab()">Men</button>
                </div>
            </div>

            <div class="tabs-sub" style="display:flex; gap: 8px; flex-wrap: wrap; width: 100%; margin-top: 5px;">
                 ${availableDistances.map(d => `
                     <button class="btn-tab ${viewDist === d ? 'active' : ''}"
                         onclick="appState.viewDistance='${d}'; renderCurrentTab()"
                         style="text-transform: capitalize;">
                         ${d.replace('_', ' ')}
                     </button>
                 `).join('')}
            </div>
            
            <h2 style="margin-top: 10px;">🏆 ${viewDist === 'mass_start' ? 'Mass Start Series' : viewDist} Standings</h2>
        </div>
    `;

    if (viewDist === 'mass_start') {
        html += renderMassStartTable(gender);
    } else {
        html += renderDistanceTable(gender, viewDist);
    }

    return html;
}

function renderMassStartTable(gender) {
    const standings = calculateMassStartStandings(gender);
    const filteredStandings = standings.filter(s => s.total > 0 || (s.droppedRaces && s.droppedRaces.length > 0)); // Show if they have points
    const preNominated = OLYMPIC_CONFIG[gender].mass_start?.preNominated || [];

    return `
        <div class="card" id="ms-standings-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; flex-wrap:wrap; gap:15px;">
                <div>
                    <h3 style="margin-top:0;">${gender === 'women' ? "Women's" : "Men's"} Overall Points</h3>
                    <p class="text-muted" style="margin-bottom:0;">Accumulated points from Races 1-4. (Official selection uses Best 3 of 4).</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="shareMsStandingsImage()" class="btn btn-sm" style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #8a3ab9); color:white; border:none; font-size: 0.9rem; padding: 8px 16px; font-weight:700; box-shadow: 0 4px 15px rgba(220, 39, 67, 0.4);">📸 Insta Post</button>
                    <button onclick="shareMsStandingsPdf()" class="btn btn-sm" style="background: #eee; color:#333; border:1px solid #ccc; font-size: 0.9rem; padding: 8px 16px; font-weight:700; display:flex; align-items:center; gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> 
                        PDF
                    </button>
                </div>
            </div>
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

        const getCell = (rNum) => {
            const val = s.races[rNum];
            const isDropped = s.droppedRaces && s.droppedRaces.includes(rNum);
            if (!val && val !== 0) return `<td class="text-center" style="color:#555;">-</td>`;
            if (isDropped) return `<td class="text-center" style="color:#666; text-decoration: line-through; font-size: 0.9em;">${val}</td>`;
            return `<td class="text-center" style="color:#fff;">${val}</td>`;
        };

        return `
                                <tr>
                                    <td class="${rankClass}" style="font-weight:bold; font-size:1.1em;">${rank}</td>
                                    <td>
                                        <strong>${s.name}</strong>
                                        ${isQualified ? '<span class="badge" style="background:#28a745; margin-left:8px; font-size:0.7em;">✅ Pre-Qualified</span>' : ''}
                                    </td>
                                    ${getCell(1)} ${getCell(2)} ${getCell(3)} ${getCell(4)}
                                    <td class="text-center" style="font-size:1.2em; font-weight:bold; color:#D4AF37;">${s.total}</td>
                                </tr>
                            `;
    }).join('') : '<tr><td colspan="7" class="text-center">No results yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderDistanceTable(gender, dist) {
    const data = appState.events[gender][dist]?.results || [];
    // Sort logic handled in edit/save, but ensure sorted for display
    // For now assume array is objects: { id, name, time, time1, time2, best }

    // Sort by Best Time (asc)
    const sortedData = [...data].sort((a, b) => {
        if (!a.best) return 1;
        if (!b.best) return -1;
        return a.best.localeCompare(b.best); // Simple string compare for "38.50" vs "38.60" works usually if format consistent. Ideally parse.
    });

    const is500 = dist === '500m';

    return `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; flex-wrap:wrap; gap:15px;">
                <div>
                    <h3 style="margin:0;">${dist} Results</h3>
                    <p class="text-muted" style="margin-bottom:0;">${is500 ? 'Ranked by fastest of two races.' : 'Ranked by fastest time.'}</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="shareMsStandingsImage()" class="btn btn-sm" style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #8a3ab9); color:white; border:none; font-size: 0.9rem; padding: 8px 16px; font-weight:700; box-shadow: 0 4px 15px rgba(220, 39, 67, 0.4);">📸 Insta Post</button>
                    <button onclick="shareMsStandingsPdf()" class="btn btn-sm" style="background: #eee; color:#333; border:1px solid #ccc; font-size: 0.9rem; padding: 8px 16px; font-weight:700; display:flex; align-items:center; gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> 
                        PDF
                    </button>
                    ${appState.isAdmin ? `
                        <button class="btn btn-sm btn-outline-warning" onclick="openDistanceEdit('${gender}', '${dist}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-outline-info" onclick="openIsuImportModal('${gender}', '${dist}')">📡 Import</button>
                    ` : ''}
                </div>
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:50px">Rank</th>
                            <th>Athlete</th>
                            ${is500 ? `<th class="text-center">Race 1</th><th class="text-center">Race 2</th>` : ''}
                            <th class="text-center" style="color:#D4AF37;">${is500 ? 'Best Time' : 'Time'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedData.length > 0 ? sortedData.map((s, i) => `
                            <tr>
                                <td style="font-weight:bold;">${i + 1}</td>
                                <td>${s.name}</td>
                                ${is500 ? `
                                    <td class="text-center" style="color:#aaa;">${s.time1 || '-'}</td>
                                    <td class="text-center" style="color:#aaa;">${s.time2 || '-'}</td>
                                ` : ''}
                                <td class="text-center" style="font-size:1.1em; font-weight:bold; color:#fff;">${s.best || s.time || '-'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="text-center">No results entered.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Share MS Standings as Image (for Instagram - 1080x1350 format)
function shareMsStandingsImage() {
    if (typeof shareGenericDistanceImage === 'function' && appState.viewDistance && appState.viewDistance !== 'mass_start') {
        return shareGenericDistanceImage();
    }
    const gender = appState.viewGender;
    const standings = calculateMassStartStandings(gender);
    const filteredStandings = standings.filter(s => s.total > 0);
    const genderLabel = gender === 'women' ? "WOMEN'S" : "MEN'S";

    // Limit to top 12
    const displayAthletes = filteredStandings.slice(0, 12);

    // Create a container specifically for the image capture
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed; top: 0; left: -9999px;
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
                <div style="background: #D4AF37; color: #000; padding: 4px 15px; font-weight: bold; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">Unofficial Standings</div>
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
                    ${displayAthletes.map((s, i) => {
        const rank = i + 1;
        let bgStyle = 'background: rgba(255,255,255,0.02);'; // Default
        let rankColor = '#666';
        let rankScale = '1.0';

        if (rank === 1) {
            bgStyle = 'background: linear-gradient(90deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0) 100%); border-left: 4px solid #D4AF37;';
            rankColor = '#D4AF37'; rankScale = '1.3';
        }
        else if (rank === 2) {
            bgStyle = 'background: linear-gradient(90deg, rgba(192,192,192,0.2) 0%, rgba(192,192,192,0) 100%); border-left: 4px solid #C0C0C0;';
            rankColor = '#C0C0C0'; rankScale = '1.2';
        }
        else if (rank === 3) {
            bgStyle = 'background: linear-gradient(90deg, rgba(205,127,50,0.2) 0%, rgba(205,127,50,0) 100%); border-left: 4px solid #CD7F32;';
            rankColor = '#CD7F32'; rankScale = '1.2';
        } else if (i % 2 === 0) {
            bgStyle = 'background: rgba(255,255,255,0.05);';
        }

        return `
                        <tr style="${bgStyle} height: 60px;">
                            <td style="padding: 0 20px; font-weight: 900; color: ${rankColor}; font-size: ${24 * parseFloat(rankScale)}px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${rank}</td>
                            <td style="padding: 0 10px; font-weight: 700; font-size: 24px; color: ${rank === 1 ? '#fff' : '#ddd'}; letter-spacing: 0.5px;">${s.name.toUpperCase()}</td>
                            <td style="color: #888; font-size: 20px; font-weight: 500; text-align: center; font-family: monospace;">${s.races[1] || '<span style="opacity:0.2">-</span>'}</td>
                            <td style="color: #888; font-size: 20px; font-weight: 500; text-align: center; font-family: monospace;">${s.races[2] || '<span style="opacity:0.2">-</span>'}</td>
                            <td style="color: #888; font-size: 20px; font-weight: 500; text-align: center; font-family: monospace;">${s.races[3] || '<span style="opacity:0.2">-</span>'}</td>
                            <td style="color: #888; font-size: 20px; font-weight: 500; text-align: center; font-family: monospace;">${s.races[4] || '<span style="opacity:0.2">-</span>'}</td>
                            <td style="padding-right: 25px; text-align: right; font-weight: 900; font-family: monospace; font-size: 36px; color: ${rank <= 3 ? '#D4AF37' : '#fff'}; text-shadow: 0 0 10px rgba(0,0,0,0.3);">
                                ${s.total}
                            </td>
                        </tr>
                    `;
    }).join('')}
                </tbody>
            </table>
        </div>

        <div style="text-align: center; color: rgba(255,255,255,0.6); font-size: 18px; margin-top: 10px; font-style: italic; letter-spacing: 1px;">
            * Lowest score dropped if 4 races completed
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

// =============================================================================
// SKATERS TO WATCH MODAL (with Instagram-style export)
// =============================================================================
let currentWatchListBlob = null;
let currentWatchListFileName = "";

function getSkatersToWatchData(gender, dist) {
    if (dist === 'mass_start') {
        const standings = calculateMassStartStandings(gender);
        const top10 = standings.filter(s => s.total > 0).slice(0, 10);
        return {
            note: top10.length === 0 ? "No mass start points recorded yet." : null,
            skaters: top10.map((s, i) => ({
                rank: i + 1,
                name: s.name,
                time: `${s.total} pts`,
                notes: ''
            }))
        };
    }
    return null;
}

function showSkatersToWatch(gender, dist) {
    const data = getSkatersToWatchData(gender, dist);

    const genderLabel = gender === 'women' ? "Women's" : "Men's";
    const distLabel = dist === 'mass_start' ? 'Mass Start' : dist === 'team_pursuit' ? 'Team Pursuit' : dist;
    const listSubHeader = dist === 'mass_start' ? 'Current Standings' : '2026 Season Bests';
    const valueHeader = dist === 'mass_start' ? 'Points' : 'Time';

    currentWatchListBlob = null;

    const modal = document.createElement('div');
    modal.id = 'skaters-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center;
        z-index: 10000; font-family: 'Outfit', sans-serif; padding: 20px;
    `;

    if (!data || data.note) {
        modal.innerHTML = `
            <div style="background: #000; border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; max-width: 400px; width: 100%; padding: 40px; text-align: center;">
                <h2 style="color: var(--accent-gold); margin-bottom: 15px;">${genderLabel} ${distLabel}</h2>
                <p style="color: #888; margin-bottom: 20px;">${data?.note || 'No data available for this distance yet.'}</p>
                <button onclick="document.getElementById('skaters-modal').remove()" class="btn btn-primary">Close</button>
            </div>
        `;
    } else {
        modal.innerHTML = `
            <div style="background: #000; border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; max-width: 550px; width: 100%; max-height: 98vh; overflow-y: auto; box-shadow: 0 0 60px rgba(0,0,0,1);">
                <div style="padding: 20px 30px; display: flex; flex-direction: column; gap: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <button id="insta-download-btn" onclick="downloadSkatersImage('${gender}', '${dist}')" class="btn btn-sm" style="background: #333; color:white; border:none; border-radius: 4px; font-weight: 800; font-size: 0.7rem; letter-spacing: 1px; padding: 6px 12px; cursor: pointer; opacity: 0.6;">PREPARING...</button>
                        <button onclick="document.getElementById('skaters-modal').remove()" style="background: rgba(255,255,255,0.1); border: 1px solid #555; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; padding: 8px 16px; border-radius: 4px; display: flex; align-items: center; gap: 6px;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">✕ CLOSE</button>
                    </div>

                    <div style="border-left: 6px solid #D4AF37; padding-left: 15px; margin-bottom: 15px;">
                        <div style="font-size: 13px; letter-spacing: 6px; color: #888; text-transform: uppercase; font-weight: 500; margin-bottom: 2px;">${getBranding('SHORT_EVENT_NAME')}</div>
                        <h1 style="font-size: 38px; margin: 0; color: #fff; text-transform: uppercase; font-weight: 900; line-height: 0.85; letter-spacing: -1px;">
                            ${genderLabel}<br><span style="color: #D4AF37;">${distLabel}</span>
                        </h1>
                        <div style="margin-top: 10px; font-size: 14px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 3px;">
                            Skaters To Watch <span style="color: #D4AF37;">//</span> ${listSubHeader}
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 40px 1fr 140px; border-bottom: 2px solid #D4AF37; padding-bottom: 6px; margin-bottom: 8px; color: #555; font-size: 11px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">
                        <span>#</span><span>Athlete</span><span style="text-align: right;">${valueHeader}</span>
                    </div>

                    <div style="display: flex; flex-direction: column;">
                        ${data.skaters.map((s, i) => `
                            <div style="display: grid; grid-template-columns: 40px 1fr 140px; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                                <span style="font-size: 16px; font-weight: 900; color: ${i < 3 ? '#D4AF37' : '#666'}; font-style: italic;">${s.rank}</span>
                                <span style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #fff;">${s.name}</span>
                                <span style="font-size: 18px; font-weight: 900; font-family: monospace; color: #fff; text-align: right;">${s.time}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid rgba(212, 175, 55, 0.2); display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 14px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">
                            <span style="color: #fff;">@SALTY</span><span style="color: #D4AF37;">GOLD</span><span style="color: #fff;">SUPPLY</span>
                        </div>
                        <button onclick="document.getElementById('skaters-modal').remove()" style="background: #333; border: none; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; padding: 10px 20px; border-radius: 6px;">✕ CLOSE</button>
                    </div>
                </div>
            </div>
        `;
    }

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);

    if (data && !data.note) {
        preRenderSkatersImage(gender, dist);
    }
}

function preRenderSkatersImage(gender, dist) {
    const data = getSkatersToWatchData(gender, dist);
    if (!data || data.note) return;

    const genderLabel = gender === 'women' ? "WOMEN'S" : "MEN'S";
    const distLabel = dist === 'mass_start' ? 'MASS START' : dist.toUpperCase();
    const listSubHeader = dist === 'mass_start' ? 'Current Standings' : '2026 Season Bests';
    const valueHeader = dist === 'mass_start' ? 'Points' : 'Performance';

    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed; top: 0; left: -9999px; width: 1080px; height: 1350px; background: #000;
        color: white; font-family: 'Outfit', sans-serif; padding: 0; box-sizing: border-box;
        z-index: -9999; display: flex; flex-direction: column; overflow: hidden;
    `;

    exportContainer.innerHTML = `
        <div style="padding: 40px 70px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; background: #000;">
            <div style="border-left: 10px solid #D4AF37; padding-left: 30px; margin-bottom: 25px; position: relative;">
                <div style="font-size: 24px; letter-spacing: 12px; color: #888; text-transform: uppercase; font-weight: 500; margin-bottom: 5px;">${getBranding('SHORT_EVENT_NAME')}</div>
                <h1 style="font-size: 100px; margin: 0; color: #fff; text-transform: uppercase; font-weight: 900; line-height: 0.8; letter-spacing: -3px;">
                    ${genderLabel}<br><span style="color: #D4AF37;">${distLabel}</span>
                </h1>
                <div style="margin-top: 15px; font-size: 22px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 5px;">
                    Skaters to Watch <span style="color: #D4AF37;">//</span> ${listSubHeader}
                </div>
                <div style="position: absolute; top: 0; right: 0; text-align: right; opacity: 0.9;">
                    <div style="font-size: 16px; font-weight: 900; letter-spacing: 5px;"><span style="color: #fff;">SALTY</span> <span style="color: #D4AF37;">GOLD</span></div>
                    <div style="font-size: 11px; font-weight: 700; color: #fff; letter-spacing: 2px;">SUPPLY</div>
                </div>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column;">
                <div style="display: grid; grid-template-columns: 80px 1fr 380px; border-bottom: 3px solid #D4AF37; padding-bottom: 10px; margin-bottom: 5px; color: #666; font-size: 18px; text-transform: uppercase; font-weight: 900; letter-spacing: 3px;">
                    <span>Rank</span><span>Athlete</span><span style="text-align: right;">${valueHeader}</span>
                </div>
                ${data.skaters.slice(0, 10).map((s, i) => `
                    <div style="display: grid; grid-template-columns: 80px 1fr 380px; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                        <span style="font-size: 32px; font-weight: 900; color: ${i < 3 ? '#D4AF37' : '#888'}; font-style: italic;">${s.rank}</span>
                        <span style="font-size: 34px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${s.name}</span>
                        <span style="font-size: 42px; font-weight: 900; font-family: monospace; color: #fff; text-align: right;">${s.time}</span>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3); display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 36px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; line-height: 1;"><span style="color: #fff;">@SALTY</span><span style="color: #D4AF37;">GOLD</span><span style="color: #fff;">SUPPLY</span></div>
                <div style="font-size: 20px; color: #888; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">SALTYGOLDSUPPLY.COM</div>
            </div>
        </div>
    `;

    document.body.appendChild(exportContainer);

    setTimeout(() => {
        html2canvas(exportContainer, { scale: 1, useCORS: true, backgroundColor: '#000', logging: false }).then(canvas => {
            document.body.removeChild(exportContainer);
            canvas.toBlob(blob => {
                currentWatchListBlob = blob;
                currentWatchListFileName = `SaltyGold_${dist}_WatchList.png`;

                const btn = document.getElementById('insta-download-btn');
                if (btn) {
                    btn.style.background = 'linear-gradient(45deg, #f09433, #dc2743, #bc1888, #8a3ab9)';
                    btn.style.opacity = '1';
                    btn.innerText = 'CREATE INSTA POST';
                }
            }, 'image/png');
        }).catch(err => {
            console.error(err);
            if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
        });
    }, 1000);
}

function downloadSkatersImage(gender, dist) {
    if (!currentWatchListBlob) {
        showToast('Still crafting your graphic... Please wait!');
        return;
    }

    const file = new File([currentWatchListBlob], currentWatchListFileName, { type: 'image/png' });
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
            files: [file],
            title: 'Skaters to Watch',
            text: `Check out these athletes! ${getBranding('HASHTAG')}`
        }).then(() => showToast('Shared successfully!')).catch(() => saveAsFile(currentWatchListBlob, currentWatchListFileName));
    } else {
        saveAsFile(currentWatchListBlob, currentWatchListFileName);
    }
}

// Share MS Standings as PDF

function shareMsStandingsPdf() {
    if (typeof shareGenericDistancePdf === 'function' && appState.viewDistance && appState.viewDistance !== 'mass_start') {
        return shareGenericDistancePdf();
    }
    const gender = appState.viewGender;
    const standings = calculateMassStartStandings(gender);
    const filteredStandings = standings.filter(s => s.total > 0);
    const genderLabel = gender === 'women' ? "Women's" : "Men's";

    // Dynamic sizing for PDF based on athlete count
    const athleteCount = filteredStandings.length;
    const pdfPadding = athleteCount <= 12 ? 12 : athleteCount <= 16 ? 10 : 8;
    const pdfFontSize = athleteCount <= 12 ? 14 : athleteCount <= 16 ? 12 : 10;

    // Get current date formatted nicely
    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Create printable HTML with Instagram-style design
    const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${genderLabel} Mass Start Standings</title>
            <style>
                @page { margin: 0.5in; }
                body { 
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                    padding: 40px;
                    background: white;
                    color: #333;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eee; }
                .header-brand { font-size: 11px; color: #888; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px; font-weight: 600; }
                .header-title { font-size: 36px; font-weight: 900; color: #000; text-transform: uppercase; margin: 0; letter-spacing: -1px; }
                .header-subtitle { font-size: 16px; color: #D4AF37; margin-top: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
                .header-date { font-size: 14px; color: #333; margin-top: 10px; font-weight: 600; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                
                /* Black Header */
                thead tr { background-color: #000 !important; color: #fff !important; }
                th { 
                    text-align: center;
                    padding: 14px 10px;
                    font-weight: 700;
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #fff !important;
                    letter-spacing: 1px;
                    border: none;
                }
                th.text-left { text-align: left; padding-left: 20px; }
                
                td { 
                    padding: 14px 10px; 
                    text-align: center;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 14px;
                    color: #444;
                    vertical-align: middle;
                }
                td.name { text-align: left; font-weight: 700; font-size: 15px; color: #000; padding-left: 20px; }
                
                /* Rank Badges */
                .rank-cell { display: flex; justify-content: center; align-items: center; }
                .rank-badge {
                    display: inline-block;
                    width: 24px;
                    height: 24px;
                    line-height: 24px;
                    border-radius: 50%;
                    text-align: center;
                    font-size: 12px;
                    font-weight: 900;
                    color: #fff;
                    background: #eee; /* Default */
                }
                .rank-badge-1 { background-color: #D4AF37 !important; color: #fff; box-shadow: 0 2px 4px rgba(212,175,55,0.3); }
                .rank-badge-2 { background-color: #A0A0A0 !important; color: #fff; }
                .rank-badge-3 { background-color: #CD7F32 !important; color: #fff; }
                .rank-badge-common { background: transparent; color: #000; font-size: 16px; font-weight: 900; }

                .total { font-weight: 900; color: #000; font-size: 16px; }
                
                .footer { 
                    display: flex;
                    justify-content: space-between;
                    margin-top: 50px; 
                    padding-top: 20px;
                    border-top: 2px solid #000;
                    font-size: 10px; 
                    color: #666; 
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-brand">${getBranding('EVENT_NAME')}</div>
                <div class="header-title">${genderLabel} Mass Start</div>
                <div class="header-subtitle" style="color:#d9534f;">Unofficial Series Standings</div>
                <div class="header-date">${todayFormatted}</div>
                <div style="font-size:12px; color:#666; margin-top:5px; font-weight:bold;">* Best 3 of 4 Scores Count</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">Rank</th>
                        <th class="text-left">Athlete</th>
                        <th>Race 1</th>
                        <th>Race 2</th>
                        <th>Race 3</th>
                        <th>Race 4</th>
                        <th style="width: 60px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredStandings.map((s, i) => {
        const rank = i + 1;
        let badgeClass = 'rank-badge-common';
        let content = rank;

        if (rank === 1) { badgeClass = 'rank-badge rank-badge-1'; }
        else if (rank === 2) { badgeClass = 'rank-badge rank-badge-2'; }
        else if (rank === 3) { badgeClass = 'rank-badge rank-badge-3'; }
        else { badgeClass = 'rank-badge-common'; }

        const getCell = (rNum) => {
            const val = s.races[rNum];
            const isDropped = s.droppedRaces && s.droppedRaces.includes(rNum);

            if (!val && val !== 0) return `<td style="color:#ddd;">-</td>`;
            if (isDropped) return `<td style="color:#ccc; text-decoration: line-through; font-size:12px;">${val}</td>`;
            return `<td style="color:#333; font-weight:600;">${val}</td>`;
        };

        return `
                    <tr>
                        <td><div class="${badgeClass}">${content}</div></td>
                        <td class="name">${s.name}</td>
                        ${getCell(1)}
                        ${getCell(2)}
                        ${getCell(3)}
                        ${getCell(4)}
                        <td class="total">${s.total}</td>
                    </tr>`;
    }).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <div>* Lowest score dropped if 4 races completed</div>
                <div>${new Date().toLocaleDateString()} • <a href="https://www.saltygoldsupply.com" style="color:#666; text-decoration:none;">www.saltygoldsupply.com</a></div>
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

// Show Skaters to Watch modal - Instagram-style design
function showSkatersToWatch(gender, dist) {
    const data = SKATERS_TO_WATCH[gender]?.[dist];
    if (!data) {
        showToast('No data available for this distance');
        return;
    }

    const genderLabel = gender === 'women' ? "WOMEN'S" : "MEN'S";
    const distLabel = dist === 'mass_start' ? 'MASS START' : dist === 'team_pursuit' ? 'TEAM PURSUIT' : dist.toUpperCase();

    // Create modal with Instagram-style design
    const modal = document.createElement('div');
    modal.id = 'skaters-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.95); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Outfit', 'Segoe UI', sans-serif;
    `;

    if (data.note) {
        modal.innerHTML = `
            <div style="background: #000; border: 1px solid rgba(212,175,55,0.3); border-radius: 8px; max-width: 500px; width: 90%; padding: 40px; text-align: center;">
                <h2 style="color: #D4AF37; margin-bottom: 15px;">${genderLabel} ${distLabel}</h2>
                <p style="color: #888; margin-bottom: 20px;">${data.note}</p>
                <button onclick="document.getElementById('skaters-modal').remove()" class="btn btn-primary">Close</button>
            </div>
        `;
    } else {
        modal.innerHTML = `
            <div style="background: radial-gradient(circle at 50% 0%, #1a1a1a, #000000 90%); max-width: 520px; width: 95%; box-shadow: 0 0 80px rgba(0,0,0,1); padding: 26px 32px;">
                
                <!-- Header with branding -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                    <div style="display: flex;">
                        <!-- Gold vertical accent line with glow -->
                        <div style="width: 3px; background: #C9A227; margin-right: 14px; margin-top: 4px; align-self: stretch; box-shadow: 0 0 10px rgba(201, 162, 39, 0.5);"></div>
                        <div>
                            <div style="font-size: 12px; letter-spacing: 5px; color: #C9A227; text-transform: uppercase; font-weight: 400; margin-bottom: 0; text-shadow: 0 0 8px rgba(201, 162, 39, 0.3);">2026 TRIALS</div>
                            <h1 style="font-size: 42px; margin: 0; text-transform: uppercase; font-weight: 900; line-height: 0.95; letter-spacing: -1px; text-shadow: 0 0 20px rgba(0,0,0,0.5);">
                                <span style="color: #fff;">${genderLabel}</span><br><span style="color: #C9A227; text-shadow: 0 0 15px rgba(201, 162, 39, 0.4);">${distLabel}</span>
                            </h1>
                        </div>
                    </div>
                    <div style="text-align: right; padding-top: 2px;">
                        <div style="font-size: 13px; font-weight: 800; letter-spacing: 1px; text-shadow: 0 0 8px rgba(201, 162, 39, 0.3);">
                            <span style="color: #fff;">SALTY</span> <span style="color: #C9A227;">GOLD</span>
                        </div>
                        <div style="font-size: 9px; font-weight: 600; color: #666; letter-spacing: 0.5px;">SUPPLY</div>
                        <button onclick="document.getElementById('skaters-modal').remove()" style="background: none; border: none; color: #444; font-size: 22px; cursor: pointer; line-height: 1; margin-top: 6px;">&times;</button>
                    </div>
                </div>
                
                <!-- Subtitle with fading gold line -->
                <div style="margin-top: 10px; position: relative;">
                    <div style="font-size: 14px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 3px; text-shadow: 0 0 8px rgba(255,255,255,0.1); margin-bottom: 8px;">
                        SKATERS TO WATCH <span style="color: #C9A227;">//</span> 2026 SEASON BESTS
                    </div>
                    <div style="height: 2px; background: linear-gradient(90deg, #C9A227, transparent); width: 100%; box-shadow: 0 0 8px rgba(201, 162, 39, 0.5);"></div>
                </div>

                <!-- Column Headers -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0 6px 0; color: #888; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 1.5px;">
                    <div><span style="margin-right: 26px;">RANK</span><span>ATHLETE</span></div>
                    <span>PERFORMANCE</span>
                </div>

                <!-- Athletes List -->
                <div style="display: flex; flex-direction: column;">
                    ${data.skaters.map((s, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 11px 0 ${i < 3 ? '11px 10px' : ''}; margin: 0 ${i < 3 ? '-10px' : '0'}; border-bottom: 1px solid rgba(255,255,255,0.04); ${i < 3 ? `background: linear-gradient(90deg, ${i === 0 ? 'rgba(201,162,39,0.2)' : 'rgba(201,162,39,0.1)'}, transparent); border-left: 3px solid #C9A227;` : ''}">
                            <div style="display: flex; align-items: center;">
                                <span style="width: 36px; font-size: 18px; font-weight: 900; color: #C9A227; font-style: italic; text-shadow: 0 0 10px rgba(201, 162, 39, 0.4);">${s.rank}</span>
                                <span style="font-size: 15px; font-weight: 800; text-transform: uppercase; color: #fff; letter-spacing: 0; text-shadow: 0 0 8px rgba(0,0,0,0.5);">${s.name}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                ${s.notes ? `<span style="background: #C9A227; color: #000; font-size: 8px; padding: 3px 6px; border-radius: 3px; font-weight: 900; box-shadow: 0 0 8px rgba(201,162,39,0.4); border: 1px solid #ffe680;">${s.notes}</span>` : ''}
                                <span style="font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; color: #fff; letter-spacing: 0.5px; text-shadow: 0 0 4px rgba(255,255,255,0.2);">${s.time}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Footer -->
                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 15px; font-weight: 900; letter-spacing: 0; text-shadow: 0 0 8px rgba(255,255,255,0.1);">
                        <span style="color: #fff;">@SALTY</span><span style="color: #C9A227; text-shadow: 0 0 10px rgba(201, 162, 39, 0.4);">GOLD</span><span style="color: #fff;">SUPPLY</span>
                    </div>
                    <button onclick="document.getElementById('skaters-modal').remove()" style="background: #333; border: none; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; padding: 10px 20px; border-radius: 6px;">✕ CLOSE</button>
                </div>

                <!-- Download Button -->
                <div style="margin-top: 12px; text-align: center;">
                    <button onclick="downloadSkatersImage('${gender}', '${dist}')" class="btn" style="background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #8a3ab9); color:white; border:none; font-size: 12px; padding: 8px 20px; border-radius: 5px; font-weight: 700; cursor: pointer;">
                        📸 CREATE INSTA POST
                    </button>
                </div>
            </div>
        `;
    }

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

function downloadSkatersImage(gender, dist) {
    const data = SKATERS_TO_WATCH[gender]?.[dist];
    if (!data || data.note) return;

    const genderLabel = gender === 'women' ? "WOMEN'S" : "MEN'S";
    const distLabel = dist === 'team_pursuit' ? 'TEAM PURSUIT' : dist.toUpperCase();

    // Create Instagram-sized container (1080x1350 - 4:5 ratio)
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed; top: 0; left: -9999px;
        width: 1080px; height: 1350px;
        background: #000;
        color: white; font-family: 'Outfit', 'Segoe UI', sans-serif;
        padding: 0; box-sizing: border-box;
        z-index: -9999; display: flex; flex-direction: column;
    `;

    exportContainer.innerHTML = `
        <div style="padding: 30px 50px 25px 50px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-sizing: border-box; background: radial-gradient(circle at 50% 0%, #1a1a1a, #000000 80%);">
            
            <!-- Header -->
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex;">
                        <!-- Gold vertical accent line with glow -->
                        <div style="width: 5px; background: #C9A227; margin-right: 25px; margin-top: 5px; align-self: stretch; box-shadow: 0 0 15px rgba(201, 162, 39, 0.5);"></div>
                        <div>
                            <div style="font-size: 18px; letter-spacing: 5px; color: #C9A227; text-transform: uppercase; font-weight: 400; margin-bottom: 0; text-shadow: 0 0 10px rgba(201, 162, 39, 0.3);">2026 TRIALS</div>
                            <h1 style="font-size: 90px; margin: 0; text-transform: uppercase; font-weight: 900; line-height: 0.92; letter-spacing: -2px; text-shadow: 0 0 30px rgba(0,0,0,0.5);">
                                <span style="color: #fff;">${genderLabel}</span><br><span style="color: #C9A227; text-shadow: 0 0 20px rgba(201, 162, 39, 0.4);">${distLabel}</span>
                            </h1>
                        </div>
                    </div>
                    <div style="text-align: right; padding-top: 5px;">
                        <div style="font-size: 20px; font-weight: 800; letter-spacing: 2px; text-shadow: 0 0 10px rgba(201, 162, 39, 0.3);">
                            <span style="color: #fff;">SALTY</span> <span style="color: #C9A227;">GOLD</span>
                        </div>
                        <div style="font-size: 13px; font-weight: 600; color: #666; letter-spacing: 1px;">SUPPLY</div>
                    </div>
                </div>
                
                <!-- Subtitle with fading gold line -->
                <div style="margin-top: 15px; position: relative;">
                    <div style="font-size: 24px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 4px; text-shadow: 0 0 10px rgba(255,255,255,0.1); margin-bottom: 10px;">
                        SKATERS TO WATCH <span style="color: #C9A227;">//</span> 2026 SEASON BESTS
                    </div>
                    <div style="height: 2px; background: linear-gradient(90deg, #C9A227, transparent); width: 100%; box-shadow: 0 0 10px rgba(201, 162, 39, 0.5);"></div>
                </div>

                <!-- Column Headers -->
                <div style="display: flex; justify-content: space-between; padding: 15px 0 10px 0; color: #888; font-size: 15px; text-transform: uppercase; font-weight: 600; letter-spacing: 2px; margin-top: 10px;">
                    <div><span style="margin-right: 30px;">RANK</span><span>ATHLETE</span></div>
                    <span>PERFORMANCE</span>
                </div>

                <!-- Athletes List -->
                <div style="display: flex; flex-direction: column;">
                    ${data.skaters.slice(0, 10).map((s, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px ${i < 3 ? '15px' : '0'}; margin: 0 ${i < 3 ? '-15px' : '0'}; border-bottom: 1px solid rgba(255,255,255,0.06); ${i < 3 ? `background: linear-gradient(90deg, ${i === 0 ? 'rgba(201,162,39,0.2)' : 'rgba(201,162,39,0.1)'}, transparent); border-left: 4px solid #C9A227;` : ''}">
                            <div style="display: flex; align-items: center;">
                                <span style="width: 70px; font-size: 36px; font-weight: 900; color: #C9A227; font-style: italic; text-shadow: 0 0 20px rgba(201, 162, 39, 0.6);">${s.rank}</span>
                                <span style="font-size: 32px; font-weight: 800; text-transform: uppercase; color: #fff; letter-spacing: 0; text-shadow: 0 0 10px rgba(0,0,0,0.5);">${s.name}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 14px;">
                                ${s.notes ? `<span style="background: #C9A227; color: #000; font-size: 15px; padding: 6px 10px; border-radius: 4px; font-weight: 900; box-shadow: 0 0 15px rgba(201,162,39,0.6); border: 1px solid #ffe680;">${s.notes}</span>` : ''}
                                <span style="font-size: 38px; font-weight: 700; font-family: 'Courier New', monospace; color: #fff; letter-spacing: 2px; text-shadow: 0 0 10px rgba(255,255,255,0.3);">${s.time}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!--Footer -->
        <div style="padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 26px; font-weight: 900; letter-spacing: 0; text-shadow: 0 0 10px rgba(255,255,255,0.1);">
                <span style="color: #fff;">@SALTY</span><span style="color: #C9A227; text-shadow: 0 0 15px rgba(201, 162, 39, 0.4);">GOLD</span><span style="color: #fff;">SUPPLY</span>
            </div>
            <div style="font-size: 15px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">SALTYGOLDSUPPLY.COM</div>
        </div>
        </div >
        `;

    document.body.appendChild(exportContainer);
    showToast('Generating high-res graphic... 🎨');

    html2canvas(exportContainer, {
        scale: 1,
        useCORS: true,
        backgroundColor: '#000',
        logging: false
    }).then(canvas => {
        document.body.removeChild(exportContainer);

        canvas.toBlob(blob => {
            const fileName = `SaltyGold_${genderLabel}_${distLabel.replace(/\s+/g, '')}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'Skaters to Watch',
                    text: `Check out the Season Bests for the 2026 Olympic Trials! 🇺🇸⛸️ #OlympicTrials2026`
                })
                    .then(() => showToast('Shared successfully! 🚀'))
                    .catch((error) => {
                        console.log('Error sharing:', error);
                        saveAsFile(blob, fileName);
                    });
            } else {
                saveAsFile(blob, fileName);
            }
        }, 'image/png');
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
        return `< span > ${label}</span > `;
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
                    text: `Officially Qualified! ${getBranding('HASHTAG')} `
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
    border - radius: 8px;
    margin - top: 10px;
    box - shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    backdrop - filter: blur(5px);
    font - weight: 500;
    transform: translateX(100 %);
    transition: transform 0.3s cubic - bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    align - items: center;
    gap: 10px;
    `;
    toast.innerHTML = `< span > ${message}</span > `;

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

// =============================================================================
// ADMIN MODE
// =============================================================================
function checkAdminStatus() {
    const isAdmin = localStorage.getItem('salty_admin_access') === 'true';
    appState.isAdmin = isAdmin;
    const adminElements = document.querySelectorAll('.admin-only');

    adminElements.forEach(el => {
        if (isAdmin) {
            if (el.classList.contains('nav-tab')) el.style.display = 'inline-block';
            else el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });

    const loginBtn = document.getElementById('admin-login-btn');
    if (loginBtn) {
        loginBtn.innerHTML = isAdmin ? '🔓 Admin Active' : '🔒 Admin';
        loginBtn.style.color = isAdmin ? '#4CAF50' : '#666';
        if (isAdmin) loginBtn.title = "Click to Logout";
    }
}

function toggleAdminMode() {
    const isAdmin = localStorage.getItem('salty_admin_access') === 'true';

    if (isAdmin) {
        if (confirm('Log out of Admin Mode?')) {
            localStorage.removeItem('salty_admin_access');
            location.reload();
        }
    } else {
        const password = prompt("Enter Admin Password:");
        if (password === 'gold2026') {
            localStorage.setItem('salty_admin_access', 'true');
            showToast('Admin Mode Unlocked! 🔓');
            checkAdminStatus();
            setTimeout(() => location.reload(), 500);
        } else if (password) {
            alert('Incorrect Password');
        }
    }
}
