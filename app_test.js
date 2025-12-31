
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
    viewDistance: 'mass_start',
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
        case 'events': main.innerHTML = renderEventEntry(); break;
        case 'help': main.innerHTML = renderRules(); break;
        case 'results': main.innerHTML = renderMassStartStandings(); break;
    }

    // Post-render hooks
    if (appState.currentTab === 'events') {
        renderMsEntryForm(appState.selectedMsRace);
    }
}


function renderDashboard() {
    // Get quick stats
    const menStats = calculateReduction('men');
    const womenStats = calculateReduction('women');

    // Calculate filled spots - ONLY count actual athletes, not placeholders
    const isRealAthlete = (name) => name !== 'Available' && name !== 'TP Specialist' && !name.startsWith('Team Pursuit Slot');
    const menRealAthletes = menStats.roster.filter(a => isRealAthlete(a.name));
    const womenRealAthletes = womenStats.roster.filter(a => isRealAthlete(a.name));

    const menCount = Math.min(menRealAthletes.length, menStats.teamCap);
    const womenCount = Math.min(womenRealAthletes.length, womenStats.teamCap);

    const totalCount = menCount + womenCount;
    const maxViz = 18; // We show up to 18 to visualize overflow past the 14-spot cap
    const cutPercentage = (14 / maxViz) * 100;

    return `
        <div class="section-header">
            <h2 style="display: flex; align-items: center; gap: 10px;">ðŸ“– Qualification Guide 2026</h2>
        </div>

        <!-- NEW HIGH-FIDELITY QUALIFICATION GUIDE -->
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
                    <p style="font-weight: 800; color: #fff; font-size: 0.9rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Earn a Quota Spot</p>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">The Team has a limited number of "tickets" (quotas) for each distance. Often, only the top 2 or 3 finishers get to go.</p>
                </div>
                <div class="card" style="background: rgba(255,255,255,0.03); margin-bottom: 0; padding: 1.25rem; border: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="color: var(--accent-gold); font-size: 1.6rem; margin-bottom: 15px; font-weight: 900;">3. Survive</h3>
                    <p style="font-weight: 800; color: #fff; font-size: 0.9rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Avoid the "Cut"</p>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">The Team is capped at <b>8 Men and 6 Women</b>. If more people qualify, the skaters with the lowest "SOQC Rankings" get cut.</p>
                </div>
            </div>

            <div style="background: rgba(212, 175, 55, 0.08); border: 1px solid rgba(212, 175, 55, 0.2); padding: 12px 18px; border-radius: 6px; display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 1.4rem; filter: sepia(1) saturate(5) hue-rotate(-10deg);">ðŸ¦…</span>
                <div>
                    <b style="color: var(--accent-gold); font-size: 0.85rem; display: block; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Team Size Limit</b>
                    <p style="font-size: 0.8rem; color: #fff; margin: 0; opacity: 0.9;">Based on Fall World Cup results, The Team is restricted to <b>8 Men and 6 Women</b> for the 2026 Games.</p>
                </div>
            </div>
        </div>

        <div class="stats-grid" style="margin-bottom: 1.5rem;">
             <div class="stat-card">
                <div class="stat-icon">ðŸŸ¦</div>
                <div class="stat-info">
                    <span class="stat-value">${menCount} / ${menStats.teamCap}</span>
                    <span class="stat-label">Men's Spots</span>
                </div>
            </div>
             <div class="stat-card">
                <div class="stat-icon">ðŸŸ¥</div>
                <div class="stat-info">
                    <span class="stat-value">${womenCount} / ${womenStats.teamCap}</span>
                    <span class="stat-label">Women's Spots</span>
                </div>
            </div>
             <div class="stat-card">
                <div class="stat-icon">ðŸ‘¥</div>
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
                        ${totalCount > 14 ? `<div style="position: absolute; bottom: -16px; left: 0; font-size: 8px; color: var(--error); font-weight: 900; white-space: nowrap; letter-spacing: 1px;">REDUCTION AREA â†’</div>` : ''}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">
                    <span style="color: ${totalCount > 14 ? 'var(--error)' : 'var(--accent-gold)'}">
                        ${totalCount > 14 ? 'âš ï¸ REDUCTION ACTIVE' : totalCount === 14 ? 'âœ… ROSTER FULL' : 'âœ“ OPEN SPOTS REMAINING'}
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
    document.querySelector(`[data - tab= "${tab}"]`).classList.add('active');
    renderCurrentTab();
}


// =============================================================================
// OLYMPIC TEAM TRACKER (WITH REDUCTION LOGIC)
// =============================================================================
function renderOlympicTeamTracker() {
    try {
        const gender = appState.viewGender;
        const { roster: fullRoster, teamCap } = calculateReduction(gender);

        const isRealAthlete = (name) => !name.startsWith('Available');
        const roster = fullRoster.filter(a => isRealAthlete(a.name));

        const qualifiedCount = roster.length;
        const cutCount = Math.max(0, qualifiedCount - teamCap);
        const onTeamCount = Math.min(qualifiedCount, teamCap);

        let statusMessage = "";
        let statusClass = "";
        if (cutCount > 0) {
            statusMessage = `âš ï¸ <strong>Reduction Active:</strong> ${cutCount} ${gender === 'women' ? 'Women' : 'Men'} must be cut to meet the ${teamCap}-person cap.`;
            statusClass = "alert-error";
        } else if (qualifiedCount === teamCap) {
            statusMessage = `âœ… <strong>Team Full:</strong> ${gender === 'women' ? "Women's" : "Men's"} Roster is at exactly ${teamCap} athletes.`;
            statusClass = "alert-success";
        } else {
            statusMessage = `â„¹ï¸ <strong>Open Spots:</strong> ${teamCap - qualifiedCount} ${gender === 'women' ? "Women's" : "Men's"} roster spots remaining before reduction is needed.`;
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
                    <h3>Predicted ${gender === 'women' ? 'Women' : 'Men'}'s Roster</h3>
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

            // LOGIC: If they are priority 1-10, they are practically guaranteed.
            // If we are under 14 total, everyone is safe.
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
                statusBadge = '<span class="status-note note-out">âŒ X Outside Cap</span>';
            } else if (isActuallyAtRisk) {
                rowClass = "row-vulnerable";
                statusBadge = '<span class="status-note note-vulnerable">âš ï¸ On the Bubble</span>';
            } else {
                rowClass = "row-protected";
                statusBadge = isProtected ? '<span class="status-note note-protected">ðŸŒŸ Qualified</span>' : '<span class="status-note note-protected">âœ… In (Provisional)</span>';
            }

            return `
                                <tr class="${rowClass}">
                                    <td>${idx + 1}</td>
                                    <td>
                                        <strong>${t.name}</strong>
                                        ${statusBadge}
                                    </td>
                                    <td>
                                        <div style="display:flex; flex-wrap:wrap; gap:4px;">
                                            ${t.events.map(e => `<span class="badge ${e === 'TpSpec' ? 'bg-info' : 'bg-secondary'}">${e === 'TpSpec' ? 'Team Pursuit' : e}</span>`).join('')}
                                        </div>
                                    </td>
                                    <td>
                                        <div style="font-weight:bold;">${displayRank}</div>
                                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">SOQC Category</div>
                                    </td>
                                    <td>
                                        ${isOverCap ? '<span class="text-error" style="font-weight:800;">CUT</span>' : (isProtected ? '<span class="text-success" style="font-weight:800;">QUALIFIED</span>' : '<span class="text-warning" style="font-weight:800;">PROVISIONAL</span>')}
                                    </td>
                                </tr>
                            `;
        }).join('')
            }
                    </tbody >
                </table >
                </div>
            </div>

                <div class="card">
                    <h3>Distance Breakdown & Quota Tracking</h3>
                    ${renderDistanceBreakdown(gender)}
                </div>
    `;
    } catch (e) {
        console.error("Render Error:", e);
        return `<div class="card alert-error" ><h3>Error Loading Tracker</h3><p>${e.message}</p></div> `;
    }
}

