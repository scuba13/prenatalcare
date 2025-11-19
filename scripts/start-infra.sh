#!/bin/bash

echo "🚀 Iniciando infraestrutura do Sistema Pré-Natal..."
echo ""

# Verifica se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker Desktop e tente novamente."
    exit 1
fi

# Sobe os containers
docker-compose up -d

# Aguarda os serviços ficarem prontos
echo ""
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 5

# Verifica status
echo ""
echo "📊 Status dos serviços:"
docker-compose ps

echo ""
echo "✅ Infraestrutura iniciada com sucesso!"
echo ""
echo "📝 Acesso aos serviços:"
echo "  • PostgreSQL:     localhost:5432 (user: postgres, password: postgres)"
echo "  • Redis:          localhost:6379"
echo "  • RabbitMQ AMQP:  localhost:5672"
echo "  • RabbitMQ UI:    http://localhost:15672 (user: admin, password: admin)"
echo "  • MinIO API:      http://localhost:9000"
echo "  • MinIO Console:  http://localhost:9001 (user: minioadmin, password: minioadmin)"
echo ""
