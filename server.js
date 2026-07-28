const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory State Architecture (Optimized for Cloud Deployment)
let appState = {
    camps: [
        { 
            id: 'foster', 
            name: 'Camp Foster', 
            buildings: ['Building 5700 - Barracks A', 'Building 5701 - Barracks B'] 
        },
        { 
            id: 'courtney', 
            name: 'Camp Courtney', 
            buildings: ['Building 4300 - Barracks 1', 'Building 4301 - Barracks 2'] 
        },
        { 
            id: 'kadena', 
            name: 'Kadena Air Base', 
            buildings: ['Building 100 - Dorm 1', 'Building 101 - Dorm 2'] 
        }
    ],
    appointments: [],
    staff: [
        { username: 'superadmin', password: 'securepassword123', role: 'superadmin', camp: 'All' },
        { username: 'foster_mgr', password: 'securepassword123', role: 'manager', camp: 'Camp Foster' }
    ]
};

// API: Get Application State
app.get('/api/state', (req, res) => {
    res.json(appState);
});

// API: Staff Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = appState.staff.find(s => s.username === username && s.password === password);
    
    if (user) {
        res.json({ success: true, user: { username: user.username, role: user.role, camp: user.camp } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// API: Create Appointment (Public Booking)
app.post('/api/appointments', (req, res) => {
    const { serviceMemberName, rank, contact, camp, building, date, timeSlot } = req.body;
    
    if (!serviceMemberName || !camp || !building || !date) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newAppointment = {
        id: 'APT-' + Date.now().toString().slice(-6),
        serviceMemberName,
        rank: rank || 'E-1 to E-4',
        contact,
        camp,
        building,
        date,
        timeSlot: timeSlot || '09:00 - 11:00',
        status: 'Pending',
        createdAt: new Date().toISOString()
    };

    appState.appointments.push(newAppointment);
    res.json({ success: true, appointment: newAppointment });
});

// API: Update Appointment Status (Staff/Admin)
app.patch('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = appState.appointments.find(a => a.id === id);
    if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (status) {
        appointment.status = status;
    }

    res.json({ success: true, appointment });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});