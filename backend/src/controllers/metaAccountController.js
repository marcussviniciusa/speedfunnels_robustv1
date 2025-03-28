/**
 * Controlador para gerenciamento de contas do Meta (Facebook)
 */

const { MetaAccount } = require('../models');
const logger = require('../utils/logger');

/**
 * Obtém todas as contas do Meta cadastradas
 */
const getAllAccounts = async (req, res) => {
  try {
    const accounts = await MetaAccount.findAll({
      order: [['lastUsed', 'DESC']]
    });
    return res.status(200).json({ success: true, accounts });
  } catch (error) {
    logger.error('Erro ao obter contas do Meta:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter contas do Meta',
      error: error.message 
    });
  }
};

/**
 * Cria uma nova conta do Meta
 */
const createAccount = async (req, res) => {
  try {
    const { name, accountId, accessToken } = req.body;
    
    if (!name || !accountId || !accessToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos os campos são obrigatórios' 
      });
    }
    
    // Verificar se já existe uma conta com o mesmo accountId
    const existingAccount = await MetaAccount.findOne({ where: { accountId }});
    if (existingAccount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Uma conta com este ID já existe' 
      });
    }
    
    // Se não existe nenhuma conta, esta será ativa por padrão
    const accountCount = await MetaAccount.count();
    const isActive = accountCount === 0;
    
    const newAccount = await MetaAccount.create({
      name,
      accountId,
      accessToken,
      isActive,
      lastUsed: isActive ? new Date() : null
    });
    
    return res.status(201).json({ 
      success: true, 
      message: 'Conta criada com sucesso',
      account: newAccount
    });
  } catch (error) {
    logger.error('Erro ao criar conta do Meta:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao criar conta do Meta',
      error: error.message 
    });
  }
};

/**
 * Atualiza uma conta do Meta existente
 */
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, accountId, accessToken } = req.body;
    
    const account = await MetaAccount.findByPk(id);
    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conta não encontrada' 
      });
    }
    
    // Atualiza apenas os campos fornecidos
    if (name) account.name = name;
    if (accountId) account.accountId = accountId;
    if (accessToken) account.accessToken = accessToken;
    
    await account.save();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Conta atualizada com sucesso',
      account
    });
  } catch (error) {
    logger.error('Erro ao atualizar conta do Meta:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao atualizar conta do Meta',
      error: error.message 
    });
  }
};

/**
 * Remove uma conta do Meta
 */
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await MetaAccount.findByPk(id);
    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conta não encontrada' 
      });
    }
    
    // Se a conta é ativa, precisamos ativar outra conta (se existir)
    if (account.isActive) {
      const otherAccount = await MetaAccount.findOne({
        where: { id: { [require('sequelize').Op.ne]: id } }
      });
      
      if (otherAccount) {
        otherAccount.isActive = true;
        otherAccount.lastUsed = new Date();
        await otherAccount.save();
      }
    }
    
    await account.destroy();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Conta removida com sucesso' 
    });
  } catch (error) {
    logger.error('Erro ao remover conta do Meta:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao remover conta do Meta',
      error: error.message 
    });
  }
};

/**
 * Define uma conta como ativa
 */
const setActiveAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Desativa todas as contas
    await MetaAccount.update(
      { isActive: false },
      { where: {} }
    );
    
    // Ativa a conta selecionada
    const account = await MetaAccount.findByPk(id);
    if (!account) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conta não encontrada' 
      });
    }
    
    account.isActive = true;
    account.lastUsed = new Date();
    await account.save();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Conta ativada com sucesso',
      account
    });
  } catch (error) {
    logger.error('Erro ao ativar conta do Meta:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao ativar conta do Meta',
      error: error.message 
    });
  }
};

/**
 * Obtém a conta ativa atual
 */
const getActiveAccount = async (req, res) => {
  try {
    const activeAccount = await MetaAccount.findOne({
      where: { isActive: true }
    });
    
    if (!activeAccount) {
      return res.status(404).json({ 
        success: false, 
        message: 'Nenhuma conta ativa encontrada' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      account: activeAccount 
    });
  } catch (error) {
    logger.error('Erro ao obter conta ativa:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao obter conta ativa',
      error: error.message 
    });
  }
};

module.exports = {
  getAllAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setActiveAccount,
  getActiveAccount
};
