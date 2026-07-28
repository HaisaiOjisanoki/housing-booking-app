const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Auto-generate the public directory and dashboard files at runtime
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const superadminHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing - Superadmin Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container mt-5">
        <div class="card shadow p-4">
            <h1 class="text-primary mb-3">Unaccompanied Housing Superadmin Dashboard</h1>
            <p class="text-muted">Server is running and operational on Render.</p>
            <hr>
            <div id="status-panel">
                <span class="badge bg-success">Online & Synced</span>
            </div>
        </div>
    </div>
</body>
</html>`;

const staffHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unaccompanied Housing - Staff Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
    <div class="container mt-5">
        <div class="card shadow p-4">
            <h1 class="text-success mb-3">Unaccompanied Housing Staff Dashboard</h1>
            <p class="text-muted">Staff portal active.</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'superadmin_dashboard.html'), superadminHtml);
fs.writeFileSync(path.join(publicDir, 'staff_dashboard.html'), staffHtml);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    bookings: [],
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

// API Endpoints
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

// Routes
app.get('/superadmin', (req, res) => {
    res.sendFile(path.join(publicDir, 'superadmin_dashboard.html'));
});

app.get('/staff', (req, res) => {
    res.sendFile(path.join(publicDir, 'staff_dashboard.html'));
});

app.get('/logout', (req, res) => {
    res.redirect('/');
});

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'superadmin_dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Unaccompanied Housing Dashboard server running on port ${PORT}`);
});