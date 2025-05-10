import os
import sys

# This file is required by some cPanel Passenger configurations
# It redirects to the Node.js application

# Print a message to the error log
sys.stderr.write("Loading passenger_wsgi.py for Node.js application\n")

# This is a dummy WSGI application that will never be called
# because Passenger will use the Node.js application instead
def application(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/plain')])
    return [b"This is a Node.js application. If you're seeing this message, something is misconfigured."]
