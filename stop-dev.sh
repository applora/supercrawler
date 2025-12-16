#!/bin/bash

# Stop development environment script
# This script stops the Redis container and cleans up

set -e

echo "🛑 Stopping development environment..."

REDIS_CONTAINER_NAME="cronjobs-redis-dev"

# Check if container exists
if [ "$(docker ps -aq -f name=$REDIS_CONTAINER_NAME)" ]; then
    echo "📦 Stopping Redis container..."
    docker stop $REDIS_CONTAINER_NAME

    read -p "🗑️  Do you want to remove the Redis container? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing Redis container..."
        docker rm $REDIS_CONTAINER_NAME
        echo "✅ Container removed"
    else
        echo "✅ Container stopped (use 'docker start $REDIS_CONTAINER_NAME' to restart)"
    fi
else
    echo "ℹ️  No Redis container found"
fi

echo "✅ Development environment stopped"