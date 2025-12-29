# 2026 U.S. Olympic Trials Tracker

A web-based application for managing and scoring Mass Start Speedskating races for the U.S. Olympic Team Trials.

## Features

*   **Official Scoring Rules**: Implements the ISU Mass Start scoring system (60-40-20-10-6-3 for final sprints, 3-2-1 for intermediate sprints).
*   **Ranking Logic**: 
    *   Prioritizes Total Race Points.
    *   Tiebreaker: Finish Position.
*   **Combined Standings**: Aggregates points across multiple races with automatic tiebreaking based on the *most recent race result*.
*   **Olympic Selection**: Calculates "Best 3 of 4" scores (with drops) and applies Olympic selection tiebreakers.
*   **Preloaded Data**: Includes verified results for Women's Races 1 & 2 and Men's Races 1 & 2.

## How to Run

1.  Open a terminal in this directory.
2.  Run the following command to start a local server:
    ```bash
    npx -y serve .
    ```
3.  Open the provided URL (usually `http://localhost:3000`) in your browser.

## Data Management

*   **Preloaded Data**: The file `preload_data.js` contains the hardcoded official results. You can edit this file to correct past results.
*   **Live Entry**: Use the "Race Entry" tab in the application to add results for Race 3 and Race 4.
*   **Export**: Use the "Export Data" button in the Settings/Data tab to save your current work to a JSON file.

## Recent Updates

*   Updated Scoring Scale to 60-point system.
*   Corrected Finish Orders for Men's Race 1 & 2.
*   Implemented "Most Recent Race" tiebreaker for Overall Rankings.
