#!/bin/bash
cd /app/frontend
export PORT=3000
export API_PORT=8001
exec npx vite --host 0.0.0.0 --port 3000