function calculateReduction(gender) {
    const rosterMap = {};
    const teamCap = OLYMPIC_CONFIG.TEAM_CAP[gender];

    Object.keys(OLYMPIC_CONFIG[gender]).forEach(dist => {
        const config = OLYMPIC_CONFIG[gender][dist];
        let qualifiers = [];

        config.preNominated.forEach(name => {
            let protection = 0;
            if (dist === '10000m' && name === 'Casey Dawson') protection = 4;
            qualifiers.push({ name, ranking: protection, type: 'Direct' });
        });

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
            const specialists = appState.events[gender]['team_pursuit']?.results || [];
            const conversion = OLYMPIC_CONFIG.TP_CONVERSION[gender]; // Protected Rank

            // ONLY add TP athletes if they have been officially named (entered in Race Entry)
            specialists.forEach((s, i) => {
                const ranking = (i < 2) ? conversion : 99; // Only first 2 protected
                qualifiers.push({ name: s.name, ranking: ranking, type: 'TpSpec' });
            });
            // NO Placeholders in the official roster calculation - per user request
        } else {
            trialsResults = (appState.events[gender][dist].results || []).sort((a, b) => a.rank - b.rank);
        }

        const trialsQualifiers = trialsResults.filter(r => !config.preNominated.includes(r.name));
        let slotIndex = config.preNominated.length;

        trialsQualifiers.forEach(q => {
            if (slotIndex < config.quota) {
                const soqc = config.soqcRanks[slotIndex] || 99;
                qualifiers.push({ name: q.name, ranking: soqc, type: 'Trials' });
                slotIndex++;
            }
        });

        qualifiers.forEach(q => {
            if (!rosterMap[q.name]) {
                const isSpecialCasey = (q.name === 'Casey Dawson');
                rosterMap[q.name] = { name: q.name, events: [], reductionRank: isSpecialCasey ? 4 : 999 };
            }
            const p = rosterMap[q.name];
            p.events.push(q.type === 'TpSpec' ? 'TpSpec' : dist);
            if (q.ranking === 0 || (config.preNominated.includes(q.name) && q.name !== 'Casey Dawson')) {
                p.reductionRank = 0;
            } else if (q.ranking < p.reductionRank) {
                p.reductionRank = q.ranking;
            }
        });
    });

    const sortedRoster = Object.values(rosterMap).sort((a, b) => a.reductionRank - b.reductionRank);
    return { roster: sortedRoster, teamCap };
}

