// Skaters to Watch - Season Bests 2025-2026
// Source: speedskatingresults.com

const SKATERS_TO_WATCH = {
    women: {
        '500m': {
            note: null,
            skaters: [
                { rank: 1, name: 'Erin Jackson', time: '36.57', notes: 'NR PR', id: 67238 },
                { rank: 2, name: 'Brittany Bowe', time: '37.90', notes: '', id: 29245 },
                { rank: 3, name: 'Sarah Warren', time: '38.10', notes: 'PR', id: 6837 },
                { rank: 4, name: 'Chrysta Rands-Evans', time: '38.38', notes: '', id: 66543 },
                { rank: 5, name: 'McKenzie Browne', time: '38.63', notes: 'PR', id: 83233 },
                { rank: 6, name: 'Kimi Goetz', time: '39.15', notes: '', id: 66104 },
                { rank: 7, name: 'Greta Myers', time: '39.40', notes: '', id: 68934 },
                { rank: 8, name: 'Blair Cruikshank', time: '39.61', notes: '', id: 54693 },
                { rank: 9, name: 'Anna Quinn', time: '40.31', notes: '', id: 60901 },
                { rank: 10, name: 'Piper Yde', time: '40.42', notes: '', id: 52313 }
            ]
        },
        '1000m': {
            note: null,
            skaters: [
                { rank: 1, name: 'Brittany Bowe', time: '1:13.26', notes: '', id: 29245 },
                { rank: 2, name: 'Erin Jackson', time: '1:13.72', notes: 'PR', id: 67238 },
                { rank: 3, name: 'Sarah Warren', time: '1:15.69', notes: '', id: 6837 },
                { rank: 4, name: 'Mia Manganello', time: '1:16.03', notes: '', id: 33692 },
                { rank: 5, name: 'Kimi Goetz', time: '1:16.34', notes: '', id: 66104 },
                { rank: 6, name: 'Greta Myers', time: '1:16.41', notes: '', id: 68934 },
                { rank: 7, name: 'Chrysta Rands-Evans', time: '1:16.68', notes: '', id: 66543 },
                { rank: 8, name: 'McKenzie Browne', time: '1:18.88', notes: '', id: 83233 },
                { rank: 9, name: 'Anna Quinn', time: '1:19.50', notes: '', id: 60901 },
                { rank: 10, name: 'Blair Cruikshank', time: '1:20.61', notes: '', id: 54693 }
            ]
        },
        '1500m': {
            note: null,
            skaters: [
                { rank: 1, name: 'Brittany Bowe', time: '1:51.84', notes: '', id: 29245 },
                { rank: 2, name: 'Greta Myers', time: '1:54.97', notes: 'PR', id: 68934 },
                { rank: 3, name: 'Mia Manganello', time: '1:56.36', notes: '', id: 33692 },
                { rank: 4, name: 'Giorgia Birkeland', time: '1:57.89', notes: 'PR', id: 43655 },
                { rank: 5, name: 'Sarah Warren', time: '1:59.06', notes: 'PR', id: 6837 },
                { rank: 6, name: 'Chrysta Rands-Evans', time: '2:00.86', notes: 'PR', id: 66543 },
                { rank: 7, name: 'Kimi Goetz', time: '2:01.40', notes: '', id: 66104 },
                { rank: 8, name: 'Piper Yde', time: '2:02.21', notes: 'PR', id: 52313 },
                { rank: 9, name: 'Marley Soldan', time: '2:03.08', notes: 'PR', id: 60851 },
                { rank: 10, name: 'McKenzie Browne', time: '2:03.48', notes: 'PR', id: 83233 }
            ]
        },
        '3000m': {
            note: null,
            skaters: [
                { rank: 1, name: 'Greta Myers', time: '4:00.70', notes: 'NR PR', id: 68934 },
                { rank: 2, name: 'Giorgia Birkeland', time: '4:04.59', notes: 'PR', id: 43655 },
                { rank: 3, name: 'Marley Soldan', time: '4:20.03', notes: '', id: 60851 },
                { rank: 4, name: 'Piper Yde', time: '4:22.40', notes: '', id: 52313 },
                { rank: 5, name: 'Rebecca Simmons', time: '4:28.16', notes: '', id: 45786 }
            ]
        },
        '5000m': {
            note: 'Not contested at Olympic Trials. Selected from World Cup Results.',
            skaters: []
        },
        'team_pursuit': {
            note: null,
            skaters: [
                { rank: 1, name: 'Giorgia Birkeland', time: '2:53.58', notes: 'NR PR', id: 43655 },
                { rank: 2, name: 'Brittany Bowe', time: '2:53.58', notes: 'NR PR', id: 29245 },
                { rank: 3, name: 'Mia Manganello', time: '2:53.58', notes: 'NR PR', id: 33692 },
                { rank: 4, name: 'Greta Myers', time: '2:54.01', notes: 'PR SB', id: 68934 }
            ]
        }
    },
    men: {
        '500m': {
            note: null,
            skaters: [
                { rank: 1, name: 'Jordan Stolz', time: '33.79', notes: '', id: 66105 },
                { rank: 2, name: 'Cooper McLeod', time: '34.04', notes: 'PR', id: 68932 },
                { rank: 3, name: 'Zach Stoppelmoor', time: '34.37', notes: 'PR', id: 68933 },
                { rank: 4, name: 'Alec Sklutovsky', time: '34.62', notes: 'PR', id: 60852 },
                { rank: 5, name: 'Conor McDermott-Mostowy', time: '34.68', notes: 'PR', id: 52311 },
                { rank: 6, name: 'Austin Kleba', time: '35.03', notes: '', id: 52310 },
                { rank: 7, name: 'Tanner Worley', time: '35.38', notes: '', id: 68936 },
                { rank: 8, name: 'Sabien Tinson', time: '35.90', notes: '', id: 60853 },
                { rank: 9, name: 'Ian Frederick', time: '36.26', notes: 'PR', id: 52312 },
                { rank: 10, name: 'Jonathan Tobon', time: '36.38', notes: '', id: 33691 }
            ]
        },
        '1000m': {
            note: null,
            skaters: [
                { rank: 1, name: 'Jordan Stolz', time: '1:05.66', notes: '', id: 66105 },
                { rank: 2, name: 'Cooper McLeod', time: '1:06.62', notes: 'PR', id: 68932 },
                { rank: 3, name: 'Conor McDermott-Mostowy', time: '1:07.02', notes: '', id: 52311 },
                { rank: 4, name: 'Zach Stoppelmoor', time: '1:08.36', notes: '', id: 68933 },
                { rank: 5, name: 'Emery Lehman', time: '1:09.43', notes: '', id: 33693 },
                { rank: 6, name: 'Jonathan Tobon', time: '1:09.85', notes: '', id: 33691 },
                { rank: 7, name: 'Tanner Worley', time: '1:09.94', notes: '', id: 68936 },
                { rank: 8, name: 'Max Weber', time: '1:10.30', notes: 'PR', id: 68937 },
                { rank: 9, name: 'Auggie Herman', time: '1:10.48', notes: 'PR', id: 60854 },
                { rank: 10, name: 'Casey Dawson', time: '1:10.57', notes: '', id: 52314 }
            ]
        },
        '1500m': {
            note: null,
            skaters: [
                { rank: 1, name: 'Jordan Stolz', time: '1:40.48', notes: 'NR PR', id: 66105 },
                { rank: 2, name: 'Emery Lehman', time: '1:43.26', notes: 'PR', id: 33693 },
                { rank: 3, name: 'Casey Dawson', time: '1:43.50', notes: '', id: 52314 },
                { rank: 4, name: 'Ethan Cepuran', time: '1:44.24', notes: 'PR', id: 52315 },
                { rank: 5, name: 'Conor McDermott-Mostowy', time: '1:44.43', notes: 'PR', id: 52311 },
                { rank: 6, name: 'Cooper McLeod', time: '1:44.88', notes: 'PR', id: 68932 },
                { rank: 7, name: 'Zach Stoppelmoor', time: '1:44.98', notes: 'PR', id: 68933 },
                { rank: 8, name: 'Jonathan Tobon', time: '1:46.46', notes: '', id: 33691 },
                { rank: 9, name: 'Max Weber', time: '1:46.55', notes: 'PR', id: 68937 },
                { rank: 10, name: 'Auggie Herman', time: '1:46.58', notes: 'PR', id: 60854 }
            ]
        },
        '5000m': {
            note: null,
            skaters: [
                { rank: 1, name: 'Casey Dawson', time: '6:01.84', notes: 'NR PR', id: 52314 },
                { rank: 2, name: 'Ethan Cepuran', time: '6:12.56', notes: '', id: 52315 },
                { rank: 3, name: 'Kelin Dunfee', time: '6:33.64', notes: '', id: 43657 },
                { rank: 4, name: 'William Silk', time: '6:37.57', notes: 'PR', id: 60855 },
                { rank: 5, name: 'Jonathan Tobon', time: '6:43.40', notes: '', id: 33691 },
                { rank: 6, name: 'Herb Harbison', time: '6:44.06', notes: 'PR', id: 60856 },
                { rank: 7, name: 'Thomas Fitzgerald', time: '6:47.51', notes: '', id: 60857 },
                { rank: 8, name: 'Samuel Hart-Gorman', time: '6:56.65', notes: 'SB', id: 72647 }
            ]
        },
        '10000m': {
            note: 'Not contested at Olympic Trials. Selected from World Cup Results.',
            skaters: []
        },
        'team_pursuit': {
            note: null,
            skaters: [
                { rank: 1, name: 'Ethan Cepuran', time: '3:32.49', notes: 'WR NR PR', id: 52315 },
                { rank: 2, name: 'Casey Dawson', time: '3:32.49', notes: 'WR NR PR', id: 52314 },
                { rank: 3, name: 'Emery Lehman', time: '3:32.49', notes: 'WR NR PR', id: 33693 },
                { rank: 4, name: 'Conor McDermott-Mostowy', time: '-', notes: 'TP Specialist', id: 52311 }
            ]
        }
    }
};
