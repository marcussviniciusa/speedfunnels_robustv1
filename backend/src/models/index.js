/**
 * Arquivo de exportação centralizada dos modelos
 * Facilita a importação de múltiplos modelos em outros arquivos
 */

const Campaign = require('./Campaign');
const MetaAccount = require('./MetaAccount');

// Definir associações entre modelos (se necessário)
const setupAssociations = () => {
  // Associação entre Campaign e MetaAccount
  Campaign.belongsTo(MetaAccount, {
    foreignKey: 'adAccountId',
    targetKey: 'accountId',
    as: 'metaAccount',
    constraints: false // Não cria constraint no banco de dados
  });
  
  MetaAccount.hasMany(Campaign, {
    foreignKey: 'adAccountId',
    sourceKey: 'accountId',
    as: 'campaigns',
    constraints: false // Não cria constraint no banco de dados
  });
};

// Configurar associações
setupAssociations();

module.exports = {
  Campaign,
  MetaAccount
};
