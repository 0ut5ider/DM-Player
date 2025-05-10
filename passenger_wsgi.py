import os
import sys
import subprocess

# This file is required by some cPanel Passenger configurations
# It redirects to the Node.js application

# Print a message to the error log
sys.stderr.write("Loading passenger_wsgi.py for Node.js application\n")

# Try to start the Node.js application directly
try:
    # Get the directory where this script is located
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Log the current directory
    sys.stderr.write(f"Current directory: {CURRENT_DIR}\n")
    
    # List files in the current directory
    sys.stderr.write(f"Files in directory: {os.listdir(CURRENT_DIR)}\n")
    
    # Check if app.js exists
    if os.path.exists(os.path.join(CURRENT_DIR, 'app.js')):
        sys.stderr.write("app.js found, attempting to start Node.js application\n")
        
        # Try to start the Node.js application
        subprocess.Popen(['node', 'app.js'], cwd=CURRENT_DIR)
        sys.stderr.write("Node.js application started\n")
    else:
        sys.stderr.write("app.js not found\n")
except Exception as e:
    sys.stderr.write(f"Error starting Node.js application: {str(e)}\n")

# This is a fallback WSGI application that will be called if Passenger
# doesn't properly redirect to the Node.js application
def application(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/html')])
    return [b"<html><body><h1>Node.js Application Error</h1><p>The Node.js application could not be started. Please check the server logs for more information.</p></body></html>"]
