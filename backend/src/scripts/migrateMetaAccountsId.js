const sequelize = require('../config/database');

async function migrateMetaAccountsId() {
  try {
    console.log('Iniciando migração para alterar o tipo da coluna id em meta_accounts...');
    
    // Executar a consulta SQL crua para alterar o tipo de coluna
    await sequelize.query('ALTER TABLE meta_accounts ALTER COLUMN id TYPE BIGINT;');
    
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao executar a migração:', error);
  } finally {
    // Fechar a conexão com o banco de dados
    await sequelize.close();
  }
}

// Executar a função de migração
migrateMetaAccountsId();
