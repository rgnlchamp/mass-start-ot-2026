// Mass Start Olympic Trials Scoring System
// U.S. Speedskating 2026 Olympic Winter Games

// =============================================================================
// DATA STORAGE
// =============================================================================
let appState = {
    athletes: [],
    races: { women: { 1: null, 2: null, 3: null, 4: null }, men: { 1: null, 2: null, 3: null, 4: null } },
    currentTab: 'dashboard',
    selectedRace: 1,
    resultsGender: 'women'
};

const INTERMEDIATE_POINTS = [3, 2, 1];
const FINAL_SPRINT_POINTS = [60, 40, 20, 10, 6, 3];

// ACRS Points Table (place 1-40)
const ACRS_POINTS = [
    60, 54, 48, 43, 40, 38, 36, 34, 32, 31,
    30, 29, 28, 27, 26, 25, 24, 23, 22, 21,
    20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
    10, 9, 8, 7, 6, 5, 4, 3, 2, 1
];

// Sprint Points
const SPRINT_POINTS = {
    16: {
        intermediate: [3, 2, 1],
        final: [60, 40, 20, 10, 6, 3],
        intermediateLaps: [4, 8, 12]
    },
    10: {
        intermediate: [3, 2, 1],
        final: [30, 20, 10, 4, 2, 1],
        intermediateLaps: [4, 7]
    }
};

// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    setupNavigation();
    renderCurrentTab();
});

function loadFromStorage() {
    try {
        const saved = localStorage.getItem('massStartData_v2');
        if (saved) {
            const data = JSON.parse(saved);
            appState.athletes = data.athletes || [];
            appState.races = data.races || appState.races;
        } else if (typeof PRELOADED_DATA !== 'undefined') {
            // Load preloaded data if no local storage exists
            appState.athletes = PRELOADED_DATA.athletes;
            appState.races = PRELOADED_DATA.races;

            // Calculate results for preloaded data
            ['women', 'men'].forEach(gender => {
                [1, 2, 3, 4].forEach(raceNum => {
                    const race = appState.races[gender][raceNum];
                    if (race && !race.results) {
                        const sprintConfig = SPRINT_POINTS[race.format];
                        race.results = calculateRacePoints(race.finishOrder, race.intermediates, sprintConfig);
                    }
                });
            });

            saveToStorage(); // Save it immediately
            console.log('Loaded and calculated preloaded data');
        }
    } catch (e) { console.error('Error loading data:', e); }
}

function saveToStorage() {
    localStorage.setItem('massStartData_v2', JSON.stringify({
        athletes: appState.athletes,
        races: appState.races
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

function switchToTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tabName) t.classList.add('active');
    });
    appState.currentTab = tabName;
    renderCurrentTab();
}

// =============================================================================
// RENDERING
// =============================================================================
function renderCurrentTab() {
    const main = document.getElementById('main-content');
    document.body.dataset.tab = appState.currentTab; // Set data-tab for CSS scoping
    switch (appState.currentTab) {
        case 'dashboard': main.innerHTML = renderDashboard(); break;
        case 'athletes': main.innerHTML = renderAthletes(); break;
        case 'races': main.innerHTML = renderRaceEntry(); break;
        case 'results': main.innerHTML = renderResults(); break;
        case 'olympic': main.innerHTML = renderOlympicSelection(); break;
        case 'help': main.innerHTML = renderUserManual(); break;
    }
    attachEventListeners();
}

