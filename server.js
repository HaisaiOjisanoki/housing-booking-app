const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

<<<<<<< HEAD
// Robust In-Memory State for Cloud Execution
=======
// Master In-Memory State for Render Cloud Deployment
>>>>>>> 312a167190675a00a5c825a99f825fd1421e36bd
let appState = {
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
        if (Array.isArray(newState.staff_users)) {
            appState.staff_users = newState.staff_users;
        }
        if (Array.isArray(newState.bookings)) {
            appState.bookings = newState.bookings;
        }
        return res.json({ success: true, appState });
    }
    res.status(400).json({ success: false, message: "Invalid payload." });
});

app.listen(PORT, () => {
<<<<<<< HEAD
    console.log(`Housing Portal running on port ${PORT}`);
=======
    console.log(`Housing Portal running on port ${PORT} (Cloud In-Memory Mode)`);
>>>>>>> 312a167190675a00a5c825a99f825fd1421e36bd
});