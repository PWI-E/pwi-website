import http.server
import os

os.chdir("/Users/francisong/Documents/PWI WEBSITE 110725")

handler = http.server.SimpleHTTPRequestHandler
httpd = http.server.HTTPServer(("", 3000), handler)
httpd.serve_forever()
