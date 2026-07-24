from flask import Flask, render_template, request, redirect, url_for, session

app = Flask(__name__)
app.secret_key = 'super_secret_housing_portal_key'  # Required for sessions and user authentication

# Public Booking / Home Page
@app.route('/')
@app.route('/index')
@app.route('/index.html')
def index():
    return render_template('index.html')

# Login Page Route
@app.route('/login')
@app.route('/login.html')
def login():
    return render_template('login.html')

# Dashboard / Admin Panel Routes
@app.route('/dashboard')
@app.route('/dashboard.html')
def dashboard():
    return render_template('dashboard.html')

@app.route('/admin')
@app.route('/admin.html')
def admin():
    return render_template('dashboard.html') # Points to dashboard if your admin view is integrated there

# Optional catch-all or error handler to prevent crashing with standard 404s
@app.errorhandler(404)
def page_not_found(e):
    return "<h1>404 Not Found</h1><p>The requested page was not found on this server. Check your route mappings in app.py or your frontend links.</p><p><a href='/'>Return to Home</a></p>", 404

if __name__ == '__main__':
    app.run(debug=True)