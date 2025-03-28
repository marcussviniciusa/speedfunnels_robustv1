/**
 * Script para inicialização e sincronização do banco de dados
 * Cria as tabelas necessárias para a aplicação funcionar
 */

const sequelize = require('../config/database');
const { Campaign, MetaAccount } = require('../models');
const logger = require('../utils/logger');

// Função para sincronizar o banco de dados
const initializeDatabase = async () => {
  try {
    // Testar conexão com o banco de dados
    await sequelize.authenticate();
    logger.info('Conexão com o banco de dados estabelecida com sucesso.');
    
    // Sincronizar modelos (criar tabelas se não existirem)
    // Nota: o parâmetro force como false evita que tabelas existentes sejam recriadas
    await sequelize.sync({ force: false, alter: true });
    logger.info('Modelos sincronizados com o banco de dados.');
    
    logger.info('Inicialização do banco de dados concluída com sucesso.');
    return true;
  } catch (error) {
    logger.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

// Exporta a função para ser usada em outros módulos
module.exports = initializeDatabase;

// Executa a inicialização se este script for chamado diretamente
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Banco de dados inicializado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao inicializar banco de dados:', error);
      process.exit(1);
    });
}
