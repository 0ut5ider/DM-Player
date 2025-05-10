import sys
import os

# This file is used by Passenger in some configurations
# It redirects to the Node.js application

# Print a message to the error log
sys.stderr.write("Loading app.wsgi for Node.js application\n")

# Get the directory where this script is located
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Add the current directory to the Python path
sys.path.insert(0, CURRENT_DIR)

# Import the WSGI application from passenger_wsgi.py
from passenger_wsgi import application
