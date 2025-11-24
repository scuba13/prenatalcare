#!/bin/bash
set -e

# Script de inicialização dos databases do sistema pré-natal
# Executado automaticamente pelo PostgreSQL na inicialização

echo "Criando databases para microsserviços..."

# Lista de databases
DATABASES="prenatal_core rnds_sync prenatal_scheduling prenatal_notifications prenatal_auth"

for DB in $DATABASES; do
    echo "Criando database: $DB"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        SELECT 'CREATE DATABASE $DB'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB')\gexec
EOSQL

    # Habilitar extensão uuid-ossp no database
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$DB" <<-EOSQL
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL
done

echo "Todos os databases criados com sucesso!"
