/**
 * Controlador para adicionar dados de teste (seed)
 */

const { MetaAccount } = require('../models');
const logger = require('../utils/logger');

/**
 * Adiciona contas de teste do Meta para o dashboard
 */
const seedMetaAccounts = async (req, res) => {
  try {
    // Verificar se já existem contas
    const count = await MetaAccount.count();
    
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existem contas cadastradas. Operação de seed cancelada.'
      });
    }
    
    // Array com dados de contas de teste
    const testAccounts = [
      {
        name: 'Conta Principal',
        accountId: '123456789',
        accessToken: 'EAABwzLixnjQBAMZBKZA7ZBfucSYDFVZAIUt5CwoXpfzv32e9BZCbgkuEuVl0',
        isActive: true,
        lastUsed: new Date()
      },
      {
        name: 'Conta Secundária',
        accountId: '987654321',
        accessToken: 'EAABwzLixnjQBAGZBNbMt2WkoeMoGmIFa8ZARRIJUMsLDzxQrHPTlGwUx40',
        isActive: false,
        lastUsed: new Date(Date.now() - 86400000) // Ontem
      },
      {
        name: 'Outra Campanha',
        accountId: '555666777',
        accessToken: 'EAABwzLixnjQBAPHxwXOgBBx3ZCowTpCNLbZAJSZAMV4JbJRzRbJH8Q6UZD',
        isActive: false,
        lastUsed: new Date(Date.now() - 172800000) // 2 dias atrás
      }
    ];
    
    // Inserir contas
    await MetaAccount.bulkCreate(testAccounts);
    
    logger.info('Contas de teste adicionadas com sucesso!');
    
    return res.status(201).json({
      success: true,
      message: 'Contas de teste adicionadas com sucesso!',
      count: testAccounts.length
    });
  } catch (error) {
    logger.error('Erro ao adicionar contas de teste:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao adicionar contas de teste',
      error: error.message
    });
  }
};

module.exports = {
  seedMetaAccounts
};