function renderDistanceBreakdown(gender) {
    return `
        <div class="breakdown-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;">
            ${Object.keys(OLYMPIC_CONFIG[gender]).map(dist => {
        const config = OLYMPIC_CONFIG[gender][dist];
        let qualifiers = [];
        config.preNominated.forEach(n => qualifiers.push({ name: n, type: 'Direct' }));

        if (dist === 'team_pursuit') {
            const specialists = appState.events[gender]['team_pursuit']?.results || [];
            specialists.forEach((r, i) => {
                qualifiers.push({ name: r.name, type: (i < 2) ? 'Protected' : 'Trials' });
            });
        } else {
            let trialsResults = [];
            if (dist === 'mass_start') {
                const race4 = appState.msRaces[gender]?.[4];
                if (race4 && race4.finishOrder && race4.finishOrder.length > 0) {
                    trialsResults = calculateMassStartStandings(gender);
                }
            } else {
                trialsResults = (appState.events[gender][dist].results || []);
            }
            const realTrials = trialsResults.filter(r => !config.preNominated.includes(r.name));
            let spotsLeft = config.quota - config.preNominated.length;
            realTrials.forEach(r => {
                if (spotsLeft > 0) {
                    qualifiers.push({ name: r.name, type: 'Trials' });
                    spotsLeft--;
                }
            });
        }

        let displayList = [...qualifiers];
        while (displayList.length < config.quota) {
            const type = (dist === 'team_pursuit' && displayList.length < 2) ? 'Protected' :
                (dist === 'team_pursuit' ? 'HP Discretion' : 'O. Trials');
            const name = (dist === 'team_pursuit') ? 'TP Specialist' : 'Available';
            displayList.push({ name: name, type: type });
        }

        return `
                <div class="result-box" style="border:1px solid #444; padding:8px; border-radius:6px; background: rgba(255,255,255,0.02); font-size: 0.85rem;">
                     <h4 style="margin:0 0 8px 0; border-bottom:1px solid #333; padding-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="text-transform:uppercase; letter-spacing:1px; color:#D4AF37; font-size: 0.75rem;">${dist}</span>
                         <div style="display:flex; align-items:center; gap:6px;">
                            ${(SKATERS_TO_WATCH[gender]?.[dist] || dist === 'mass_start') ? `<span class="badge" onclick="showSkatersToWatch('${gender}', '${dist}')" style="cursor:pointer; background:rgba(59, 130, 246, 0.4); border:1px solid #3b82f6; padding: 1px 6px; font-size: 0.6rem;">ðŸ‘€</span>` : ''}
                            <span style="font-size:0.7rem; color:#888;">Q: ${config.quota}</span>
                        </div>
                    </h4>
                    <ul style="list-style:none; padding:0; margin:0;">
                         ${displayList.map(s => {
            let bgColor = '#28a745';
            if (s.type === 'Direct' || s.type === 'Protected') bgColor = '#dc3545';
            else if (s.type === 'HP Discretion') bgColor = '#6c757d';
            else if (s.name === 'Available') bgColor = '#007bff';
            return `
                                <li style="padding:4px 0; border-bottom:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-weight:500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;">${s.name}</span>
                                    <span class="badge" style="background:${bgColor}; color:#fff; font-size:0.6rem; padding: 1px 4px;">${s.type}</span>
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
        <div class="section-header" >
            <h2>â±ï¸ Race Entry</h2>
            ${renderEventSelectors()}
        </div>
        `;

    if (config && config.isMassStartPoints) {
        content += `
        <div class="card alert-info mb-2" >
                <h4>Mass Start Manager</h4>
                <p>Select a race and enter finish order and intermediate sprint points.</p>
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

        content += `
        <div class="card mt-2" >
                <h3>âœï¸ ${gender === 'women' ? "Women's" : "Men's"} ${dist}</h3>
                <p class="text-muted">${isTP ? "Type names of Team Pursuit Specialists." : "Type names in finishing order (1st, 2nd, etc)."}</p>
                
                <div class="form-group mb-1 p-2" style="background:rgba(255,255,255,0.05); border-radius:8px; border: 1px solid #333;">
                     <div style="display:flex; gap:10px; align-items:center;">
                        <span style="font-weight:bold; font-size:1.2em; width:30px; text-align:center; color:#D4AF37;">${results.length + 1}.</span>
                        <input type="text" id="athlete-input" class="form-control" placeholder="Athlete Name" style="flex:2">
                        ${!isTP ? `<input type="text" id="manual-time" class="form-control" placeholder="Time" style="flex:1">` : ''}
                        <button class="btn btn-primary" onclick="addEventResult()">Add</button>
                    </div>
                </div>

                <table class="data-table mt-1">
                    <thead><tr><th style="width:50px">Rank</th><th>Athlete</th>${!isTP ? '<th>Time</th>' : ''}<th>Action</th></tr></thead>
                    <tbody>
                        ${results.map((r, i) => `
                            <tr>
                                <td>${r.rank}</td>
                                <td><strong>${r.name}</strong></td>
                                ${!isTP ? `<td>${r.time || '-'}</td>` : ''}
                                <td><button class="btn btn-sm btn-outline-danger" onclick="removeEventResult(${i})">Remove</button></td>
                            </tr>
                        `).join('')}
                        ${results.length === 0 ? `<tr><td colspan="4" class="text-center text-muted" style="padding:20px;">No results entered yet.</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
    }
    return content;
}

function renderEventSelectors() {
    return `
        <div class="filter-bar" style = "margin-bottom:0;" >
            <div class="filter-group">
                <select class="form-control" onchange="appState.viewGender=this.value; renderCurrentTab()">
                    <option value="women" ${appState.viewGender === 'women' ? 'selected' : ''}>Women</option>
                    <option value="men" ${appState.viewGender === 'men' ? 'selected' : ''}>Men</option>
                </select>
            </div>
             <div class="filter-group">
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
    const timeInput = document.getElementById('manual-time');
    const time = timeInput ? timeInput.value : '';

    let athlete = appState.athletes.find(a => a.name.toLowerCase() === name.toLowerCase() && a.gender === appState.viewGender);
    if (!athlete) {
        athlete = { id: Date.now().toString(), name: name, nation: 'USA', gender: appState.viewGender };
        appState.athletes.push(athlete);
    }

    const currentResults = appState.events[appState.viewGender][appState.viewDistance].results || [];
    if (currentResults.some(r => r.name.toLowerCase() === name.toLowerCase())) {
        alert('Athlete already added.');
        return;
    }

    appState.events[appState.viewGender][appState.viewDistance].results.push({
        id: athlete.id, name: athlete.name, rank: currentResults.length + 1, time: time
    });

    saveToStorage();
    renderCurrentTab();
    nameInput.value = '';
    if (timeInput) timeInput.value = '';
    nameInput.focus();
}

function removeEventResult(index) {
    const results = appState.events[appState.viewGender][appState.viewDistance].results;
    results.splice(index, 1);
    results.forEach((r, idx) => r.rank = idx + 1);
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
        <div class="card p-2" >
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Entry Form: Race ${raceNum}</h3>
                <button class="btn btn-success" onclick="submitMsRace(${raceNum}, '${gender}', 16)">ðŸ’¾ Save Results</button>
            </div>
            
            <h4 class="mt-1">Intermediate Sprints</h4>
            ${sprintConfig.intermediateLaps.map((lap, idx) => `
                <div class="sprint-row" style="margin-bottom:5px;">
                    <span style="width:60px; display:inline-block;">Lap ${lap}</span>
                    <select id="int${idx + 1}_1st" class="form-control w-auto d-inline">${athleteOptions(athletes, '1st')}</select>
                    <select id="int${idx + 1}_2nd" class="form-control w-auto d-inline">${athleteOptions(athletes, '2nd')}</select>
                    <select id="int${idx + 1}_3rd" class="form-control w-auto d-inline">${athleteOptions(athletes, '3rd')}</select>
                </div>
            `).join('')
        }
            
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
            if (document.getElementById(`int${i + 1} _1st`)) document.getElementById(`int${i + 1} _1st`).value = int.first || '';
            if (document.getElementById(`int${i + 1} _2nd`)) document.getElementById(`int${i + 1} _2nd`).value = int.second || '';
            if (document.getElementById(`int${i + 1} _3rd`)) document.getElementById(`int${i + 1} _3rd`).value = int.third || '';
        });
    }
    if (raceData && raceData.finishOrder) {
        raceData.finishOrder.forEach(f => {
            if (document.getElementById(`status_${f.athleteId} `)) {
                document.getElementById(`status_${f.athleteId} `).value = f.status;
                const posEl = document.getElementById(`pos_${f.athleteId} `);
                if (posEl) posEl.value = f.position || '';
                document.getElementById(`time_${f.athleteId} `).value = f.time || '';
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
            first: document.getElementById(`int${i + 1} _1st`).value,
            second: document.getElementById(`int${i + 1} _2nd`).value,
            third: document.getElementById(`int${i + 1} _3rd`).value
        });
    }

    // 2. Finish
    const finishOrder = [];
    appState.athletes.filter(a => a.gender === gender).forEach(a => {
        const status = document.getElementById(`status_${a.id} `).value;
        const pos = document.getElementById(`pos_${a.id} `).value;
        const time = document.getElementById(`time_${a.id} `).value;

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
        athleteScores[a.id] = { id: a.id, name: a.name, races: {}, total: 0, droppedIndex: null };
    });

    const activeRaces = [1, 2, 3, 4].filter(num => {
        const r = appState.msRaces[gender][num];
        return r && r.results && Object.keys(r.results).length > 0;
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
        const scores = Object.entries(s.races).map(([num, pts]) => ({ num: parseInt(num), pts }));

        // If they have 4 results, we drop the lowest one
        if (scores.length === 4) {
            // Sort by points ascending to find the lowest
            const sortedByPts = [...scores].sort((a, b) => a.pts - b.pts);
            s.droppedIndex = sortedByPts[0].num;
            s.total = scores.filter(score => score.num !== s.droppedIndex).reduce((sum, v) => sum + v.pts, 0);
        } else {
            s.total = scores.reduce((sum, v) => sum + v.pts, 0);
        }
    });

    // Sort by total points descending
    return Object.values(athleteScores).sort((a, b) => b.total - a.total);
}

// =============================================================================
// ATHLETES
// =============================================================================


function athleteOptions(list, ph) {
    return `< option value = "" > ${ph}</option > ` +
        list.map(a => `< option value = "${a.id}" > ${a.name}</option > `).join('');
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
        <div style = "margin-top: 25px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px;" >
                <h5 style="color: #ef4444; margin-bottom: 15px; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.5em">âœ‚ï¸</span> 
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
        <div style = "display:flex; align-items:flex-end; justify-content:space-between; margin-top:30px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;" >
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
                    const text = `${name} âœ“`;
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
        <div class="section-header" >
            <h2>ðŸ“– Qualification Guide 2026</h2>
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
                <div style="font-size: 2em;">ðŸ¦…</div>
                <div>
                    <strong style="color: #D4AF37;">Team Size Limit</strong>
                    <p style="margin: 0; font-size: 0.9em;">Based on Fall World Cup results, ${getBranding('TEAM_NAME')} is restricted to <strong style="color:white;">8 Men</strong> and <strong style="color:white;">6 Women</strong> for the 2026 Games.</p>
                </div>
            </div>
        </div>

        <div class="card mt-2">
            <h3>ðŸ“Š Detailed Quota Breakdown</h3>
            <p class="text-muted">Below shows exactly how many spots exist for each distance and who is pre-nominated.</p>
            ${renderTable('women', config.women)}
            ${renderTable('men', config.men)}
        </div>

        <div class="card mt-2">
            <h3>ðŸ“œ Official Rules & Documentation</h3>
            <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                 <a href="https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/bltcd66ae352ae96e83/694b3ece1e351c40b71969db/LT_Regs_25-26_Final_v2.2.pdf" target="_blank" style="text-decoration:none;">
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
                        <span style="font-size: 1.5em;">ðŸ“„</span>
                        <div>
                            <strong style="display:block; color:#fff;">USS Rules 2025-26</strong>
                            <span style="font-size: 0.8em; color: #888;">Complete Regulations PDF</span>
                        </div>
                    </div>
                </a>
                <a href="https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/blt328a2be74a7640b7/69248cbe33936a0790e5d9ce/Athlete_Selection_Procedures_-_USS_Long_Track_-_Amendment_2_SIGNED.pdf" target="_blank" style="text-decoration:none;">
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; transition: background 0.2s;">
                        <span style="font-size: 1.5em;">âš–ï¸</span>
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
            <h3>ðŸŒ IOC & ISU Qualification Rules</h3>
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
                    <li style="margin-bottom: 8px;">ðŸ“Š <strong>SOQC Points:</strong> Ranking based on World Cup points scored.</li>
                    <li style="margin-bottom: 8px;">â±ï¸ <strong>SOQC Times:</strong> Ranking based on fastest times skate at World Cups.</li>
                </ul>

                <h4 style="color: #D4AF37; margin-top: 15px;">Athlete Eligibility</h4>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 8px;"><strong>Age:</strong> Born before July 1, 2010.</li>
                    <li style="margin-bottom: 8px;"><strong>Times:</strong> Must have skated the ${getBranding('QUALIFIER_NAME')} for their distance.</li>
                </ul>
            </div>
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
                <button onclick="shareMsStandingsPdf()" class="btn btn-sm" style="background: #333; color:white; border:1px solid #555; font-size: 0.9rem; padding: 6px 14px;">ðŸ“„ PDF</button>
            </div>
            <h2>ðŸ† Mass Start Series Standings</h2>
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
                                    ${isQualified ? '<span class="badge" style="background:#28a745; margin-left:8px; font-size:0.7em;">âœ… Pre-Qualified</span>' : ''}
                                </td>
                                <td class="text-center ${s.droppedIndex === 1 ? 'ms-score-dropped' : ''}">${s.races[1] || '<span class="text-muted">-</span>'}</td>
                                <td class="text-center ${s.droppedIndex === 2 ? 'ms-score-dropped' : ''}">${s.races[2] || '<span class="text-muted">-</span>'}</td>
                                <td class="text-center ${s.droppedIndex === 3 ? 'ms-score-dropped' : ''}">${s.races[3] || '<span class="text-muted">-</span>'}</td>
                                <td class="text-center ${s.droppedIndex === 4 ? 'ms-score-dropped' : ''}">${s.races[4] || '<span class="text-muted">-</span>'}</td>
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
    showToast('Generating high-res graphic... ðŸŽ¨');

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
                    title: 'Mass Start Standings ðŸ†',
                    text: `Latest ${genderLabel} Mass Start standings! #OlympicTrials2026`
                })
                    .then(() => showToast('Shared successfully! ðŸš€'))
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

// Helper to get skaters data (Static or Dynamic for Mass Start)
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
                notes: '',
                id: s.id || null
            }))
        };
    }
    return SKATERS_TO_WATCH[gender]?.[dist];
}