function renderDashboard() {
    const women = appState.athletes.filter(a => a.gender === 'women').length;
    const men = appState.athletes.filter(a => a.gender === 'men').length;
    const completedRaces = countCompletedRaces();

    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">👤</div>
                <div class="stat-info">
                    <span class="stat-value">${appState.athletes.length}</span>
                    <span class="stat-label">Total Athletes</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🏁</div>
                <div class="stat-info">
                    <span class="stat-value">${completedRaces}</span>
                    <span class="stat-label">Races Completed</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👩</div>
                <div class="stat-info">
                    <span class="stat-value">${women}</span>
                    <span class="stat-label">Women Athletes</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👨</div>
                <div class="stat-info">
                    <span class="stat-value">${men}</span>
                    <span class="stat-label">Men Athletes</span>
                </div>
            </div>
        </div>
        
        <div class="card info-card">
            <h3>🏆 Selection Criteria</h3>
            <ul style="margin-top:0.5rem">
                <li>Rankings based on <strong>Best 3 of 4</strong> Race Points.</li>
                <li><strong>Tiebreaker:</strong> Highest finish at Mass Start #4.</li>
            </ul>
        </div>
        
        <div class="card mt-1">
            <h3>⚡ Quick Actions</h3>
            <div class="action-row mt-1">
                <button class="btn btn-primary" onclick="switchToTab('athletes')">➕ Add Athletes</button>
                <button class="btn btn-primary" onclick="switchToTab('races')">🏁 Enter Race Results</button>
                <button class="btn btn-secondary" onclick="exportData()">📥 Export Data</button>
                <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">📤 Import Data</button>
                <input type="file" id="importFile" accept=".json" style="display:none" onchange="importData(event)">
            </div>
        </div>
    `;
}

function countCompletedRaces() {
    let count = 0;
    ['women', 'men'].forEach(g => {
        [1, 2, 3, 4].forEach(r => { if (appState.races[g][r]) count++; });
    });
    return count;
}

function renderAthletes() {
    const filterGender = document.getElementById('athlete-filter-gender')?.value || 'all';
    let athletes = [...appState.athletes];
    if (filterGender !== 'all') athletes = athletes.filter(a => a.gender === filterGender);

    return `
        <div class="section-header">
            <h2>Athlete Management</h2>
            <button class="btn btn-primary" onclick="openAthleteModal()">➕ Add Athlete</button>
        </div>
        <div class="filter-bar">
            <div class="filter-group">
                <label>Gender:</label>
                <select id="athlete-filter-gender" onchange="renderCurrentTab()">
                    <option value="all" ${filterGender === 'all' ? 'selected' : ''}>All</option>
                    <option value="women" ${filterGender === 'women' ? 'selected' : ''}>Women</option>
                    <option value="men" ${filterGender === 'men' ? 'selected' : ''}>Men</option>
                </select>
            </div>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Nation</th><th>Gender</th><th>SOQC Rank</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${athletes.length ? athletes.map((a, i) => `
                        <tr>
                            <td><strong>${a.name}</strong></td>
                            <td>${a.nation}</td>
                            <td>${a.gender === 'women' ? '👩 Women' : '👨 Men'}</td>
                            <td>${a.soqcRank || '-'}</td>
                            <td>
                                <button class="btn btn-secondary" onclick="editAthlete(${appState.athletes.indexOf(a)})">✏️</button>
                                <button class="btn btn-danger" onclick="deleteAthlete(${appState.athletes.indexOf(a)})">🗑️</button>
                            </td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" class="text-muted" style="text-align:center">No athletes added yet</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function renderRaceEntry() {
    return `
        <div class="section-header">
            <h2>Race Entry</h2>
        </div>
        <div class="race-setup">
            <div class="form-row">
                <div class="form-group">
                    <label>Race Number</label>
                    <select id="race-number">
                        <option value="1">Mass Start #1 (Fall WC Trials)</option>
                        <option value="2">Mass Start #2 (Fall WC Trials)</option>
                        <option value="3">Mass Start #3 (Olympic Trials)</option>
                        <option value="4">Mass Start #4 (Olympic Trials)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Gender</label>
                    <select id="race-gender">
                        <option value="women">Women</option>
                        <option value="men">Men</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Format</label>
                    <select id="race-format">
                        <option value="16">16-Lap</option>
                        <option value="10">10-Lap</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="race-date">
                </div>
            </div>
            <button class="btn btn-primary mt-1" onclick="loadRaceEntryForm()">📝 Load Race Entry Form</button>
        </div>
        <div id="race-entry-container"></div>
    `;
}

function loadRaceEntryForm() {
    const raceNum = document.getElementById('race-number').value;
    const gender = document.getElementById('race-gender').value;
    const format = parseInt(document.getElementById('race-format').value);
    const date = document.getElementById('race-date').value;

    // Sort alphabetically for easier finding
    const athletes = appState.athletes.filter(a => a.gender === gender).sort((a, b) => a.name.localeCompare(b.name));

    // Quick Add Button
    const quickAddHtml = `
        <div class="alert alert-secondary p-1 mb-1">
            <strong>Missing a skater?</strong> 
            <input type="text" id="new-athlete-name" placeholder="Name" class="p-1" style="width: 200px;">
            <input type="text" id="new-athlete-nation" placeholder="USA" value="USA" class="p-1" style="width: 60px;">
            <button class="btn btn-sm btn-primary" onclick="quickAddAthlete('${gender}')">Add & Reload</button>
        </div>
    `;

    if (!athletes.length && !confirm('No athletes found. Add new ones?')) {
        return;
    }

    const sprintConfig = SPRINT_POINTS[format];
    const numIntermediates = sprintConfig.intermediateLaps.length;

    let html = `
        <div class="card">
            <h3>🏁 ${gender === 'women' ? "Women's" : "Men's"} Mass Start #${raceNum} (${format}-Lap)</h3>
            ${quickAddHtml}
            
            <h4 class="mt-1">Intermediate Sprints</h4>
            <p class="text-muted">Select 1st, 2nd, 3rd place for each intermediate sprint</p>
            ${sprintConfig.intermediateLaps.map((lap, idx) => `
                <div class="sprint-row">
                    <span class="sprint-label">Lap ${lap}</span>
                    <select id="int${idx + 1}_1st" class="form-control d-inline w-auto">${athleteOptions(athletes, '1st')}</select>
                    <select id="int${idx + 1}_2nd" class="form-control d-inline w-auto">${athleteOptions(athletes, '2nd')}</select>
                    <select id="int${idx + 1}_3rd" class="form-control d-inline w-auto">${athleteOptions(athletes, '3rd')}</select>
                </div>
            `).join('')}
            
            <h4 class="mt-2">Start List & Results</h4>
            <p class="text-muted">Enter Finish Position for each skater. Leave blank or mark DNS if they did not race.</p>
            <div id="finish-order-list" style="display: grid; grid-template-columns: 30px 2fr 1fr 1fr; gap: 10px; align-items: center; max-width: 800px;">
                <div></div>
                <div style="font-weight: bold;">Skater Name</div>
                <div style="font-weight: bold;">Status</div>
                <div style="font-weight: bold;">Finish Pos</div>
                ${athletes.map(a => `
                    <div id="row_${a.id}" style="display:contents">
                        <div>
                            <button class="btn btn-sm" style="padding:0 5px; color:#ff4444; border:1px solid #444;" onclick="removeRacerRow('${a.id}')" title="Remove from list">✕</button>
                        </div>
                        <div class="racer-name">${a.name} <small class="text-muted">(${a.nation})</small></div>
                        <div>
                            <select id="status_${a.id}" class="form-control p-1">
                                <option value="finished">Finished</option>
                                <option value="lapped">Lapped (0 Pts)</option>
                                <option value="dnf">DNF</option>
                                <option value="dsq">DSQ</option>
                                <option value="dns">DNS</option>
                            </select>
                        </div>
                        <div>
                            <input type="number" id="pos_${a.id}" class="form-control p-1 mb-1" placeholder="Pos" min="1">
                            <input type="text" id="time_${a.id}" class="form-control p-1" placeholder="Time (8.15,99)">
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="action-row mt-2">
                <button class="btn btn-success" onclick="submitRace(${raceNum}, '${gender}', ${format}, '${date}')">💾 Save Race Results</button>
                <button class="btn btn-secondary" onclick="document.getElementById('race-entry-container').innerHTML=''">Cancel</button>
            </div>
        </div>
    `;

    document.getElementById('race-entry-container').innerHTML = html;

    // Helper to fix status defaults: If we have many athletes, defaulting to "Finished" might be annoying if half are DNS. 
    // But defaulting to "DNS" means updating EVERYONE who raced.
    // Compromise: Default to "Finished". The key is finding them.
    athletes.forEach(a => {
        document.getElementById(`status_${a.id}`).value = "finished";
    });
}

function quickAddAthlete(gender) {
    const name = document.getElementById('new-athlete-name').value;
    const nation = document.getElementById('new-athlete-nation').value;
    if (name) {
        addAthlete({ name, nation, gender, soqcRank: 99 }); // Add with default rank
        saveToStorage();
        loadRaceEntryForm(); // Reload to show new athlete
    }
}

function athleteOptions(athletes, placeholder) {
    return `<option value="">-- ${placeholder} --</option>` +
        athletes.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

function submitRace(raceNum, gender, format, date) {
    const sprintConfig = SPRINT_POINTS[format];
    const athletes = appState.athletes.filter(a => a.gender === gender);
    const numIntermediates = sprintConfig.intermediateLaps.length;

    // Collect intermediate sprint results
    const intermediates = [];
    for (let i = 0; i < numIntermediates; i++) {
        intermediates.push({
            lap: sprintConfig.intermediateLaps[i],
            first: document.getElementById(`int${i + 1}_1st`).value,
            second: document.getElementById(`int${i + 1}_2nd`).value,
            third: document.getElementById(`int${i + 1}_3rd`).value
        });
    }

    // Collect finish order
    const finishOrder = [];
    athletes.forEach(a => {
        const statusElem = document.getElementById(`status_${a.id}`);
        if (!statusElem) return; // Skip removed rows

        const status = statusElem.value;
        const posInput = document.getElementById(`pos_${a.id}`).value;
        const timeInput = document.getElementById(`time_${a.id}`).value;

        let position = null;
        if (posInput) {
            position = parseInt(posInput);
        }

        // Only include if they have a valid result entry:
        // 1. Finished AND Position entered
        // 2. Explicitly marked as DNS, DNF, Lapped, etc.
        // 3. Exclude 'Finished' with empty position (Treat as not entered)
        if ((status === 'finished' && position) || (status !== 'finished')) {
            finishOrder.push({
                athleteId: a.id,
                status: status,
                position: position,
                time: timeInput
            });
        }
    });

    // Sort finishOrder by position to be clean
    finishOrder.sort((a, b) => (a.position || 999) - (b.position || 999));

    // Calculate race points for each athlete
    const results = calculateRacePoints(finishOrder, intermediates, sprintConfig);

    // Store the race
    appState.races[gender][raceNum] = {
        raceNum, gender, format, date,
        intermediates, finishOrder, results
    };

    saveToStorage();
    alert('Race results saved successfully!');
    renderDashboard(); // Refresh dashboard
    switchToTab('results'); // Go to results
}

function calculateRacePoints(finishOrder, intermediates, sprintConfig) {
    const results = {};

    // Initialize all athletes with 0 points
    finishOrder.forEach(f => {
        if (f.status === 'finished') {
            results[f.athleteId] = {
                intermediatePoints: 0,
                sprints: new Array(intermediates.length).fill(0),
                finalPoints: 0,
                totalRacePoints: 0,
                finishPosition: f.position,
                time: f.time || '',
                status: 'finished'
            };
        }
    });

    // Add intermediate sprint points
    intermediates.forEach((int, idx) => {
        if (int.first && results[int.first]) {
            results[int.first].intermediatePoints += sprintConfig.intermediate[0];
            results[int.first].sprints[idx] = sprintConfig.intermediate[0];
        }
        if (int.second && results[int.second]) {
            results[int.second].intermediatePoints += sprintConfig.intermediate[1];
            results[int.second].sprints[idx] = sprintConfig.intermediate[1];
        }
        if (int.third && results[int.third]) {
            results[int.third].intermediatePoints += sprintConfig.intermediate[2];
            results[int.third].sprints[idx] = sprintConfig.intermediate[2];
        }
    });

    // Add final sprint points (based on finish position)
    finishOrder.forEach(f => {
        if (f.status === 'finished' && f.position <= sprintConfig.final.length) {
            results[f.athleteId].finalPoints = sprintConfig.final[f.position - 1];
        }
    });

    // Calculate total race points
    Object.keys(results).forEach(id => {
        results[id].totalRacePoints = results[id].intermediatePoints + results[id].finalPoints;
    });

    // Handle DNF/DSQ - they lose all intermediate points
    // Handle DNF/DSQ/LAPPED - they lose all intermediate points
    // Handle DNF/DSQ/LAPPED - they lose all intermediate points
    finishOrder.forEach(f => {
        if (f.status !== 'finished') {
            results[f.athleteId] = {
                intermediatePoints: 0,
                sprints: new Array(intermediates.length).fill(0),
                finalPoints: 0,
                totalRacePoints: 0,
                finishPosition: f.position, // Preserve position for ranking
                time: f.time || '',
                status: f.status
            };
        }
    });

    // Sort all athletes for ranking
    // Priority: Total Race Points (desc) -> Finish Position (asc)
    const sorted = Object.entries(results).sort((a, b) => {
        const rA = a[1];
        const rB = b[1];

        // 1. Total Race Points (desc)
        if (rB.totalRacePoints !== rA.totalRacePoints) {
            return rB.totalRacePoints - rA.totalRacePoints;
        }

        // 2. Finish Position (asc)
        // If position is missing, treat as last (Infinity)
        const posA = rA.finishPosition || 999;
        const posB = rB.finishPosition || 999;
        return posA - posB;
    });

    // Assign ranks and ACRS points to ALL athletes
    sorted.forEach(([id, r], idx) => {
        const rank = idx + 1;
        results[id].rank = rank;

        // Award ACRS points based on rank
        // DSQ/DNS get 0 points but still get a rank? 
        // User sheet has DNF getting points (William Silk).
        // So we give points to EVERYONE unless explicitly DSQ/DNS maybe?
        // Let's stick to the rule: if you have a rank, you get points.
        if (r.status === 'dsq' || r.status === 'dns') {
            results[id].acrsPoints = 0;
        } else {
            results[id].acrsPoints = (idx < ACRS_POINTS.length) ? ACRS_POINTS[idx] : 1;
        }
    });

    return results;
}



function renderResults() {
    const gender = appState.resultsGender;

    return `
        <div class="section-header">
            <h2>Race Results & ACRS Points</h2>
        </div>
        <div class="filter-bar">
            <div class="filter-group">
                <label>Gender:</label>
                <select id="results-gender" onchange="appState.resultsGender=this.value; renderCurrentTab()">
                    <option value="women" ${gender === 'women' ? 'selected' : ''}>Women</option>
                    <option value="men" ${gender === 'men' ? 'selected' : ''}>Men</option>
                </select>
            </div>
        </div>
        <div class="results-grid">
            <div class="results-panel">
                <h3>Race-by-Race Results</h3>
                <div class="race-tabs">
                    ${[1, 2, 3, 4].map(r => `
                        <button class="race-tab ${appState.selectedRace === r ? 'active' : ''}" onclick="appState.selectedRace=${r}; renderCurrentTab()">MS #${r}</button>
                    `).join('')}
                </div>
                ${renderSingleRaceResults(gender, appState.selectedRace)}
            </div>
            <div class="results-panel">
                <h3>Combined ACRS Standings</h3>
                ${renderCombinedStandings(gender)}
            </div>
        </div>
    `;
}

function renderSingleRaceResults(gender, raceNum) {
    const race = appState.races[gender][raceNum];
    if (!race || !race.results) {
        return `
            <div class="text-center p-2">
                <p class="text-muted mb-1">No results entered for this race yet.</p>
                <button class="btn btn-primary" onclick="switchToTab('races'); setTimeout(() => {document.getElementById('race-number').value='${raceNum}'; document.getElementById('race-gender').value='${appState.resultsGender}'; document.querySelector('.btn-primary').click();}, 100)">
                    📝 Enter Results Now
                </button>
            </div>
        `;
    }  // Sort by rank
    const results = Object.entries(race.results)
        .sort((a, b) => a[1].rank - b[1].rank);

    const location = raceNum <= 2 ? 'Utah Olympic Oval' : 'Pettit National Ice Center';

    return `
        <div class="action-row no-print mb-1">
             <button class="btn btn-sm btn-secondary" onclick="exportRaceCSV(${raceNum}, '${gender}')">📊 Export CSV</button>
             <button class="btn btn-sm btn-secondary" onclick="printResults('${gender === 'women' ? "Women\\'s" : "Men\\'s"} Mass Start #${raceNum} Results', '${race.date}', '${location}')">🖨️ Print PDF</button>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Rank</th><th>Name</th>
                        <th>S1</th><th>S2</th><th>S3</th><th>Final</th>
                        <th>Total</th><th>Time</th>
                        <th>ACRS</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(([id, r]) => {
        const athlete = appState.athletes.find(a => a.id === id);
        const rankClass = r.rank <= 3 ? `rank-${r.rank}` : '';

        const s1 = r.sprints ? r.sprints[0] : 0;
        const s2 = r.sprints ? r.sprints[1] : 0;
        const s3 = r.sprints ? r.sprints[2] : 0;

        let timeDisplay = r.time;
        if (!timeDisplay) {
            if (r.status === 'lapped') timeDisplay = '<span class="text-muted">Lapped</span>';
            else if (r.status === 'dnf') timeDisplay = '<span class="text-error">DNF</span>';
            else if (r.status === 'dsq') timeDisplay = '<span class="text-error">DSQ</span>';
            else if (r.status === 'dns') timeDisplay = '<span class="text-muted">DNS</span>';
            else timeDisplay = '-';
        }

        return `
                            <tr class="${rankClass}">
                                <td>${r.rank}</td>
                                <td>${athlete?.name || 'Unknown'}</td>
                                <td>${s1 || ''}</td>
                                <td>${s2 || ''}</td>
                                <td>${s3 || ''}</td>
                                <td>${r.finalPoints || ''}</td>
                                <td><strong>${r.totalRacePoints}</strong></td>
                                <td>${timeDisplay}</td>
                                <td><strong>${r.acrsPoints}</strong></td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderCombinedStandings(gender) {
    const standings = calculateCombinedStandings(gender);
    if (!standings.length) return '<p class="text-muted">No results available</p>';

    return `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr><th>Rank</th><th>Name</th><th>MS1</th><th>MS2</th><th>MS3</th><th>MS4</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${standings.map((s, idx) => {
        const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
        return `
                            <tr class="${rankClass}">
                                <td>${idx + 1}</td>
                                <td>${s.name}</td>
                                <td>${s.races[1] || '-'}</td>
                                <td>${s.races[2] || '-'}</td>
                                <td>${s.races[3] || '-'}</td>
                                <td>${s.races[4] || '-'}</td>
                                <td><strong>${s.total}</strong></td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function calculateCombinedStandings(gender) {
    const athleteScores = {};

    appState.athletes.filter(a => a.gender === gender).forEach(a => {
        athleteScores[a.id] = { id: a.id, name: a.name, races: {}, total: 0, soqcRank: a.soqcRank };
    });

    [1, 2, 3, 4].forEach(raceNum => {
        const race = appState.races[gender][raceNum];
        if (race) {
            Object.entries(race.results).forEach(([id, r]) => {
                if (athleteScores[id]) {
                    athleteScores[id].races[raceNum] = r.acrsPoints;
                }
            });
        }
    });

    // Calculate totals
    Object.values(athleteScores).forEach(s => {
        s.total = Object.values(s.races).reduce((sum, pts) => sum + pts, 0);
    });

    const activeRaces = [4, 3, 2, 1].filter(n => appState.races[gender][n]);

    return Object.values(athleteScores)
        .filter(s => s.total > 0)
        .sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;

            // Tiebreaker: Higher finisher in most recent race
            for (let rNum of activeRaces) {
                const ptsA = a.races[rNum] || 0;
                const ptsB = b.races[rNum] || 0;
                if (ptsA !== ptsB) return ptsB - ptsA; // Higher points wins
            }
            return 0;
        });
}

function renderOlympicSelection() {
    const gender = appState.resultsGender || 'women';
    return `
        <div class="section-header">
            <h2>2026 Olympic Team Selection Rankings</h2>
            <p class="text-muted">Best 3 of 4 Mass Start Results</p>
        </div>
        
        <div class="text-center mb-2 no-print">
            <div class="btn-group" role="group">
                <button class="btn ${gender === 'women' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setOlympicGender('women')">Women's Rankings</button>
                <button class="btn ${gender === 'men' ? 'btn-primary' : 'btn-outline-primary'}" onclick="setOlympicGender('men')">Men's Rankings</button>
            </div>
        </div>

        <div class="olympic-panel">
            <div class="panel-header"><h3>🏅 ${gender === 'women' ? "Women's" : "Men's"} Rankings</h3></div>
            ${renderOlympicTable(gender)}
        </div>

        <div class="card mt-1">
            <h3>Tiebreaker Rules</h3>
            <ol>
                <li>Skater with the highest finish at Mass Start #4</li>
                <li>Skater with the highest SOQC Ranking from fall World Cups</li>
            </ol>
        </div>
    `;
}

function setOlympicGender(g) {
    appState.resultsGender = g;
    renderCurrentTab();
}

function renderOlympicTable(gender) {
    const rankings = calculateOlympicRankings(gender);
    if (!rankings.length) return '<p class="text-muted" style="padding:1rem">No results available</p>';

    return `
        <div class="action-row no-print" style="padding: 0.5rem 1rem;">
             <button class="btn btn-sm btn-secondary" onclick="exportOlympicCSV('${gender}')">📊 Export CSV</button>
             <button class="btn btn-sm btn-secondary" onclick="printResults('${gender === 'women' ? "Women\\'s" : "Men\\'s"} Olympic Selection Standings')">🖨️ Print PDF</button>
        </div>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr><th>Rank</th><th>Name</th><th>MS1</th><th>MS2</th><th>MS3</th><th>MS4</th><th>Best 3</th><th>Drop</th></tr>
                </thead>
                <tbody>
                    ${rankings.map((r, idx) => {
        const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
        return `
                            <tr class="${rankClass}">
                                <td>${idx + 1}</td>
                                <td>${r.name}</td>
                                <td class="${r.dropped === 1 ? 'dropped' : ''}">${r.races[1] || '-'}</td>
                                <td class="${r.dropped === 2 ? 'dropped' : ''}">${r.races[2] || '-'}</td>
                                <td class="${r.dropped === 3 ? 'dropped' : ''}">${r.races[3] || '-'}</td>
                                <td class="${r.dropped === 4 ? 'dropped' : ''}">${r.races[4] || '-'}</td>
                                <td><strong>${r.best3Total}</strong></td>
                                <td class="text-muted">${r.droppedPoints || '-'}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function calculateOlympicRankings(gender) {
    const athleteScores = {};

    appState.athletes.filter(a => a.gender === gender).forEach(a => {
        athleteScores[a.id] = {
            id: a.id,
            name: a.name,
            races: {},
            soqcRank: a.soqcRank,
            ms4Rank: null
        };
    });

    [1, 2, 3, 4].forEach(raceNum => {
        const race = appState.races[gender][raceNum];
        if (race) {
            Object.entries(race.results).forEach(([id, r]) => {
                if (athleteScores[id]) {
                    athleteScores[id].races[raceNum] = r.acrsPoints;
                    if (raceNum === 4) athleteScores[id].ms4Rank = r.rank;
                }
            });
        }
    });

    // Calculate best 3 of 4
    Object.values(athleteScores).forEach(s => {
        const raceResults = [1, 2, 3, 4].map(r => ({ race: r, pts: s.races[r] || 0 }));
        raceResults.sort((a, b) => a.pts - b.pts); // Sort ascending to find lowest

        if (raceResults.filter(r => r.pts > 0).length >= 3) {
            s.dropped = raceResults[0].race;
            s.droppedPoints = raceResults[0].pts;
            s.best3Total = raceResults.slice(1).reduce((sum, r) => sum + r.pts, 0);
        } else {
            s.dropped = null;
            s.droppedPoints = null;
            s.best3Total = raceResults.reduce((sum, r) => sum + r.pts, 0);
        }
    });

    const activeRaces = [4, 3, 2, 1].filter(n => appState.races[gender][n]);

    return Object.values(athleteScores)
        .filter(s => s.best3Total > 0)
        .sort((a, b) => {
            // Primary: Best 3 total
            if (b.best3Total !== a.best3Total) return b.best3Total - a.best3Total;

            // Tiebreaker 1: Higher finisher in most recent race
            for (let rNum of activeRaces) {
                const ptsA = a.races[rNum] || 0;
                const ptsB = b.races[rNum] || 0;
                if (ptsA !== ptsB) return ptsB - ptsA;
            }

            // Tiebreaker 2: SOQC rank (lower is better, fallback)
            if (a.soqcRank && b.soqcRank) return a.soqcRank - b.soqcRank;
            return 0;
        });
}

// =============================================================================
// ATHLETE MANAGEMENT
// =============================================================================
let editingAthleteIndex = null;

function openAthleteModal(index = null) {
    editingAthleteIndex = index;
    const athlete = index !== null ? appState.athletes[index] : null;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'athlete-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${athlete ? 'Edit Athlete' : 'Add Athlete'}</h3>
                <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="athlete-name" value="${athlete?.name || ''}" placeholder="Enter athlete name">
                </div>
                <div class="form-group">
                    <label>Nation</label>
                    <input type="text" id="athlete-nation" value="${athlete?.nation || 'USA'}" placeholder="e.g., USA">
                </div>
                <div class="form-group">
                    <label>Gender</label>
                    <select id="athlete-gender">
                        <option value="women" ${athlete?.gender === 'women' ? 'selected' : ''}>Women</option>
                        <option value="men" ${athlete?.gender === 'men' ? 'selected' : ''}>Men</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>SOQC Rank (optional - for tiebreakers)</label>
                    <input type="number" id="athlete-soqc" value="${athlete?.soqcRank || ''}" placeholder="Enter SOQC ranking">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveAthlete()">Save</button>
            </div>
        </div>
    `;
    document.getElementById('modal-container').appendChild(modal);
}

function saveAthlete() {
    const name = document.getElementById('athlete-name').value.trim();
    const nation = document.getElementById('athlete-nation').value.trim() || 'USA';
    const gender = document.getElementById('athlete-gender').value;
    const soqcRank = parseInt(document.getElementById('athlete-soqc').value) || null;

    if (!name) { alert('Please enter athlete name'); return; }

    if (editingAthleteIndex !== null) {
        appState.athletes[editingAthleteIndex] = {
            ...appState.athletes[editingAthleteIndex],
            name, nation, gender, soqcRank
        };
    } else {
        appState.athletes.push({
            id: 'athlete_' + Date.now(),
            name, nation, gender, soqcRank
        });
    }

    saveToStorage();
    closeModal();
    renderCurrentTab();
}

function editAthlete(index) { openAthleteModal(index); }

function deleteAthlete(index) {
    if (confirm(`Delete ${appState.athletes[index].name}?`)) {
        appState.athletes.splice(index, 1);
        saveToStorage();
        renderCurrentTab();
    }
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

// =============================================================================
// DATA IMPORT/EXPORT
// =============================================================================
function exportData() {
    const data = JSON.stringify({ athletes: appState.athletes, races: appState.races }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mass_start_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            appState.athletes = data.athletes || [];
            appState.races = data.races || appState.races;
            saveToStorage();
            renderCurrentTab();
            alert('Data imported successfully!');
        } catch (err) {
            alert('Error importing data: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// =============================================================================
// ACRS MODAL
// =============================================================================
function openAcrsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:800px">
            <div class="modal-header">
                <h3>ACRS Points Reference Table</h3>
                <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="acrs-grid">
                    ${ACRS_POINTS.map((pts, i) => `
                        <div class="acrs-cell">
                            <div class="place">${i + 1}</div>
                            <div class="pts">${pts}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    document.getElementById('modal-container').appendChild(modal);
}

function attachEventListeners() {
    // Any dynamic event listeners if needed
}

// =============================================================================
// EXPORT & PRINT UTILITIES
// =============================================================================

function exportToCSV(filename, headers, rows) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function printResults(title, dateStr, location) {
    const printTitle = document.getElementById('print-race-title');
    const printMeta = document.getElementById('print-meta');

    if (printTitle) printTitle.textContent = title;
    if (printMeta) printMeta.textContent = `${location || 'Utah Olympic Oval'} | ${dateStr || new Date().toLocaleDateString()}`;

    window.print();
}

function exportRaceCSV(raceNum, gender) {
    const race = appState.races[gender][raceNum];
    if (!race) return alert('No results found for this race.');

    const headers = ['Rank', 'Name', 'Nation', 'Status', 'S1', 'S2', 'S3', 'Final', 'Total Pts', 'Time', 'ACRS Pts'];

    const results = [];
    Object.entries(race.results).forEach(([id, r]) => {
        results.push({ ...r, id });
    });
    results.sort((a, b) => a.rank - b.rank);

    const rows = results.map(r => {
        const athlete = appState.athletes.find(a => a.id === r.id);
        const s1 = r.sprints ? r.sprints[0] : 0;
        const s2 = r.sprints ? r.sprints[1] : 0;
        const s3 = r.sprints ? r.sprints[2] : 0;

        return [
            r.rank,
            athlete ? athlete.name : 'Unknown',
            athlete ? athlete.nation : '',
            r.status,
            s1, s2, s3,
            r.finalPoints,
            r.totalRacePoints,
            r.time || '',
            r.acrsPoints
        ];
    });

    exportToCSV(`${gender}_mass_start_${raceNum}_results.csv`, headers, rows);
}

function exportOlympicCSV(gender) {
    const standings = calculateOlympicRankings(gender);
    const headers = ['Rank', 'Name', 'MS1', 'MS2', 'MS3', 'MS4', 'Total (Best 3)', 'Drop', 'SOQC Rank'];

    const rows = standings.map((s, idx) => [
        idx + 1,
        s.name,
        s.races[1] || '-',
        s.races[2] || '-',
        s.races[3] || '-',
        s.races[4] || '-',
        s.best3Total,
        s.dropped ? `MS${s.dropped} (${s.droppedPoints})` : '-',
        s.soqcRank || ''
    ]);

    exportToCSV(`${gender}_olympic_selection_standings.csv`, headers, rows);
}

function renderUserManual() {
    return `
        <div class="card p-2" style="max-width: 900px; margin: 0 auto;">
            <h2 class="section-title text-center mb-1">User Guide</h2>
            
            <div class="manual-section p-1" style="background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 2rem;">
                <h3>1. Enter Race Results</h3>
                <ol style="margin-left: 1.5rem; line-height: 1.6;">
                    <li>Go to the <strong><span style="font-size:1.2em">🏁</span> Race Entry</strong> tab.</li>
                    <li>Select the <strong>Race #</strong> and <strong>Gender</strong>, then click <strong>Load Form</strong>.</li>
                    <li><strong>Simplify the List</strong>: Click the red <strong>✕</strong> next to any skater who isn't racing to hide them.</li>
                    <li><strong>Sprints</strong>: Select winners for Laps 4, 8, 12 in the top section.</li>
                    <li><strong>Skaters</strong>: Update <strong>Status</strong>, enter <strong>Position</strong>, and type the <strong>Time</strong>.</li>
                    <li>Click <strong>Save Race Results</strong>.</li>
                </ol>
            </div>
            
            <div class="manual-section p-1" style="background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 2rem;">
                <h3>2. Print & Share</h3>
                <ul style="margin-left: 1.5rem; line-height: 1.6;">
                    <li>Go to the <strong><span style="font-size:1.2em">🏆</span> Results</strong> tab.</li>
                    <li>Select a specific race (e.g., MS #3) or Olympic Selection.</li>
                    <li>Click <strong>🖨️ Print PDF</strong>.</li>
                </ul>
            </div>

            <div class="manual-section p-1" style="background: rgba(255,255,255,0.05); border-radius: 8px;">
                <h3>📋 Rules Note</h3>
                <p>Final Sprint points (60, 40...) are automatically calculated based on the Finish Position you enter.</p>
            </div>
        </div>
    `;
}

function removeRacerRow(id) {
    const row = document.getElementById(`row_${id}`);
    if (row) row.remove();
}
