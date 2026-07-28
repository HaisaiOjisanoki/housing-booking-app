const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory State Architecture for Render and local runtime
let appState = {
    camps: ["Camp Hansen", "Camp Schwab", "Camp Foster", "McNair", "Courtney"],
    camp_buildings: {
        "Camp Hansen": ["5701", "5702", "5703"],
        "Camp Schwab": ["301", "302"],
        "Camp Foster": ["5601", "5602"],
        "McNair": ["101", "102"],
        "Courtney": ["401", "402"]
    },
    purposes: [
        "Check-in / In-processing",
        "Check-out / Out-processing",
        "Room Inspection",
        "Maintenance Request",
        "Administrative Support"
    ],
    bookings: [
        {
            confirmationCode: "UH-9941",
            firstName: "John",
            lastName: "Doe",
            branch: "USMC",
            camp: "Camp Hansen",
            building: "5701",
            date: "2026-07-28",
            time: "10:00",
            purpose: "Check-in / In-processing",
            status: "Confirmed",
            email: "john.doe@usmc.mil",
            staffNotes: ""
        }
    ],
    staff_users: [
        {
            username: "superadmin",
            password: "password123",
            role: "superadmin",
            camp: "ALL",
            buildings: [],
            recovery_email: "superadmin@usmc.mil"
        },
        {
            username: "hansen_admin",
            password: "password123",
            role: "camp_admin",
            camp: "Camp Hansen",
            buildings: ["5701", "5702", "5703"],
            recovery_email: "hansen_admin@usmc.mil"
        },
        {
            username: "manager_5701",
            password: "password123",
            role: "staff",
            camp: "Camp Hansen",
            buildings: ["5701"],
            recovery_email: "mgr5701@usmc.mil"
        }
    ]
};

// API Endpoints for State Synchronization
app.get('/api/state', (req, res) => {
    res.json(appState);
});

app.post('/api/state', (req, res) => {
    if (req.body && typeof req.body === 'object') {
        appState = req.body;
        return res.json({ success: true, message: "State updated successfully" });
    }
    res.status(400).json({ success: false, error: "Invalid state payload" });
});

// Route for Superadmin Dashboard
app.get('/superadmin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'superadmin_dashboard.html'));
});

// Route for Staff / Camp Admin Dashboard
app.get('/staff', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff_dashboard.html'));
});

// Logout endpoint redirect
app.get('/logout', (req, res) => {
    res.redirect('/');
});

// Default fallback route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'superadmin_dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Unaccompanied Housing Dashboard server running on port ${PORT}`);
});