// Global to store pre-rendered blob for instant download
let currentWatchListBlob = null;
let currentWatchListFileName = "";

// Show Skaters to Watch modal
function showSkatersToWatch(gender, dist) {
    const data = getSkatersToWatchData(gender, dist);
    if (!data) {
        showToast('No data available for this distance');
        return;
    }

    currentWatchListBlob = null; // Clear old state
    const genderLabel = gender === 'women' ? "Women's" : "Men's";
    const distLabel = dist === 'mass_start' ? 'Mass Start' : dist === 'team_pursuit' ? 'Team Pursuit' : dist;

    // UI Label logic
    const listSubHeader = dist === 'mass_start' ? 'Current Standings' : '2026 Season Bests';
    const valueHeader = dist === 'mass_start' ? 'Points' : 'Time';

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'skaters-modal';
    modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.9); display: flex; align-items: center; justify-content: center;
    z-index: 10000; font-family: 'Outfit', sans-serif; padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: #000; border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; max-width: 550px; width: 100%; max-height: 98vh; overflow-y: auto; box-shadow: 0 0 60px rgba(0,0,0,1);">
            <div style="padding: 20px 30px; display: flex; flex-direction: column; gap: 0;">
                <!-- Close + Action Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <button id="insta-download-btn" onclick="downloadSkatersImage('${gender}', '${dist}')" class="btn btn-sm" style="background: #333; color:white; border:none; border-radius: 4px; font-weight: 800; font-size: 0.7rem; letter-spacing: 1px; padding: 6px 12px; cursor: pointer; transition: all 0.3s; opacity: 0.6;">â³ PREPARING GRAPHIC...</button>
                    <button onclick="document.getElementById('skaters-modal').remove()" style="background: none; border: none; color: #fff; font-size: 28px; cursor: pointer; line-height: 1;">&times;</button>
                </div>

                <!-- Branding Header -->
                <div style="border-left: 6px solid #D4AF37; padding-left: 15px; margin-bottom: 15px;">
                    <div style="font-size: 13px; letter-spacing: 6px; color: #888; text-transform: uppercase; font-weight: 500; margin-bottom: 2px;">${getBranding('SHORT_EVENT_NAME')}</div>
                    <h1 style="font-size: 38px; margin: 0; color: #fff; text-transform: uppercase; font-weight: 900; line-height: 0.85; letter-spacing: -1px;">
                        ${genderLabel}<br><span style="color: #D4AF37;">${distLabel}</span>
                    </h1>
                    <div style="margin-top: 10px; font-size: 14px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 3px;">
                        Skaters To Watch <span style="color: #D4AF37;">//</span> ${listSubHeader}
                    </div>
                </div>

                <!-- Table Header -->
                <div style="display: grid; grid-template-columns: 40px 1fr 140px; border-bottom: 2px solid #D4AF37; padding-bottom: 6px; margin-bottom: 8px; color: #555; font-size: 11px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">
                    <span>#</span>
                    <span>Athlete</span>
                    <span style="text-align: right;">${valueHeader}</span>
                </div>

                <!-- Rows -->
                <div style="display: flex; flex-direction: column;">
                    ${data.skaters.map((s, i) => `
                        <div style="display: grid; grid-template-columns: 40px 1fr 140px; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                            <span style="font-size: 16px; font-weight: 900; color: ${i < 3 ? '#D4AF37' : '#666'}; font-style: italic;">${s.rank}</span>
                            <div style="display: flex; flex-direction: column;">
                                ${s.id ? `
                                    <a href="https://speedskatingresults.com/index.php?p=17&s=${s.id}" target="_blank" style="color: #fff; text-decoration: none; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; transition: color 0.2s;">
                                        ${s.name} <span style="font-size: 9px; color: #D4AF37; font-weight: normal; vertical-align: middle;">â†—</span>
                                    </a>
                                ` : `<span style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #fff;">${s.name}</span>`}
                            </div>
                            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
                                ${s.notes ? `<span style="background: #D4AF37; color: #000; font-size: 9px; font-weight: 900; padding: 1px 4px; border-radius: 1px; text-transform: uppercase; letter-spacing: 0.5px;">${s.notes}</span>` : ''}
                                <span style="font-size: 18px; font-weight: 900; font-family: monospace; color: #fff; letter-spacing: 0.5px;">${s.time}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Footer Branding -->
                <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid rgba(212, 175, 55, 0.2); display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 14px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase;">
                        <span style="color: #fff;">@SALTY</span><span style="color: #D4AF37;">GOLD</span><span style="color: #fff;">SUPPLY</span>
                    </div>
                    <div style="font-size: 10px; color: #888; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                        SALTYGOLDSUPPLY.COM
                    </div>
                </div>
            </div>
        </div>
        `;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);

    // Kick off background render immediately so it's ready when they click
    preRenderSkatersImage(gender, dist);
}

// Internal helper to render the image in the background
function preRenderSkatersImage(gender, dist) {
    const data = getSkatersToWatchData(gender, dist);
    if (!data || data.note) return;

    const genderLabel = gender === 'women' ? "WOMEN'S" : "MEN'S";
    const distLabel = dist === 'mass_start' ? 'MASS START' : dist === 'team_pursuit' ? 'TEAM PURSUIT' : dist.toUpperCase();

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
            <!-- Header Section -->
            <div style="border-left: 10px solid #D4AF37; padding-left: 30px; margin-bottom: 25px; position: relative;">
                <div style="font-size: 24px; letter-spacing: 12px; color: #888; text-transform: uppercase; font-weight: 500; margin-bottom: 5px;">
                    ${getBranding('SHORT_EVENT_NAME')}
                </div>
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
                        <div style="display: flex; flex-direction: column;"><span style="font-size: 34px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${s.name}</span></div>
                        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 15px;">
                            ${s.notes ? `<span style="background: #D4AF37; color: #000; font-size: 16px; font-weight: 900; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; letter-spacing: 1px;">${s.notes}</span>` : ''}
                            <span style="font-size: 42px; font-weight: 900; font-family: monospace; color: #fff; letter-spacing: 1px;">${s.time}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid rgba(212, 175, 55, 0.3); display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 36px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; line-height: 1;"><span style="color: #fff;">@SALTY</span><span style="color: #D4AF37;">GOLD</span><span style="color: #fff;">SUPPLY</span></div>
                <div style="text-align: right;"><div style="font-size: 20px; color: #888; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">SALTYGOLDSUPPLY.COM</div></div>
            </div>
        </div>
        `;

    document.body.appendChild(exportContainer);

    // Give it a moment to stabilize then capture
    setTimeout(() => {
        html2canvas(exportContainer, {
            scale: 1, useCORS: true, backgroundColor: '#000', logging: false
        }).then(canvas => {
            document.body.removeChild(exportContainer);
            canvas.toBlob(blob => {
                currentWatchListBlob = blob;
                currentWatchListFileName = `SaltyGold_${dist} _WatchList.png`;

                // Update button UI if modal is still open
                const btn = document.getElementById('insta-download-btn');
                if (btn) {
                    btn.style.background = 'linear-gradient(45deg, #f09433, #dc2743, #bc1888, #8a3ab9)';
                    btn.style.opacity = '1';
                    btn.innerText = 'ðŸ“¸ CREATE INSTA POST';
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
        showToast('Still crafting your graphic... Please wait 1 second! âœ¨');
        return;
    }

    const fileName = currentWatchListFileName;
    const blob = currentWatchListBlob;
    const file = new File([blob], fileName, { type: 'image/png' });
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
            files: [file],
            title: `Salty Gold Watch List`,
            text: `The road to 2026 starts here.#SaltyGold #Speedskating`
        })
            .then(() => showToast('Shared successfully! ðŸš€'))
            .catch(() => saveAsFile(blob, fileName));
    } else {
        saveAsFile(blob, fileName);
        showToast('Elite Graphic Saved! ðŸ“¸');
    }
}

function saveAsFile(blob, fileName) {
    // Highly resilient approach for all users
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Hidden execution
    link.style.display = 'none';
    document.body.appendChild(link);

    try {
        // Direct click
        link.click();
    } catch (e) {
        // Fallback bridge for strictly secured browsers
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            const fallbackLink = document.createElement('a');
            fallbackLink.href = dataUrl;
            fallbackLink.download = fileName;
            document.body.appendChild(fallbackLink);
            fallbackLink.click();
            setTimeout(() => document.body.removeChild(fallbackLink), 1000);
        };
        reader.readAsDataURL(blob);
    }

    // Broad cleanup window
    setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 5000);
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
            document.getElementById('admin-login-btn').innerText = "ðŸ”“ Admin Active";
            alert("Admin Mode Unlocked");
        } else {
            alert("Incorrect Password");
        }
    } else {
        appState.isAdmin = false;
        document.body.classList.remove('admin-mode');
        document.getElementById('admin-login-btn').innerText = "ðŸ”’ Admin";
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
    btn.innerText = 'Creating Graphic...';

    // Small delay to ensure any layout changes or font loads are ready
    setTimeout(() => {
        html2canvas(element, {
            scale: 4,
            backgroundColor: "#000000",
            useCORS: true,
            logging: false
        }).then(canvas => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    showToast('âŒ Generation failed');
                    btn.innerText = 'Error';
                    return;
                }

                const athleteName = document.getElementById('share-athlete-name').innerText.trim() || 'Athlete';
                const filename = `Qualified_USA_${athleteName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                const file = new File([blob], filename, { type: 'image/png' });
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: `Team USA Qualifier ðŸ‡ºðŸ‡¸`,
                        text: `${athleteName} is officially on the team! #SaltyGold`
                    })
                        .then(() => {
                            btn.innerText = 'Shared! ðŸš€';
                            setTimeout(() => btn.innerText = originalText, 2000);
                        })
                        .catch(() => {
                            saveAsFile(blob, filename);
                            btn.innerText = originalText;
                        });
                } else {
                    saveAsFile(blob, filename);
                    btn.innerText = originalText;
                    showToast('Graphic Saved! ðŸ¥‡');
                }
            }, 'image/png');
        }).catch(err => {
            console.error("Capture Error:", err);
            showToast('Error generating image');
            btn.innerText = 'Error';
        });
    }, 300);
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
            "âš ï¸ You are sharing from Localhost.\n\n" +
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
            showToast('Link copied to clipboard! ðŸ“‹');
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


