#!/bin/sh
set -e
echo "Installing dependencies..."
pnpm install
echo "Pushing database schema..."
pnpm db:push
echo "Done! Run 'pnpm dev' to start."
