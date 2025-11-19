#!/bin/bash

echo "🔨 Rebuilding Docker services with @prenatal/common library..."

# Stop all services
echo "⏹️  Stopping all services..."
docker-compose down

# Remove old images to force rebuild
echo "🗑️  Removing old images..."
docker rmi prenatal-core-service prenatal-rnds-service 2>/dev/null || true

# Rebuild and start services
echo "🏗️  Building services..."
docker-compose up --build -d

# Show logs
echo "📋 Services started! Showing logs..."
echo ""
echo "To follow logs:"
echo "  docker-compose logs -f core-service"
echo "  docker-compose logs -f rnds-service"
echo ""
echo "To check status:"
echo "  docker-compose ps"
