#!/bin/sh
set -e

echo "Installing dependencies..."
npm install --silent

echo "Generating Prisma client..."
npx prisma generate

echo "Applying database migrations..."
npx prisma migrate deploy

if [ "$NODE_ENV" = "production" ]; then
  echo "Starting production server..."
  npm run start
else
  echo "Starting development server..."
  npm run dev
fi
