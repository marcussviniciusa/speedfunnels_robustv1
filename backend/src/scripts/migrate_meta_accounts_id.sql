-- Migração para alterar o tipo de id de INTEGER para BIGINT na tabela meta_accounts
ALTER TABLE meta_accounts ALTER COLUMN id TYPE BIGINT;
