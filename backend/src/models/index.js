/**
 * Arquivo de exportação centralizada dos modelos
 * Facilita a importação de múltiplos modelos em outros arquivos
 */

const Campaign = require('./Campaign');
const MetaAccount = require('./MetaAccount');

// Definir associações entre modelos (se necessário)
const setupAssociations = () => {
  // Por enquanto, não há associações
};

// Configurar associações
setupAssociations();

module.exports = {
  Campaign,
  MetaAccount
};
