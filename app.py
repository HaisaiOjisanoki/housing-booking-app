from flask import Flask, render_template, request, redirect, url_for, session

app = Flask(__name__)
app.secret_key = 'housing_app_secure_secret_key'

@app.route('/')
def public_booking():
    """The public booking page accessed directly via link."""
    return render_template('public_booking.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Separate login page for Super Admin, Admin, and User roles."""
    if request.method == 'POST':
        role = request.form.get('role')
        session['role'] = role
        if role in ['Super Admin', 'Admin']:
            return redirect(url_for('dashboard'))
        else:
            return redirect(url_for('public_booking'))
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    """Protected Admin Portal for managing buildings and data exports."""
    return render_template('dashboard.html')

if __name__ == '__main__':
    app.run(debug=True)