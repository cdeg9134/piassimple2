#!/bin/bash
cd /app/backend
export DATABASE_URL=postgresql://ski_user:changeme@localhost:5432/ski_service
export PORT=8001
export TOKEN_SECRET=ski-service-secret-key-production
export NODE_ENV=development
exec node --enable-source-maps ./dist/index.mjs
