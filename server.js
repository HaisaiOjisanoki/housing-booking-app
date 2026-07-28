const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Default Master State
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
    bookings: []
};

// Load state from disk if available, otherwise use defaults
let appState = defaultState;
if (fs.existsSync(DATA_FILE)) {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        appState = JSON.parse(fileData);
    } catch (err) {
        console.error("Error reading data.json, falling back to defaults:", err);
    }
}

// Helper to save state to disk
function saveStateToDisk() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(appState, null, 2), 'utf8');
    } catch (err) {
        console.error("Error writing data.json:", err);
    }
}

app.get('/api/state', (req, res) => {
    res.json(appState);
});

app.post('/api/state', (req, res) => {
    const newState = req.body;
    if (newState) {
        appState = newState;
        saveStateToDisk();
        return res.json({ success: true, appState });
    }
    res.status(400).json({ success: false, message: "Invalid payload." });
});

app.listen(PORT, () => {
    console.log(`Housing Portal running on port ${PORT}`);
});