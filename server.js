const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Flexible route for Staff Login page (checks multiple common filenames)
app.get('/login', (req, res) => {
    const possibleFiles = ['login.html', 'staff.html', 'admin.html'];
    for (let file of possibleFiles) {
        const filePath = path.join(__dirname, 'public', file);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    res.status(404).send('Staff login page is missing from the public folder.');
});

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
    availability: {
        start: "08:00",
        end: "17:00",
        lunchStart: "12:00",
        lunchEnd: "13:00",
        publicBlockedCategory: "",
        blockedStartTime: "",
        blockedEndTime: ""
    },
    staff_users: [
        { username: "superadmin", role: "superadmin", camp: "ALL", building: "ALL", name: "Master Superadmin" },
        { username: "hansen_admin", role: "camp_admin", camp: "Camp Hansen", building: "ALL", name: "Hansen Camp Admin" }
    ],
    bookings: []
};

let appState = defaultState;
if (fs.existsSync(DATA_FILE)) {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        const savedState = JSON.parse(fileData);
        appState = {
            ...defaultState,
            ...savedState,
            camps: (savedState.camps && savedState.camps.length > 0) ? savedState.camps : defaultState.camps,
            camp_buildings: { ...defaultState.camp_buildings, ...(savedState.camp_buildings || {}) }
        };
    } catch (err) {
        console.error("Error reading data.json, falling back to defaults:", err);
    }
}

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