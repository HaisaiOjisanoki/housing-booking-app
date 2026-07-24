from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def public_booking():
    return render_template('public_booking.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)