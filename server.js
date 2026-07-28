const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default initial state
const defaultState = {
    camps: ["Camp Hansen", "Camp Schwab", "Camp Foster", "MCAS Futenma"],
    camp_buildings: {
        "Camp Hansen": ["1001", "1002", "1003"],
        "Camp Schwab": ["2001", "2002"],
        "Camp Foster": ["3001", "3002", "3003"],
        "MCAS Futenma": ["4001", "4002"]
    },
    purposes: [
        "Initial Check-in",
        "Final Check-out / Clearance",
        "Room Maintenance Request",
        "Housing Inquiry"
    ],
    staff_users: [
        { username: "superadmin", role: "superadmin", camp: "ALL", building: "ALL", name: "Master Superadmin" },
        { username: "hansen_admin", role: "camp_admin", camp: "Camp Hansen", building: "ALL", name: "Hansen Camp Admin" },
        { username: "schwab_admin", role: "camp_admin", camp: "Camp Schwab", building: "ALL", name: "Schwab Camp Admin" },
        { username: "mgr_1001", role: "building_manager", camp: "Camp Hansen", building: "1001", name: "Bldg 1001 Manager" },
        { username: "mgr_2001", role: "building_manager", camp: "Camp Schwab", building: "2001", name: "Bldg 2001 Manager" }
    ],
    bookings: [
        {
            id: 1774828800000,
            confirmationCode: "HSG-849201",
            firstName: "Marcus",
            lastName: "Vance",
            email: "marcus.vance@usmc.mil",
            branch: "USMC",
            camp: "Camp Hansen",
            building: "1001",
            purpose: "Initial Check-in",
            date: "2026-04-10",
            time: "09:00",
            status: "Pending"
        }
    ]
};

// Load state from data.json if it exists, otherwise create it using defaultState
let appState = defaultState;
if (fs.existsSync(DATA_FILE)) {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        appState = JSON.parse(fileData);
    } catch (err) {
        console.error("Error reading data.json, using defaults:", err);
    }
} else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState, null, 2));
}

// Helper function to save state to data.json
function saveState() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(appState, null, 2));
    } catch (err) {
        console.error("Error saving data.json:", err);
    }
}

// API: Get synchronized state
app.get('/api/state', (req, res) => {
    res.json(appState);
});

// API: Update synchronized state and save to file
app.post('/api/state', (req, res) => {
    const newState = req.body;
    if (newState && newState.camps && newState.camp_buildings && newState.bookings) {
        appState = newState;
        saveState();
        return res.json({ success: true, message: "State synchronized and saved successfully." });
    }
    res.status(400).json({ success: false, message: "Invalid payload." });
});

app.listen(PORT, () => {
    console.log(`Housing Portal running on http://localhost:${PORT}`);
});