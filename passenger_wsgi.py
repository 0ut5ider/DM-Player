import os
import sys
import subprocess
import json

# This file is required by some cPanel Passenger configurations
# It helps with starting the Node.js application

# Print a message to the error log
sys.stderr.write("Loading passenger_wsgi.py for Node.js application\n")

# Get the directory where this script is located
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Log the current directory
sys.stderr.write(f"Current directory: {CURRENT_DIR}\n")

# List files in the current directory
try:
    files = os.listdir(CURRENT_DIR)
    sys.stderr.write(f"Files in directory: {files}\n")
except Exception as e:
    sys.stderr.write(f"Error listing directory: {str(e)}\n")

# Try to read the .passenger.json file
try:
    passenger_json_path = os.path.join(CURRENT_DIR, '.passenger.json')
    if os.path.exists(passenger_json_path):
        with open(passenger_json_path, 'r') as f:
            passenger_config = json.load(f)
            sys.stderr.write(f"Passenger config: {passenger_config}\n")
            
            # Get the startup file from the config
            startup_file = passenger_config.get('startup_file', 'app.js')
            sys.stderr.write(f"Using startup file: {startup_file}\n")
    else:
        sys.stderr.write(".passenger.json not found, using default startup file app.js\n")
        startup_file = 'app.js'
except Exception as e:
    sys.stderr.write(f"Error reading .passenger.json: {str(e)}\n")
    startup_file = 'app.js'

# Try to start the Node.js application
try:
    # Check for different possible entry points
    possible_entry_points = ['app.js', 'server.js', 'index.js', startup_file]
    entry_point = None
    
    for ep in possible_entry_points:
        if os.path.exists(os.path.join(CURRENT_DIR, ep)):
            entry_point = ep
            sys.stderr.write(f"Found entry point: {entry_point}\n")
            break
    
    if entry_point:
        # Try to start the Node.js application
        node_path = '/usr/bin/node'  # Default Node.js path on cPanel
        
        # Check if node exists at the default path
        if not os.path.exists(node_path):
            # Try to find node using 'which'
            try:
                node_path = subprocess.check_output(['which', 'node']).decode('utf-8').strip()
                sys.stderr.write(f"Found Node.js at: {node_path}\n")
            except:
                sys.stderr.write("Could not find Node.js executable\n")
                node_path = 'node'  # Fall back to PATH lookup
        
        # Start the Node.js application
        cmd = [node_path, entry_point]
        sys.stderr.write(f"Starting Node.js with command: {' '.join(cmd)}\n")
        
        env = os.environ.copy()
        env['NODE_ENV'] = 'production'
        env['PORT'] = '3000'
        env['BASE_PATH'] = '/dmplayer'
        
        subprocess.Popen(cmd, cwd=CURRENT_DIR, env=env)
        sys.stderr.write("Node.js application started\n")
    else:
        sys.stderr.write("No entry point found\n")
except Exception as e:
    sys.stderr.write(f"Error starting Node.js application: {str(e)}\n")

# This is a fallback WSGI application that will be called if Passenger
# doesn't properly redirect to the Node.js application
def application(environ, start_response):
    # Log the request
    sys.stderr.write(f"WSGI application called with PATH_INFO: {environ.get('PATH_INFO', '')}\n")
    
    # Return a diagnostic page
    start_response('200 OK', [('Content-Type', 'text/html')])
    
    # Create a more detailed error page
    html = """
    <html>
    <head>
        <title>Node.js Application Diagnostic</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #d9534f; }
            h2 { color: #5bc0de; margin-top: 30px; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
            .container { max-width: 800px; margin: 0 auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Node.js Application Diagnostic</h1>
            <p>The Node.js application could not be started properly. This page is being served by the Python WSGI fallback.</p>
            
            <h2>Environment Information</h2>
            <pre>
Current Directory: %s
Python Version: %s
Request Path: %s
            </pre>
            
            <h2>Troubleshooting Steps</h2>
            <ol>
                <li>Check that app.js exists in the application directory</li>
                <li>Verify that Node.js is installed and available</li>
                <li>Check the server error logs for more detailed information</li>
                <li>Ensure all dependencies are installed (run npm install)</li>
                <li>Verify that the .passenger.json file is correctly configured</li>
            </ol>
            
            <h2>Application Access</h2>
            <p>Try accessing the application directly at: <a href="/dmplayer">/dmplayer</a></p>
        </div>
    </body>
    </html>
    """ % (CURRENT_DIR, sys.version, environ.get('PATH_INFO', ''))
    
    return [html.encode('utf-8')]
