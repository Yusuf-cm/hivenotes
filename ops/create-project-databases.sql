-- Run with psql connected to the existing paid instance as its owner.
-- Non-destructive: existing databases are left intact; no application migrations run here.
\set ON_ERROR_STOP on
SELECT 'CREATE DATABASE ronohs_decor' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ronohs_decor')\gexec
SELECT 'CREATE DATABASE kifaru_erp' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kifaru_erp')\gexec
