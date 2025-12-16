#!/bin/bash

# Development setup script
# This script starts a local Redis instance and runs the development server

set -e

echo "🚀 Starting development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start Redis container for development
echo "📦 Starting Redis container..."
REDIS_CONTAINER_NAME="cronjobs-redis-dev"

# Check if container already exists
if [ "$(docker ps -aq -f name=$REDIS_CONTAINER_NAME)" ]; then
    echo "🔄 Redis container already exists, starting it..."
    docker start $REDIS_CONTAINER_NAME
else
    echo "🆕 Creating new Redis container..."
    docker run -d \
        --name $REDIS_CONTAINER_NAME \
        -p 6379:6379 \
        redis:7-alpine \
        redis-server --appendonly yes
fi

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
sleep 3

# Check if Redis is responding
if docker exec $REDIS_CONTAINER_NAME redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready!"
else
    echo "❌ Redis failed to start properly"
    exit 1
fi

# Set environment variables for development
export NODE_ENV=development
export PORT=3000
export REDIS_URL="redis://localhost:6379"

echo "🌟 Starting development server..."
echo "📊 Application will be available at: http://localhost:3000"
echo "📈 Bull Board dashboard: http://localhost:3000/admin/queues"
echo "🛑 Press Ctrl+C to stop the server"
echo ""
echo "💡 To stop Redis container after development, run: docker stop $REDIS_CONTAINER_NAME"
echo "💡 To remove Redis container, run: docker rm $REDIS_CONTAINER_NAME"
echo ""
