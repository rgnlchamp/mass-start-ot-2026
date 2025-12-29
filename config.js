
// Configuration for Olympic Trials & Selection
// Updated with verified SOQC Ranks and Reduction Rules

const OLYMPIC_CONFIG = {
    TEAM_CAP: {
        men: 8,
        women: 6 // Verified from user image
    },
    // Converted Ranks for TP Specialists based on World Cup Rank
    // US Men are WC Rank 1 -> Converted Rank 1 (Protected)
    // US Women are WC Rank 3 -> Converted Rank 1 (Protected)
    TP_CONVERSION: {
        men: 1,
        women: 1
    },
    men: {
        '500m': {
            quota: 3,
            preNominated: ['Jordan Stolz'],
            soqcRanks: [1, 10, 25], // Rank for: Spot 1, Spot 2, Spot 3
            trialsSpots: 2
        },
        '1000m': {
            quota: 3,
            preNominated: ['Jordan Stolz'],
            soqcRanks: [1, 7, 9],
            trialsSpots: 2
        },
        '1500m': {
            quota: 3,
            preNominated: ['Jordan Stolz'],
            soqcRanks: [1, 22, 24],
            trialsSpots: 2
        },
        '5000m': {
            quota: 1,
            preNominated: [],
            soqcRanks: [4],
            trialsSpots: 1
        },
        '10000m': {
            quota: 1,
            // Casey is nominated but subject to reduction rank of 4 (10k SOQC)
            preNominated: ['Casey Dawson'],
            soqcRanks: [4],
            trialsSpots: 0,
            note: "Special Nomination (WC Results)"
        },
        'mass_start': {
            quota: 2,
            preNominated: ['Jordan Stolz'],
            soqcRanks: [5, 16],
            trialsSpots: 1,
            isMassStartPoints: true
        },
        // TP is discretionary, but we need to track it for "Specialists"
        'team_pursuit': {
            quota: 1,
            preNominated: [],
            soqcRanks: [1], // US Men Rank 1
            trialsSpots: 2, // Up to 2 specialists can be named logic-wise
            isDiscretionary: true
        }
    },
    women: {
        '500m': {
            quota: 2,
            preNominated: ['Erin Jackson'],
            soqcRanks: [3, 26],
            trialsSpots: 1
        },
        '1000m': {
            quota: 2,
            preNominated: [],
            soqcRanks: [3, 14],
            trialsSpots: 2
        },
        '1500m': {
            quota: 2,
            preNominated: [],
            soqcRanks: [5, 18],
            trialsSpots: 2
        },
        '3000m': {
            quota: 0,
            preNominated: [],
            soqcRanks: [],
            trialsSpots: 0
        },
        '5000m': {
            quota: 0,
            preNominated: [],
            soqcRanks: [],
            trialsSpots: 0
        },
        'mass_start': {
            quota: 2,
            preNominated: ['Mia Manganello'],
            soqcRanks: [1, 15],
            trialsSpots: 1,
            isMassStartPoints: true
        },
        'team_pursuit': {
            quota: 1,
            preNominated: [],
            soqcRanks: [3], // US Women Rank 3
            trialsSpots: 2,
            isDiscretionary: true
        }
    }
};
