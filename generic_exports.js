
// =============================================================================
// GENERIC DISTANCE EXPORTS (500m, 1000m, etc.)
// =============================================================================

async function shareGenericDistanceImage() {
    const gender = appState.viewGender;
    const dist = appState.viewDistance;
    const genderLabel = gender === 'women' ? "WOMEN'S" : "MEN'S";

    // Get Data
    const data = appState.events[gender][dist]?.results || [];
    const sortedData = [...data].sort((a, b) => { // Sort asc by time
        if (!a.best) return 1; if (!b.best) return -1;
        return a.best.localeCompare(b.best);
    }).slice(0, 12); // Top 12 for image

    const is500 = dist === '500m';

    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed; top: 0; left: -9999px;
        width: 1080px; height: 1350px; 
        background: radial-gradient(circle at top, #1a1a2e, #000);
        color: white; font-family: 'Segoe UI', sans-serif;
        padding: 60px; box-sizing: border-box;
        z-index: -1; display: flex; flex-direction: column;
    `;

    // Calculate Header Columns
    let headerCols = '';
    if (is500) {
        headerCols = `
            <th style="padding: 0 10px; text-align: left; font-weight: normal;">Athlete</th>
            <th style="padding: 0 10px; text-align: center; font-weight: normal;">Race 1</th>
            <th style="padding: 0 10px; text-align: center; font-weight: normal;">Race 2</th>
            <th style="padding: 0 25px 0 0; text-align: right; font-weight: normal; color: #D4AF37;">Best</th>
        `;
    } else {
        headerCols = `
             <th style="padding: 0 10px; text-align: left; font-weight: normal;">Athlete</th>
             <th style="padding: 0 25px 0 0; text-align: right; font-weight: normal; color: #D4AF37;">Time</th>
        `;
    }

    exportContainer.innerHTML = `
        <div style="text-align: center; border-bottom: 4px solid #D4AF37; padding-bottom: 15px; margin-bottom: 10px;">
            <div style="font-size: 30px; letter-spacing: 4px; color: #888; text-transform: uppercase; font-weight: 300;">${getBranding('MASS_START_TITLE')}</div>
            <h1 style="font-size: 70px; margin: 0 0 5px 0; color: #fff; text-transform: uppercase; text-shadow: 0 4px 10px rgba(0,0,0,0.5); line-height: 0.9;">${genderLabel}<br>${dist.toUpperCase()}</h1>
            <div style="display: flex; justify-content: center; gap: 20px; align-items: center;">
                 <div style="background: #D4AF37; color: #000; padding: 4px 15px; font-weight: bold; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">Unofficial Standings</div>
            </div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-start;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 5px;">
                <thead>
                    <tr style="font-size: 18px; color: #888; letter-spacing: 2px; text-transform: uppercase;">
                        <th style="padding: 0 20px; text-align: left; font-weight: normal; width: 60px;">Rank</th>
                        ${headerCols}
                    </tr>
                </thead>
                <tbody>
                    ${sortedData.map((s, i) => {
        const rank = i + 1;
        let bgStyle = 'background: rgba(255,255,255,0.02);';
        let rankColor = '#666';

        if (rank === 1) { bgStyle = 'background: linear-gradient(90deg, rgba(212,175,55,0.25), transparent); border-left: 4px solid #D4AF37;'; rankColor = '#D4AF37'; }
        else if (rank === 2) { bgStyle = 'background: linear-gradient(90deg, rgba(192,192,192,0.2), transparent); border-left: 4px solid #C0C0C0;'; rankColor = '#C0C0C0'; }
        else if (rank === 3) { bgStyle = 'background: linear-gradient(90deg, rgba(205,127,50,0.2), transparent); border-left: 4px solid #CD7F32;'; rankColor = '#CD7F32'; }

        let rowContent = '';
        if (is500) {
            rowContent = `
                                <td style="padding: 0 10px; font-weight: 700; font-size: 24px; color: #fff;">${s.name.toUpperCase()}</td>
                                <td style="color:#888; font-size:20px; text-align:center;">${s.time1 || '-'}</td>
                                <td style="color:#888; font-size:20px; text-align:center;">${s.time2 || '-'}</td>
                                <td style="padding-right: 25px; text-align: right; font-weight: 900; font-size: 36px; color: ${rank <= 3 ? '#D4AF37' : '#fff'};">${s.best || '-'}</td>
                            `;
        } else {
            rowContent = `
                                <td style="padding: 0 10px; font-weight: 700; font-size: 28px; color: #fff;">${s.name.toUpperCase()}</td>
                                <td style="padding-right: 25px; text-align: right; font-weight: 900; font-size: 48px; color: ${rank <= 3 ? '#D4AF37' : '#fff'};">${s.best || s.time || '-'}</td>
                            `;
        }

        return `
                        <tr style="${bgStyle} height: 60px;">
                            <td style="padding: 0 20px; font-weight: 900; color: ${rankColor}; font-size: 28px;">${rank}</td>
                            ${rowContent}
                        </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>

        <div style="text-align: center; margin-top: auto; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 36px; font-weight: 900; color: #D4AF37; letter-spacing: 1px;">@SALTYGOLDSUPPLY</div>
            <div style="font-size: 18px; color: #888; margin-top: 5px; letter-spacing: 3px; font-weight: 300;">WWW.SALTYGOLDSUPPLY.COM</div>
        </div>
    `;

    document.body.appendChild(exportContainer);
    showToast('Generating graphic... 🎨');

    try {
        const canvas = await html2canvas(exportContainer, { scale: 1, useCORS: true, backgroundColor: '#000' });
        document.body.removeChild(exportContainer);
        canvas.toBlob(blob => {
            const fileName = `OT2026_${dist}_${gender}.png`;
            saveAsFile(blob, fileName);
        });
    } catch (e) {
        console.error(e);
        showToast('Error generating image');
        if (document.body.contains(exportContainer)) document.body.removeChild(exportContainer);
    }
}

function shareGenericDistancePdf() {
    const gender = appState.viewGender;
    const dist = appState.viewDistance;
    const data = appState.events[gender][dist]?.results || [];
    const sortedData = [...data].sort((a, b) => { // Sort asc by time
        if (!a.best) return 1; if (!b.best) return -1;
        return a.best.localeCompare(b.best);
    });
    const is500 = dist === '500m';

    const printWindow = window.open('', '', 'height=800,width=800');

    let tableHeader = '';
    let tableRows = '';

    if (is500) {
        tableHeader = `<tr><th>Rank</th><th class="text-left">Athlete</th><th>Race 1</th><th>Race 2</th><th class="text-right">Best Time</th></tr>`;
        tableRows = sortedData.map((s, i) => `
            <tr>
                <td><div class="${getRankBadgeClass(i + 1)}">${i + 1}</div></td>
                <td><strong>${s.name}</strong></td>
                <td>${s.time1 || '-'}</td>
                <td>${s.time2 || '-'}</td>
                <td class="text-right" style="font-weight:900;">${s.best || '-'}</td>
            </tr>`).join('');
    } else {
        tableHeader = `<tr><th>Rank</th><th class="text-left">Athlete</th><th class="text-right">Time</th></tr>`;
        tableRows = sortedData.map((s, i) => `
            <tr>
                <td><div class="${getRankBadgeClass(i + 1)}">${i + 1}</div></td>
                <td><strong>${s.name}</strong></td>
                <td class="text-right" style="font-weight:900; font-size:16px;">${s.best || s.time || '-'}</td>
            </tr>`).join('');
    }

    printWindow.document.write(`
        <html>
        <head>
            <title>${dist} Standings</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;700;900&display=swap');
                body { font-family: 'Outfit', sans-serif; padding: 40px; color: #000; }
                .header { border-bottom: 4px solid #000; padding-bottom: 20px; margin-bottom: 30px; display:flex; justify-content:space-between; align-items:flex-end; }
                .title { font-size: 40px; font-weight: 900; text-transform: uppercase; line-height:1; }
                .subtitle { color: #d9534f; font-weight: bold; font-size: 18px; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                thead { background: #000; color: #fff; text-transform: uppercase; }
                th { padding: 12px; font-size: 14px; letter-spacing: 1px; }
                td { padding: 12px; border-bottom: 1px solid #ddd; font-size: 14px; text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .rank-badge-1 { background: #D4AF37; color: #fff; width:24px; height:24px; border-radius:50%; display:inline-block; line-height:24px; }
                .rank-badge-2 { background: #A0A0A0; color: #fff; width:24px; height:24px; border-radius:50%; display:inline-block; line-height:24px; }
                .rank-badge-3 { background: #CD7F32; color: #fff; width:24px; height:24px; border-radius:50%; display:inline-block; line-height:24px; }
                .footer { margin-top: 50px; border-top: 2px solid #000; padding-top: 10px; font-size: 10px; color: #666; display:flex; justify-content:space-between; text-transform:uppercase; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div style="font-size:14px; color:#666; letter-spacing:2px;">${getBranding('EVENT_NAME')}</div>
                    <div class="title">${gender === 'women' ? "WOMEN'S" : "MEN'S"} ${dist}</div>
                </div>
                <div class="subtitle">Unofficial Standings</div>
            </div>
            <table>
                <thead>${tableHeader}</thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="footer">
                <div>Generated by Olympic Trials Tracker</div>
                <div>www.saltygoldsupply.com</div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    // printWindow.print(); // Auto-print? Let user do it.
}

function getRankBadgeClass(rank) {
    if (rank === 1) return 'rank-badge-1';
    if (rank === 2) return 'rank-badge-2';
    if (rank === 3) return 'rank-badge-3';
    return '';
}

// Generate Official Protocol for specific Mass Start Race
function shareMassStartProtocolPdf(gender, raceNum) {
    const race = appState.msRaces[gender][raceNum];
    if (!race || !race.results) {
        alert("No results saved for this race yet.");
        return;
    }

    // Sort: Total Points Desc, then Time
    const results = Object.values(race.results).sort((a, b) => {
        if (b.totalRacePoints !== a.totalRacePoints) return b.totalRacePoints - a.totalRacePoints;
        return (a.rank || 99) - (b.rank || 99);
    });

    // Create Printer Friendly Window
    const printWindow = window.open('', '_blank');

    // Build HTML
    const dateStr = new Date().toLocaleString();
    const hasTimes = results.some(r => r.time && r.time.trim() !== '');

    // Format race date nicely (e.g., "Sunday, January 5, 2026")
    const raceDate = race.date ? new Date(race.date) : new Date();
    const raceDateFormatted = raceDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Protocol ${gender} Race ${raceNum}</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                h1 { font-size: 24px; text-transform: uppercase; margin: 10px 0; }
                .sub { font-size: 14px; font-style: italic; }
                .race-date { font-size: 16px; font-weight: bold; margin-top: 10px; }
                table { width: 100%; border-collapse: collapse; font-size: 14px; }
                th { border-bottom: 2px solid #000; text-align: left; padding: 5px; }
                td { border-bottom: 1px solid #ccc; padding: 8px 5px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .footer-sig { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
                .line { border-top: 1px solid #000; width: 250px; padding-top: 5px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>OFFICIAL PROTOCOL</div>
                <h1>${gender.toUpperCase()} MASS START - RACE ${raceNum}</h1>
                <div class="sub">Olympic Team Trials 2026 • Milwaukee, WI</div>
                <div class="race-date">${raceDateFormatted}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width:40px;">Rnk</th>
                        <th>Athlete</th>
                        <th class="text-center" style="width:60px;">Country</th>
                        <th class="text-center" style="width:40px;">Laps</th>
                        <th class="text-center" style="width:35px;">S1</th>
                        <th class="text-center" style="width:35px;">S2</th>
                        <th class="text-center" style="width:35px;">S3</th>
                        <th class="text-center bold" style="width:40px;">S4</th>
                        <th class="text-center bold" style="width:50px;">Total</th>
                        ${hasTimes ? '<th class="text-right" style="width:90px;">Time</th>' : ''}
                        <th class="text-center bold" style="width:60px;">Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(r => `
                        <tr>
                            <td class="bold text-center">${r.rank}</td>
                            <td style="font-weight:600;">${r.name.toUpperCase()}</td>
                            <td class="text-center">USA</td>
                            <td class="text-center">16</td>
                            <td class="text-center" style="color:#555;">${r.sprints[0] || ''}</td>
                            <td class="text-center" style="color:#555;">${r.sprints[1] || ''}</td>
                            <td class="text-center" style="color:#555;">${r.sprints[2] || ''}</td>
                            <td class="text-center bold">${r.finalPoints || ''}</td>
                            <td class="text-center bold" style="font-size:14px;">${r.totalRacePoints}</td>
                            ${hasTimes ? `<td class="text-right" style="font-family:monospace;">${r.time || 'NT'}</td>` : ''}
                            <td class="text-center bold">${r.acrsPoints || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer-sig">
                <div>
                    <div class="line">Chief Referee Signature</div>
                </div>
                <div>
                   <div style="font-size:10px;">Generated: ${dateStr}</div>
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
