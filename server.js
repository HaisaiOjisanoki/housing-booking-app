const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to load application state
function loadState() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (e) {
            console.error("Error reading data file:", e);
        }
    }
    // Default initial mock state if no data.json exists yet
    return {
        camps: ["Camp Hansen", "Camp Schwab", "Camp Foster", "MCAS Futenma"],
        camp_buildings: {
            "Camp Hansen": ["5701", "5702", "5703"],
            "Camp Schwab": ["3301", "3302"],
            "Camp Foster": ["5601", "5602"],
            "MCAS Futenma": ["1101", "1102"]
        },
        bookings: [],
        staff_users: [
            { username: "superadmin", password: "password123", role: "superadmin", camp: "", buildings: [] },
            { username: "hansen_admin", password: "password123", role: "camp_admin", camp: "Camp Hansen", buildings: ["5701", "5702", "5703"] }
        ],
        purposes: ['Check-in / In-processing', 'Out-processing', 'Room Inspection', 'Maintenance Request']
    };
}

// Helper to save application state
function saveState(state) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// API endpoint to get state
app.get('/api/state', (req, res) => {
    const state = loadState();
    res.json(state);
});

// API endpoint to save state changes
app.post('/api/state', (req, res) => {
    try {
        saveState(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback to index.html for frontend routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});