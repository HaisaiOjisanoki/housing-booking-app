const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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

let appState = JSON.parse(JSON.stringify(defaultState));

// Load and robustly merge saved state with defaults
if (fs.existsSync(DATA_FILE)) {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        const savedState = JSON.parse(fileData);
        
        // Ensure camps always include defaults
        if (savedState && Array.isArray(savedState.camps)) {
            defaultState.camps.forEach(c => {
                if (!savedState.camps.includes(c)) savedState.camps.push(c);
            });
            appState.camps = savedState.camps;
        }

        // Ensure camp_buildings always include defaults
        if (savedState && savedState.camp_buildings && typeof savedState.camp_buildings === 'object') {
            Object.keys(defaultState.camp_buildings).forEach(camp => {
                if (!savedState.camp_buildings[camp] || !Array.isArray(savedState.camp_buildings[camp]) || savedState.camp_buildings[camp].length === 0) {
                    savedState.camp_buildings[camp] = defaultState.camp_buildings[camp];
                }
            });
            appState.camp_buildings = savedState.camp_buildings;
        }

        if (savedState && Array.isArray(savedState.purposes) && savedState.purposes.length > 0) {
            appState.purposes = savedState.purposes;
        }
        if (savedState && Array.isArray(savedState.staff_users) && savedState.staff_users.length > 0) {
            appState.staff_users = savedState.staff_users;
        }
        if (savedState && Array.isArray(savedState.bookings)) {
            appState.bookings = savedState.bookings;
        }
    } catch (err) {
        console.error("Error reading data.json, using defaults:", err);
    }
} else {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState, null, 2));
    } catch (e) {
        console.error("Could not write initial data.json:", e);
    }
}

function saveState() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(appState, null, 2));
    } catch (err) {
        console.error("Error saving data.json:", err);
    }
}

app.get('/api/state', (req, res) => {
    res.json(appState);
});

app.post('/api/state', (req, res) => {
    const newState = req.body;
    if (newState) {
        if (Array.isArray(newState.camps) && newState.camps.length > 0) {
            appState.camps = newState.camps;
        }
        if (newState.camp_buildings && typeof newState.camp_buildings === 'object') {
            appState.camp_buildings = newState.camp_buildings;
        }
        if (Array.isArray(newState.purposes) && newState.purposes.length > 0) {
            appState.purposes = newState.purposes;
        }
        if (Array.isArray(newState.staff_users) && newState.staff_users.length > 0) {
            appState.staff_users = newState.staff_users;
        }
        if (Array.isArray(newState.bookings)) {
            appState.bookings = newState.bookings;
        }
        saveState();
        return res.json({ success: true, appState });
    }
    res.status(400).json({ success: false, message: "Invalid payload." });
});

app.listen(PORT, () => {
    console.log(`Housing Portal running on port ${PORT}`);
});