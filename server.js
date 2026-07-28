const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// In-Memory State Architecture
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

// Safe Route Handler: Serves real files if they exist, otherwise shows emergency notice
app.get('/superadmin', (req, res) => {
    const targetFile = path.join(publicDir, 'superadmin_dashboard.html');
    if (fs.existsSync(targetFile)) {
        res.sendFile(targetFile);
    } else {
        res.status(404).send("superadmin_dashboard.html not found in public folder.");
    }
});

app.get('/staff', (req, res) => {
    const targetFile = path.join(publicDir, 'staff_dashboard.html');
    if (fs.existsSync(targetFile)) {
        res.sendFile(targetFile);
    } else {
        res.status(404).send("staff_dashboard.html not found in public folder.");
    }
});

app.get('/logout', (req, res) => {
    res.redirect('/');
});

app.get('/', (req, res) => {
    const targetFile = path.join(publicDir, 'superadmin_dashboard.html');
    if (fs.existsSync(targetFile)) {
        res.sendFile(targetFile);
    } else {
        res.sendFile(path.join(publicDir, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Unaccompanied Housing Dashboard server running on port ${PORT}`);
});