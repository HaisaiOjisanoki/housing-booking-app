const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. PUBLIC BOOKING PAGE (index.html)
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schedule Unaccompanied Housing Appointment</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background-color: #f4f6f9; }
        .card { border: none; border-radius: 0.5rem; }
    </style>
</head>
<body onload="initBookingPage()">

    <nav class="navbar navbar-dark bg-dark shadow-sm">
        <div class="container px-4">
            <span class="navbar-brand fw-bold">
                <i class="bi bi-building me-2"></i>Unaccompanied Housing Portal
            </span>
            <div>
                <a href="/login" class="btn btn-outline-light btn-sm fw-bold">
                    <i class="bi bi-shield-lock me-1"></i> Staff Login
                </a>
            </div>
        </div>
    </nav>

    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card shadow-sm p-4 bg-white">
                    <div class="text-center mb-4">
                        <i class="bi bi-calendar-plus fs-1 text-primary"></i>
                        <h3 class="fw-bold mt-2">Schedule Appointment</h3>
                        <p class="text-muted small">Select your camp, building, and appointment time</p>
                    </div>

                    <div id="successAlert" class="alert alert-success d-none" role="alert">
                        <h5 class="fw-bold mb-1"><i class="bi bi-check-circle-fill me-2"></i>Appointment Booked!</h5>
                        <p class="mb-1 small">Your confirmation code is: <strong id="displayCode" class="fs-5 text-dark"></strong></p>
                        <p class="mb-0 text-muted small">Please save this code to reference your appointment.</p>
                        <button class="btn btn-sm btn-outline-success mt-3 w-100 fw-bold" onclick="resetForm()">Book Another Appointment</button>
                    </div>

                    <form id="bookingForm" onsubmit="submitBooking(event)">
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">First Name *</label>
                                <input type="text" id="firstName" class="form-control" required placeholder="John">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Last Name *</label>
                                <input type="text" id="lastName" class="form-control" required placeholder="Doe">
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold">Email Address *</label>
                            <input type="email" id="email" class="form-control" required placeholder="john.doe@mil.mil">
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Branch of Service *</label>
                                <select id="branch" class="form-select" required>
                                    <option value="">-- Select Branch --</option>
                                    <option value="USMC">USMC</option>
                                    <option value="USA">USA</option>
                                    <option value="USN">USN</option>
                                    <option value="USAF">USAF</option>
                                    <option value="USCG">USCG</option>
                                    <option value="USSF">USSF</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Camp Location *</label>
                                <select id="campSelect" class="form-select" required onchange="updateBuildings()">
                                    <option value="">-- Select Camp --</option>
                                </select>
                            </div>
                        </div>

                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Building Number *</label>
                                <select id="buildingSelect" class="form-select" required onchange="fetchAvailableSlots()">
                                    <option value="">-- Select Building --</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Purpose of Visit *</label>
                                <select id="purposeSelect" class="form-select" required>
                                    <option value="">-- Select Purpose --</option>
                                </select>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Appointment Date *</label>
                                <input type="date" id="apptDate" class="form-control" required onchange="fetchAvailableSlots()">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small fw-bold">Appointment Time *</label>
                                <select id="apptTime" class="form-select" required>
                                    <option value="">-- Select Time Slot --</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary w-100 fw-bold py-2">
                            <i class="bi bi-calendar-check me-1"></i> Submit Booking
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let appState = {};

        async function initBookingPage() {
            try {
                const res = await fetch('/api/state');
                appState = await res.json();
                
                const campSelect = document.getElementById('campSelect');
                campSelect.innerHTML = '<option value="">-- Select Camp --</option>';
                (appState.camps || []).forEach(c => {
                    campSelect.innerHTML += \`<option value="\${c}">\${c}</option>\`;
                });

                const purposeSelect = document.getElementById('purposeSelect');
                purposeSelect.innerHTML = '<option value="">-- Select Purpose --</option>';
                (appState.purposes || []).forEach(p => {
                    purposeSelect.innerHTML += \`<option value="\${p}">\${p}</option>\`;
                });
            } catch (err) {
                console.error("Error loading state:", err);
            }
        }

        function updateBuildings() {
            const camp = document.getElementById('campSelect').value;
            const buildingSelect = document.getElementById('buildingSelect');
            buildingSelect.innerHTML = '<option value="">-- Select Building --</option>';

            if (!camp || !appState.camp_buildings || !appState.camp_buildings[camp]) return;

            appState.camp_buildings[camp].forEach(b => {
                buildingSelect.innerHTML += \`<option value="\${b}">Bldg \${b}</option>\`;
            });
            fetchAvailableSlots();
        }

        async function fetchAvailableSlots() {
            const camp = document.getElementById('campSelect').value;
            const building = document.getElementById('buildingSelect').value;
            const date = document.getElementById('apptDate').value;
            const timeSelect = document.getElementById('apptTime');

            timeSelect.innerHTML = '<option value="">-- Select Time Slot --</option>';
            if (!camp || !building || !date) return;

            try {
                const res = await fetch(\`/api/booking-slots?camp=\${encodeURIComponent(camp)}&building=\${encodeURIComponent(building)}&date=\${date}\`);
                const data = await res.json();
                if (data.availableSlots && data.availableSlots.length > 0) {
                    data.availableSlots.forEach(slot => {
                        timeSelect.innerHTML += \`<option value="\${slot.startTime}">\${slot.startTime} - \${slot.endTime}</option>\`;
                    });
                } else {
                    timeSelect.innerHTML = '<option value="">No available slots for this date</option>';
                }
            } catch (err) {
                console.error("Error fetching slots:", err);
            }
        }

        async function submitBooking(e) {
            e.preventDefault();
            const bookingData = {
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                email: document.getElementById('email').value.trim(),
                branch: document.getElementById('branch').value,
                camp: document.getElementById('campSelect').value,
                building: document.getElementById('buildingSelect').value,
                purpose: document.getElementById('purposeSelect').value,
                date: document.getElementById('apptDate').value,
                time: document.getElementById('apptTime').value
            };

            try {
                const res = await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });
                const data = await res.json();
                if (data.status === 'success') {
                    document.getElementById('bookingForm').classList.add('d-none');
                    document.getElementById('displayCode').textContent = data.confirmationCode;
                    document.getElementById('successAlert').classList.remove('d-none');
                } else {
                    alert(data.error || 'Error creating booking. Please try again.');
                }
            } catch (err) {
                console.error("Error submitting booking:", err);
                alert('Connection error. Please try again.');
            }
        }

        function resetForm() {
            document.getElementById('bookingForm').reset();
            document.getElementById('buildingSelect').innerHTML = '<option value="">-- Select Building --</option>';
            document.getElementById('apptTime').innerHTML = '<option value="">-- Select Time Slot --</option>';
            document.getElementById('successAlert').classList.add('d-none');
            document.getElementById('bookingForm').classList.remove('d-none');
        }
    </script>
</body>
</html>`;

// 2. STAFF LOGIN PAGE (login.html)
const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Login - UH Management</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>body { background-color: #f4f6f9; }</style>
</head>
<body class="d-flex align-items-center py-4 bg-light" style="height: 100vh;">
    <main class="form-signin w-100 m-auto" style="max-width: 400px;">
        <div class="card shadow-sm p-4 bg-white">
            <div class="text-center mb-4">
                <i class="bi bi-shield-lock fs-1 text-primary"></i>
                <h3 class="h3 mb-3 fw-bold">Staff Login</h3>
                <p class="text-muted small">Sign in to manage camp appointments</p>
            </div>
            <form onsubmit="handleLogin(event)">
                <div class="mb-3">
                    <label class="form-label small fw-bold">Username</label>
                    <input type="text" id="loginUser" class="form-control" required placeholder="Enter username">
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold">Password</label>
                    <input type="password" id="loginPass" class="form-control" required placeholder="Password">
                </div>
                <button type="submit" class="btn btn-primary w-100 fw-bold py-2">Sign In</button>
            </form>
            <div class="text-center mt-3">
                <a href="/" class="small text-decoration-none"><i class="bi bi-arrow-left me-1"></i>Back to Booking Portal</a>
            </div>
        </div>
    </main>
    <script>
        async function handleLogin(e) {
            e.preventDefault();
            const username = document.getElementById('loginUser').value.trim();
            const password = document.getElementById('loginPass').value.trim();

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = '/dashboard';
            } else {
                alert(data.message || 'Invalid username or password.');
            }
        }
    </script>
</body>
</html>`;

// 3. STAFF MANAGEMENT DASHBOARD (staff_dashboard.html)
const staffHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UH Management Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background-color: #f4f6f9; }
        .card { border: none; border-radius: 0.5rem; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
        .calendar-day-header { text-align: center; font-weight: bold; background: #e9ecef; padding: 8px; border-radius: 4px; font-size: 0.85rem; }
        .calendar-cell { min-height: 110px; background: #fff; border: 1px solid #dee2e6; border-radius: 4px; padding: 6px; font-size: 0.8rem; overflow-y: auto; }
        .calendar-cell.other-month { background: #f8f9fa; color: #adb5bd; }
        .booking-badge { font-size: 0.7rem; padding: 2px 5px; border-radius: 3px; margin-bottom: 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
        .booking-badge:hover { opacity: 0.85; }
    </style>
</head>
<body onload="initStaffDashboard()">

    <nav class="navbar navbar-dark bg-dark shadow-sm">
        <div class="container-fluid px-4">
            <span class="navbar-brand fw-bold">
                <i class="bi bi-building me-2"></i>UH Management Dashboard — <span class="text-info" id="navCampInfo">Loading...</span>
            </span>
            <div class="d-flex align-items-center">
                <span class="text-light me-3 small" id="navUserInfo"></span>
                <a href="/logout" class="btn btn-outline-light btn-sm">
                    <i class="bi bi-box-arrow-right me-1"></i>Sign Out
                </a>
            </div>
        </div>
    </nav>

    <div class="container py-4">
        
        <!-- AVAILABILITY RULES CONFIGURATION SECTION -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card shadow-sm p-4 bg-white border border-primary">
                    <h5 class="fw-bold mb-3 text-primary"><i class="bi bi-clock-history me-2"></i>Configure Availability Rules & Slot Duration</h5>
                    <form onsubmit="saveAvailabilityRule(event)" class="row g-3">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">Camp</label>
                            <select id="ruleCamp" class="form-select form-select-sm" required onchange="updateRuleBuildings()">
                                <option value="">-- Select Camp --</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">Building</label>
                            <select id="ruleBuilding" class="form-select form-select-sm" required>
                                <option value="">-- Select Building --</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">Slot Duration (Min)</label>
                            <input type="number" id="ruleDuration" class="form-control form-control-sm" value="30" min="10" max="120" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">Specific Date (Optional)</label>
                            <input type="date" id="ruleSpecificDate" class="form-control form-control-sm">
                        </div>
                        <div class="col-md-12">
                            <label class="form-label small fw-bold">Days of the Week (Select applicable days)</label>
                            <div class="d-flex flex-wrap gap-3 border p-2 bg-white rounded">
                                <div class="form-check"><input class="form-check-input rule-day-chk" type="checkbox" value="0" id="day_sun"><label class="form-check-label small" for="day_sun">Sun</label></div>
                                <div class="form-check"><input class="form-check-input rule-day-chk" type="checkbox" value="1" id="day_mon"><label class="form-check-label small" for="day_mon">Mon</label></div>
                                <div class="form-check"><input class="form-check-input rule-day-chk" type="checkbox" value="2" id="day_tue"><label class="form-check-label small" for="day_tue">Tue</label></div>
                                <div class="form-check"><input class="form-check-input rule-day-chk" type="checkbox" value="3" id="day_wed"><label class="form-check-label small" for="day_wed">Wed</label></div>
                                <div class="form-check"><input class="form-check-input rule-day-chk" type="checkbox" value="4" id="day_thu"><label class="form-check-label small" for="day_thu">Thu</label></div>
                                <div class="form-check"><input class="form-check-input rule-day-chk" type="checkbox" value="5" id="day_fri"><label class="form-check-label small" for="day_fri">Fri</label></div>
                                <div class="form-check"><input class="form-check-input rule-day-chk" type="checkbox" value="6" id="day_sat"><label class="form-check-label small" for="day_sat">Sat</label></div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">Start Time</label>
                            <input type="time" id="ruleStartTime" class="form-control form-control-sm" value="08:00" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">End Time</label>
                            <input type="time" id="ruleEndTime" class="form-control form-control-sm" value="16:00" required>
                        </div>
                        <div class="col-md-4 d-flex align-items-end">
                            <button type="submit" class="btn btn-primary btn-sm fw-bold w-100"><i class="bi bi-plus-circle me-1"></i> Add Availability Rule</button>
                        </div>
                    </form>
                    <div class="mt-3">
                        <h6 class="fw-bold text-secondary small">Active Availability Rules:</h6>
                        <div id="availabilityRulesList" class="small text-muted">Loading rules...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- SUPERADMIN GLOBAL CONTROLS SECTION -->
        <div id="superAdminSection" class="row mb-4" style="display: none;">
            <div class="col-md-12">
                <div class="card shadow-sm p-4 bg-white border border-danger">
                    <h5 class="fw-bold mb-3 text-danger"><i class="bi bi-shield-fill-exclamation me-2"></i>Superadmin Master Controls</h5>
                    <div class="row g-4">
                        <div class="col-md-6">
                            <h6 class="fw-bold text-secondary">Manage Camp Locations</h6>
                            <div class="input-group mb-2">
                                <input type="text" id="superNewCampInput" class="form-control" placeholder="Camp Name">
                                <button class="btn btn-dark fw-bold" onclick="superAdminAddCamp()">Add Camp</button>
                            </div>
                            <div id="superCampsList" class="small text-muted mb-3 d-flex flex-wrap gap-1"></div>

                            <h6 class="fw-bold text-secondary">Manage Buildings for Camp</h6>
                            <div class="mb-2">
                                <select id="superCampTargetSelect" class="form-select form-select-sm mb-2" onchange="superAdminUpdateCampBldgPreview()">
                                    <option value="">-- Select Camp --</option>
                                </select>
                                <div class="input-group mb-2">
                                    <input type="text" id="superNewBldgInput" class="form-control form-control-sm" placeholder="Building #">
                                    <button class="btn btn-success btn-sm fw-bold" onclick="superAdminAddBuilding()">Add Building</button>
                                </div>
                                <div id="superCampBldgsList" class="small text-muted mb-3"></div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <h6 class="fw-bold text-secondary">Create System Staff User</h6>
                            <form onsubmit="superAdminCreateUser(event)" class="border p-3 rounded bg-light">
                                <div class="row g-2 mb-2">
                                    <div class="col-6"><input type="text" id="saUsername" class="form-control form-control-sm" required placeholder="Username"></div>
                                    <div class="col-6"><input type="password" id="saPassword" class="form-control form-control-sm" required placeholder="Password"></div>
                                </div>
                                <div class="row g-2 mb-2">
                                    <div class="col-6">
                                        <select id="saRole" class="form-select form-select-sm" onchange="superAdminRoleChanged()">
                                            <option value="staff">UH Building Manager</option>
                                            <option value="camp_admin">Camp Admin</option>
                                            <option value="superadmin">Superadmin</option>
                                        </select>
                                    </div>
                                    <div class="col-6">
                                        <select id="saCamp" class="form-select form-select-sm" onchange="superAdminCampChanged()">
                                            <option value="">-- Select Camp --</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-2" id="saBuildingsContainer">
                                    <label class="form-label small fw-bold mb-1">Assigned Buildings:</label>
                                    <div id="saBuildingCheckboxes" class="d-flex flex-wrap gap-2 small border p-2 bg-white rounded" style="max-height: 90px; overflow-y: auto;"></div>
                                </div>
                                <button type="submit" class="btn btn-danger btn-sm fw-bold w-100">Create Staff Account</button>
                            </form>
                        </div>
                    </div>

                    <div class="mt-4">
                        <h6 class="fw-bold text-secondary">All System User Accounts</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-hover align-middle">
                                <thead class="table-light">
                                    <tr><th>Username</th><th>Role</th><th>Camp</th><th>Buildings</th><th class="text-end">Actions</th></tr>
                                </thead>
                                <tbody id="superAdminUsersTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4 align-items-center">
            <div class="col-md-6">
                <h4 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2"></i>Appointments Management</h4>
            </div>
            <div class="col-md-6 text-md-end mt-3 mt-md-0">
                <div class="btn-group shadow-sm" role="group">
                    <button type="button" class="btn btn-primary fw-bold" id="btnTableView" onclick="switchView('table')"><i class="bi bi-table me-1"></i> Table View</button>
                    <button type="button" class="btn btn-outline-primary fw-bold" id="btnCalendarView" onclick="switchView('calendar')"><i class="bi bi-calendar3 me-1"></i> Calendar View</button>
                </div>
            </div>
        </div>

        <div id="tableViewSection" class="card shadow-sm">
            <div class="card-body p-4">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Confirmation Code</th>
                                <th>Service Member</th>
                                <th>Branch</th>
                                <th>Bldg / Camp</th>
                                <th>Date & Time</th>
                                <th>Purpose</th>
                                <th class="text-end">Actions / Notes</th>
                            </tr>
                        </thead>
                        <tbody id="staffAppointmentsTable"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="calendarViewSection" class="card shadow-sm p-4 bg-white" style="display: none;">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="fw-bold mb-0"><i class="bi bi-calendar3 me-2"></i>Calendar View</h5>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-outline-secondary btn-sm fw-bold" onclick="changeMonth(-1)"><i class="bi bi-chevron-left"></i> Prev</button>
                    <span id="calendarMonthTitle" class="fw-bold fs-5 px-2">Month Year</span>
                    <button class="btn btn-outline-secondary btn-sm fw-bold" onclick="changeMonth(1)">Next <i class="bi bi-chevron-right"></i></button>
                </div>
            </div>
            <div class="calendar-grid mb-2">
                <div class="calendar-day-header">Sun</div>
                <div class="calendar-day-header">Mon</div>
                <div class="calendar-day-header">Tue</div>
                <div class="calendar-day-header">Wed</div>
                <div class="calendar-day-header">Thu</div>
                <div class="calendar-day-header">Fri</div>
                <div class="calendar-day-header">Sat</div>
            </div>
            <div id="calendarDaysGrid" class="calendar-grid"></div>
        </div>

    </div>

    <!-- Modal for Booking Actions -->
    <div class="modal fade" id="bookingActionModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-calendar-check me-2"></i>Manage Booking Confirmation</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="modalBookingIndex">
                    <div id="modalBookingDetails" class="mb-3 p-3 bg-light rounded small border"></div>
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-primary"><i class="bi bi-clock-history me-1"></i> Reschedule Appointment</label>
                        <div class="row g-2">
                            <div class="col-7"><input type="date" id="rescheduleDate" class="form-control form-control-sm"></div>
                            <div class="col-5"><input type="time" id="rescheduleTime" class="form-control form-control-sm"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer justify-content-between">
                    <div>
                        <button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="deleteBookingFromModal()"><i class="bi bi-trash me-1"></i> Delete</button>
                    </div>
                    <div>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary btn-sm fw-bold" onclick="rescheduleBookingFromModal()"><i class="bi bi-check2-circle me-1"></i> Save Reschedule</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let appState = {};
        let sessionUser = {};
        let staffCamp = "";
        let staffAssignedBuildings = [];
        let userRole = "";
        let currentCalendarDate = new Date();
        let activeBookingIndex = null;
        let availabilityRules = [];

        async function initStaffDashboard() {
            try {
                const sessionRes = await fetch('/api/session');
                sessionUser = await sessionRes.json();
                if (!sessionUser.username) {
                    window.location.href = '/login';
                    return;
                }

                staffCamp = sessionUser.camp;
                staffAssignedBuildings = sessionUser.buildings || [];
                userRole = sessionUser.role;

                let roleLabel = 'UH Building Manager';
                if (userRole === 'superadmin') roleLabel = 'Superadmin';
                else if (userRole === 'camp_admin') roleLabel = 'Camp Admin';

                document.getElementById('navCampInfo').innerHTML = \`\${staffCamp}\`;
                document.getElementById('navUserInfo').innerHTML = \`Logged in as: <strong>\${sessionUser.username}</strong> (\${roleLabel})\`;

                const res = await fetch('/api/state');
                appState = await res.json();
                availabilityRules = appState.availabilityRules || [];

                if (userRole === 'superadmin') {
                    document.getElementById('superAdminSection').style.display = 'block';
                    initSuperAdminPanel();
                }

                initRuleCampSelect();
                renderAvailabilityRulesList();
                renderStaffAppointments();
                renderCalendar();
            } catch (err) {
                console.error("Error loading session or state:", err);
            }
        }

        function initRuleCampSelect() {
            const ruleCamp = document.getElementById('ruleCamp');
            ruleCamp.innerHTML = '<option value="">-- Select Camp --</option>';
            const camps = userRole === 'superadmin' ? (appState.camps || []) : [staffCamp];
            camps.forEach(c => {
                ruleCamp.innerHTML += \`<option value="\${c}">\${c}</option>\`;
            });
            if (userRole !== 'superadmin') {
                ruleCamp.value = staffCamp;
                updateRuleBuildings();
            }
        }

        function updateRuleBuildings() {
            const camp = document.getElementById('ruleCamp').value;
            const bldgSelect = document.getElementById('ruleBuilding');
            bldgSelect.innerHTML = '<option value="">-- Select Building --</option>';
            if (!camp || !appState.camp_buildings || !appState.camp_buildings[camp]) return;

            let allowedBldgs = appState.camp_buildings[camp];
            if (userRole === 'staff') {
                allowedBldgs = allowedBldgs.filter(b => staffAssignedBuildings.includes(b));
            }
            allowedBldgs.forEach(b => {
                bldgSelect.innerHTML += \`<option value="\${b}">Bldg \${b}</option>\`;
            });
        }

        async function saveAvailabilityRule(e) {
            e.preventDefault();
            const checkedDays = Array.from(document.querySelectorAll('.rule-day-chk:checked')).map(chk => parseInt(chk.value, 10));
            const payload = {
                campId: document.getElementById('ruleCamp').value,
                buildingId: document.getElementById('ruleBuilding').value,
                daysOfWeek: checkedDays,
                specificDate: document.getElementById('ruleSpecificDate').value,
                startTime: document.getElementById('ruleStartTime').value,
                endTime: document.getElementById('ruleEndTime').value,
                slotDurationMinutes: document.getElementById('ruleDuration').value
            };

            try {
                const res = await fetch('/api/availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Availability rule created successfully!');
                    if (!appState.availabilityRules) appState.availabilityRules = [];
                    appState.availabilityRules.push(data);
                    availabilityRules = appState.availabilityRules;
                    renderAvailabilityRulesList();
                } else {
                    alert(data.error || 'Failed to create rule.');
                }
            } catch (err) {
                console.error("Error saving availability rule:", err);
            }
        }

        async function deleteAvailabilityRule(ruleId) {
            if (!confirm('Delete this availability rule?')) return;
            try {
                const res = await fetch(\`/api/availability/\${ruleId}\`, { method: 'DELETE' });
                if (res.ok) {
                    appState.availabilityRules = appState.availabilityRules.filter(r => r.id !== ruleId);
                    availabilityRules = appState.availabilityRules;
                    renderAvailabilityRulesList();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Failed to delete rule.');
                }
            } catch (err) {
                console.error("Error deleting rule:", err);
            }
        }

        function renderAvailabilityRulesList() {
            const container = document.getElementById('availabilityRulesList');
            const rules = appState.availabilityRules || [];
            if (rules.length === 0) {
                container.innerHTML = 'No availability rules configured.';
                return;
            }
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            let html = '<div class="list-group">';
            rules.forEach(r => {
                let dayStr = '';
                if (r.specificDate) {
                    dayStr = \`Date: \${r.specificDate}\`;
                } else if (Array.isArray(r.daysOfWeek) && r.daysOfWeek.length > 0) {
                    dayStr = \`Days: \${r.daysOfWeek.map(d => dayNames[d]).join(', ')}\`;
                } else if (r.dayOfWeek !== null && r.dayOfWeek !== undefined && r.dayOfWeek !== "") {
                    dayStr = \`Day: \${dayNames[r.dayOfWeek]}\`;
                } else {
                    dayStr = 'All Days';
                }
                html += \`<div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-1 px-2">
                    <span><strong>\${r.campId}</strong> Bldg \${r.buildingId} | \${dayStr} | \${r.startTime}-\${r.endTime} (\${r.slotDurationMinutes}m)</span>
                    <button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="deleteAvailabilityRule(\${r.id})">&times;</button>
                </div>\`;
            });
            html += '</div>';
            container.innerHTML = html;
        }

        function getEffectiveBuildings() {
            if (userRole === 'superadmin') {
                let all = [];
                Object.values(appState.camp_buildings || {}).forEach(arr => all.push(...arr));
                return all;
            } else if (userRole === 'camp_admin') {
                return (appState.camp_buildings && appState.camp_buildings[staffCamp]) ? appState.camp_buildings[staffCamp] : [];
            } else {
                return staffAssignedBuildings;
            }
        }

        function initSuperAdminPanel() {
            const campSelect = document.getElementById('superCampTargetSelect');
            campSelect.innerHTML = '<option value="">-- Select Camp --</option>';
            const saCampSelect = document.getElementById('saCamp');
            saCampSelect.innerHTML = '<option value="">-- Select Camp --</option>';

            (appState.camps || []).forEach(c => {
                campSelect.innerHTML += \`<option value="\${c}">\${c}</option>\`;
                saCampSelect.innerHTML += \`<option value="\${c}">\${c}</option>\`;
            });
            renderSuperAdminUsersTable();
        }

        async function superAdminAddCamp() {
            const input = document.getElementById('superNewCampInput');
            const campName = input.value.trim();
            if (!campName) return;

            if (!appState.camps) appState.camps = [];
            if (appState.camps.includes(campName)) return alert('Camp already exists.');

            appState.camps.push(campName);
            if (!appState.camp_buildings) appState.camp_buildings = {};
            appState.camp_buildings[campName] = [];
            input.value = '';

            await saveState();
            initSuperAdminPanel();
        }

        function superAdminUpdateCampBldgPreview() {
            const camp = document.getElementById('superCampTargetSelect').value;
            const container = document.getElementById('superCampBldgsList');
            if (!camp || !appState.camp_buildings[camp]) {
                container.innerHTML = 'Buildings: None';
                return;
            }
            let html = '<strong>Buildings:</strong> ';
            appState.camp_buildings[camp].forEach(b => {
                html += \`<span class="badge bg-light text-dark border me-1">Bldg \${b}</span>\`;
            });
            container.innerHTML = html;
        }

        async function superAdminAddBuilding() {
            const camp = document.getElementById('superCampTargetSelect').value;
            const bldgInput = document.getElementById('superNewBldgInput');
            const bldg = bldgInput.value.trim();
            if (!camp || !bldg) return alert('Select camp and enter building.');
            if (!appState.camp_buildings[camp]) appState.camp_buildings[camp] = [];
            appState.camp_buildings[camp].push(bldg);
            bldgInput.value = '';
            await saveState();
            superAdminUpdateCampBldgPreview();
        }

        function superAdminRoleChanged() {
            const role = document.getElementById('saRole').value;
            document.getElementById('saBuildingsContainer').style.display = (role === 'superadmin') ? 'none' : 'block';
        }

        function superAdminCampChanged() {
            const camp = document.getElementById('saCamp').value;
            const container = document.getElementById('saBuildingCheckboxes');
            container.innerHTML = '';
            if (!camp || !appState.camp_buildings[camp]) return;
            appState.camp_buildings[camp].forEach(b => {
                container.innerHTML += \`<div class="form-check form-check-inline"><input class="form-check-input sa-bldg-chk" type="checkbox" value="\${b}" id="sa_chk_\${b}"><label class="form-check-label" for="sa_chk_\${b}">Bldg \${b}</label></div>\`;
            });
        }

        async function superAdminCreateUser(e) {
            e.preventDefault();
            const username = document.getElementById('saUsername').value.trim();
            const password = document.getElementById('saPassword').value.trim();
            const role = document.getElementById('saRole').value;
            const camp = document.getElementById('saCamp').value;
            const checkboxes = document.querySelectorAll('.sa-bldg-chk:checked');
            const selectedBldgs = Array.from(checkboxes).map(chk => chk.value);

            if (!appState.staff_users) appState.staff_users = [];
            appState.staff_users.push({ username, password, role, camp: camp || 'Camp Hansen', buildings: selectedBldgs });
            await saveState();
            alert('Staff created successfully!');
            renderSuperAdminUsersTable();
        }

        function renderSuperAdminUsersTable() {
            const tbody = document.getElementById('superAdminUsersTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';
            (appState.staff_users || []).forEach((u, idx) => {
                tbody.innerHTML += \`<tr><td>\${u.username}</td><td>\${u.role}</td><td>\${u.camp}</td><td>\${u.buildings ? u.buildings.join(', ') : 'All'}</td><td class="text-end"><button class="btn btn-outline-danger btn-sm py-0 px-1" onclick="superAdminDeleteUser(\${idx})">&times;</button></td></tr>\`;
            });
        }

        async function superAdminDeleteUser(idx) {
            appState.staff_users.splice(idx, 1);
            await saveState();
            renderSuperAdminUsersTable();
        }

        function switchView(viewType) {
            const tableView = document.getElementById('tableViewSection');
            const calView = document.getElementById('calendarViewSection');
            if (viewType === 'table') {
                tableView.style.display = 'block';
                calView.style.display = 'none';
            } else {
                tableView.style.display = 'none';
                calView.style.display = 'block';
                renderCalendar();
            }
        }

        function changeMonth(direction) {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
            renderCalendar();
        }

        function renderCalendar() {
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            document.getElementById('calendarMonthTitle').textContent = \`\${monthNames[month]} \${year}\`;

            const grid = document.getElementById('calendarDaysGrid');
            grid.innerHTML = '';

            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const prevTotalDays = new Date(year, month, 0).getDate();
            const effectiveBldgs = getEffectiveBuildings();

            for (let i = firstDayIndex; i > 0; i--) {
                grid.innerHTML += \`<div class="calendar-cell other-month"><div class="fw-bold mb-1">\${prevTotalDays - i + 1}</div></div>\`;
            }

            for (let day = 1; day <= totalDays; day++) {
                const dateStr = \`\${year}-\${String(month + 1).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`;
                let cellHtml = \`<div class="calendar-cell"><div class="fw-bold mb-1 text-dark">\${day}</div>\`;
                
                const bookingsOnDay = (appState.bookings || []).filter(b => {
                    if (userRole === 'superadmin') return b.date === dateStr;
                    return b.camp === staffCamp && effectiveBldgs.includes(String(b.building)) && b.date === dateStr;
                });

                bookingsOnDay.forEach(b => {
                    const globalIdx = (appState.bookings || []).findIndex(item => item.confirmationCode === b.confirmationCode);
                    cellHtml += \`<span class="booking-badge bg-primary text-white" onclick="openBookingActionModal(\${globalIdx})">\${b.time} Bldg \${b.building} (\${b.firstName})</span>\`;
                });
                cellHtml += \`</div>\`;
                grid.innerHTML += cellHtml;
            }
        }

        function renderStaffAppointments() {
            const tbody = document.getElementById('staffAppointmentsTable');
            tbody.innerHTML = '';
            const bookings = appState.bookings || [];
            if (bookings.length === 0) {
                tbody.innerHTML = \`<tr><td colspan="7" class="text-center text-muted py-4">No appointments found.</td></tr>\`;
                return;
            }
            const effectiveBldgs = getEffectiveBuildings();
            const filtered = bookings.filter(b => userRole === 'superadmin' || (b.camp === staffCamp && effectiveBldgs.includes(String(b.building))));

            filtered.forEach(b => {
                const globalIdx = bookings.findIndex(item => item.confirmationCode === b.confirmationCode);
                tbody.innerHTML += \`<tr>
                    <td><span class="fw-bold text-primary">\${b.confirmationCode}</span></td>
                    <td>\${b.firstName} \${b.lastName}<br><small class="text-muted">\${b.email || ''}</small></td>
                    <td>\${b.branch}</td>
                    <td>Bldg \${b.building} (\${b.camp})</td>
                    <td>\${b.date} @ \${b.time}</td>
                    <td>\${b.purpose}</td>
                    <td class="text-end">
                        <input type="text" class="form-control form-control-sm mb-1" placeholder="Notes..." value="\${b.staffNotes || ''}" onchange="updateNotes('\${b.confirmationCode}', this.value)">
                        <button class="btn btn-outline-primary btn-sm fw-bold" onclick="openBookingActionModal(\${globalIdx})">Details</button>
                    </td>
                </tr>\`;
            });
        }

        async function updateNotes(code, notes) {
            const target = appState.bookings.find(b => b.confirmationCode === code);
            if (target) {
                target.staffNotes = notes;
                await saveState();
            }
        }

        function openBookingActionModal(index) {
            activeBookingIndex = index;
            const b = appState.bookings[index];
            document.getElementById('modalBookingIndex').value = index;
            document.getElementById('rescheduleDate').value = b.date || '';
            document.getElementById('rescheduleTime').value = b.time || '';
            document.getElementById('modalBookingDetails').innerHTML = \`<strong>\${b.confirmationCode}</strong> - \${b.firstName} \${b.lastName} (\${b.camp} Bldg \@ \${b.date})\`;
            new bootstrap.Modal(document.getElementById('bookingActionModal')).show();
        }

        async function rescheduleBookingFromModal() {
            if (activeBookingIndex === null) return;
            appState.bookings[activeBookingIndex].date = document.getElementById('rescheduleDate').value;
            appState.bookings[activeBookingIndex].time = document.getElementById('rescheduleTime').value;
            await saveState();
            bootstrap.Modal.getInstance(document.getElementById('bookingActionModal')).hide();
            renderStaffAppointments();
            renderCalendar();
        }

        async function deleteBookingFromModal() {
            if (activeBookingIndex === null) return;
            if (!confirm('Delete booking?')) return;
            appState.bookings.splice(activeBookingIndex, 1);
            await saveState();
            bootstrap.Modal.getInstance(document.getElementById('bookingActionModal')).hide();
            renderStaffAppointments();
            renderCalendar();
        }

        async function saveState() {
            await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appState)
            });
        }
    </script>
</body>
</html>`;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let activeSessions = {};

app.use((req, res, next) => {
    const cookieHeader = req.headers['cookie'] || '';
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match && activeSessions[match[1]]) {
        req.user = activeSessions[match[1]];
        req.session = { user: req.user };
    }
    next();
});

// In-Memory Database State with default superadmin & availability rules
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
    availabilityRules: [],
    staff_users: [
        {
            username: "superadmin",
            password: "password123",
            role: "superadmin",
            camp: "Camp Hansen",
            buildings: [],
            recovery_email: "superadmin@usmc.mil"
        }
    ]
};

// ==========================================
// Permission Verification Middleware
// ==========================================
function verifyAvailabilityPermission(req, res, next) {
    const user = req.session && req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const role = user.role;
    if (role === 'superadmin' || role === 'Superadmin') {
        return next();
    }

    const targetCampId = req.body.campId || req.query.campId || req.body.camp || req.query.camp;
    const targetBuildingId = req.body.buildingId || req.query.buildingId || req.body.building || req.query.building;

    if (role === 'camp_admin' || role === 'Camp Admin') {
        if (targetCampId && String(targetCampId).toLowerCase() === String(user.camp).toLowerCase()) {
            return next();
        }
        return res.status(403).json({ error: "Forbidden: Outside camp jurisdiction" });
    }

    if (role === 'staff' || role === 'UH Building Manager') {
        const assignedBldgs = user.buildings || [];
        if (targetBuildingId && assignedBldgs.map(String).includes(String(targetBuildingId))) {
            return next();
        }
        return res.status(403).json({ error: "Forbidden: Outside building jurisdiction" });
    }

    return res.status(403).json({ error: "Forbidden: Invalid role permissions" });
}

// ==========================================
// Availability Management Endpoints
// ==========================================
app.get('/api/availability', (req, res) => {
    const { campId, buildingId, userId, camp, building } = req.query;
    const targetCamp = campId || camp;
    const targetBuilding = buildingId || building;
    let results = (appState.availabilityRules || []).filter(r => r.isActive !== false);

    if (targetCamp) results = results.filter(r => String(r.campId || r.camp) === String(targetCamp));
    if (targetBuilding) results = results.filter(r => String(r.buildingId || r.building) === String(targetBuilding));
    if (userId) results = results.filter(r => String(r.userId) === String(userId));

    res.json(results);
});

app.post('/api/availability', verifyAvailabilityPermission, (req, res) => {
    const { campId, buildingId, camp, building, daysOfWeek, dayOfWeek, specificDate, startTime, endTime, slotDurationMinutes } = req.body;
    const user = req.session.user;

    const finalCamp = campId || camp || user.camp;
    const finalBuilding = buildingId || building;

    let finalDays = [];
    if (Array.isArray(daysOfWeek)) {
        finalDays = daysOfWeek.map(d => parseInt(d, 10));
    } else if (dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== "") {
        finalDays = [parseInt(dayOfWeek, 10)];
    }

    const newRule = {
        id: Date.now(),
        userId: user.username,
        role: user.role,
        campId: finalCamp ? String(finalCamp) : null,
        camp: finalCamp ? String(finalCamp) : null,
        buildingId: finalBuilding ? String(finalBuilding) : null,
        building: finalBuilding ? String(finalBuilding) : null,
        daysOfWeek: finalDays,
        specificDate: specificDate || null,
        startTime: startTime || "08:00",
        endTime: endTime || "16:00",
        slotDurationMinutes: slotDurationMinutes ? parseInt(slotDurationMinutes, 10) : 30,
        isActive: true
    };

    if (!appState.availabilityRules) appState.availabilityRules = [];
    appState.availabilityRules.push(newRule);
    res.status(201).json(newRule);
});

app.delete('/api/availability/:id', (req, res) => {
    const ruleId = parseInt(req.params.id, 10);
    const user = req.session && req.session.user;

    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (!appState.availabilityRules) appState.availabilityRules = [];
    const ruleIndex = appState.availabilityRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
        return res.status(404).json({ error: "Rule not found" });
    }

    appState.availabilityRules.splice(ruleIndex, 1);
    res.json({ message: "Availability rule deleted successfully" });
});

// ==========================================
// Time Slot Generation Helper & Endpoints
// ==========================================
function generateTimeSlots(startTime, endTime, durationMinutes) {
    const slots = [];
    let [startHour, startMin] = startTime.split(':').map(Number);
    let [endHour, endMin] = endTime.split(':').map(Number);

    let currentTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;

    while (currentTotalMinutes + durationMinutes <= endTotalMinutes) {
        let h = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
        let m = (currentTotalMinutes % 60).toString().padStart(2, '0');
        let slotStart = `${h}:${m}`;

        currentTotalMinutes += durationMinutes;
        let eh = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
        let em = (currentTotalMinutes % 60).toString().padStart(2, '0');
        let slotEnd = `${eh}:${em}`;

        slots.push({ startTime: slotStart, endTime: slotEnd });
    }
    return slots;
}

app.get('/api/booking-slots', (req, res) => {
    const { campId, buildingId, camp, building, date } = req.query;
    const targetCamp = campId || camp;
    const targetBuilding = buildingId || building;

    if (!targetCamp || !targetBuilding || !date) {
        return res.status(400).json({ error: "Missing required query parameters: camp, building, date" });
    }

    const targetDateObj = new Date(date);
    const dayOfWeek = targetDateObj.getDay();
    const rules = appState.availabilityRules || [];

    let matchingRule = rules.find(r => 
        r.isActive !== false && 
        String(r.campId || r.camp) === String(targetCamp) && 
        String(r.buildingId || r.building) === String(targetBuilding) && 
        r.specificDate === date
    );

    if (!matchingRule) {
        matchingRule = rules.find(r => {
            if (r.isActive !== false && 
                String(r.campId || r.camp) === String(targetCamp) && 
                String(r.buildingId || r.building) === String(targetBuilding) && 
                !r.specificDate) {
                
                if (Array.isArray(r.daysOfWeek) && r.daysOfWeek.includes(dayOfWeek)) {
                    return true;
                }
                if (r.dayOfWeek !== undefined && r.dayOfWeek !== null && Number(r.dayOfWeek) === dayOfWeek) {
                    return true;
                }
            }
            return false;
        });
    }

    if (!matchingRule) {
        return res.json({ availableSlots: [], message: "No active availability configured for this building and date." });
    }

    let slots = generateTimeSlots(matchingRule.startTime, matchingRule.endTime, matchingRule.slotDurationMinutes || 30);

    const bookedSlotsForDate = (appState.bookings || []).filter(b => 
        String(b.camp) === String(targetCamp) && 
        String(b.building) === String(targetBuilding) && 
        b.date === date && 
        b.status !== 'Cancelled'
    );

    const availableSlots = slots.filter(slot => {
        return !bookedSlotsForDate.some(b => b.time === slot.startTime || b.startTime === slot.startTime);
    });

    res.json({
        ruleId: matchingRule.id,
        camp: targetCamp,
        building: targetBuilding,
        date,
        availableSlots
    });
});

// State management endpoints
app.get('/api/state', (req, res) => {
    res.json(appState);
});

app.post('/api/state', (req, res) => {
    if (req.body && typeof req.body === 'object') {
        appState = req.body;
        return res.json({ success: true, message: "State updated successfully" });
    }
    res.status(400).json({ success: false, error: "Invalid payload" });
});

app.post('/api/book', (req, res) => {
    try {
        const { camp, building, date, time, firstName, lastName, email, branch, purpose } = req.body;
        
        const newBooking = {
            confirmationCode: 'UH-' + Math.floor(1000 + Math.random() * 9000),
            firstName: firstName || req.body.residentName,
            lastName: lastName || '',
            email: email || req.body.contactInfo,
            branch: branch || 'USMC',
            camp: camp || req.body.campId,
            building: building || req.body.buildingId,
            purpose: purpose || 'Check-in / In-processing',
            date: date,
            time: time || req.body.startTime,
            status: 'Confirmed',
            staffNotes: ''
        };

        if (!appState.bookings) appState.bookings = [];
        appState.bookings.push(newBooking);
        res.json({ status: 'success', confirmationCode: newBooking.confirmationCode, booking: newBooking });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = (appState.staff_users || []).find(u => u.username === username && u.password === password);
    if (user) {
        const token = Math.random().toString(36).substring(2);
        activeSessions[token] = user;
        res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly`);
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/session', (req, res) => {
    if (req.user) {
        res.json(req.user);
    } else {
        res.status(401).json({});
    }
});

// Route Handlers
app.get('/', (req, res) => {
    res.send(indexHtml);
});

app.get('/login', (req, res) => {
    res.send(loginHtml);
});

app.get('/dashboard', (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    res.send(staffHtml);
});

app.get('/logout', (req, res) => {
    const cookieHeader = req.headers['cookie'] || '';
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match && activeSessions[match[1]]) {
        delete activeSessions[match[1]];
    }
    res.setHeader('Set-Cookie', 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.redirect('/login');
});

app.listen(PORT, () => {
    console.log(`Unaccompanied Housing server running on port ${PORT}`);
});