/**
 * Modelo de Campanha com tratamento especial para campos de data
 * Garante consistência entre dados locais e dados da API do Meta
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { formatToStandardDate } = require('../utils/dateUtils');

class Campaign extends Model {}

Campaign.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    comment: 'ID da campanha no Meta/Facebook'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nome da campanha'
  },
  status: {
    type: DataTypes.STRING,
    comment: 'Status atual da campanha (ACTIVE, PAUSED, DELETED, etc)'
  },
  objective: {
    type: DataTypes.STRING,
    comment: 'Objetivo da campanha (CONVERSIONS, LINK_CLICKS, etc)'
  },
  // Campos de data com formatação garantida
  startDate: {
    type: DataTypes.DATEONLY,
    field: 'start_date',
    comment: 'Data de início da campanha (YYYY-MM-DD)',
    get() {
      // Garante formato consistente na leitura
      const rawValue = this.getDataValue('startDate');
      return rawValue ? formatToStandardDate(rawValue) : null;
    },
    set(value) {
      // Garante formato consistente na escrita
      this.setDataValue('startDate', formatToStandardDate(value));
    }
  },
  endDate: {
    type: DataTypes.DATEONLY,
    field: 'end_date',
    comment: 'Data de término da campanha (YYYY-MM-DD)',
    get() {
      const rawValue = this.getDataValue('endDate');
      return rawValue ? formatToStandardDate(rawValue) : null;
    },
    set(value) {
      this.setDataValue('endDate', formatToStandardDate(value));
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    get() {
      const rawValue = this.getDataValue('createdAt');
      return rawValue ? formatToStandardDate(rawValue) : null;
    }
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    get() {
      const rawValue = this.getDataValue('updatedAt');
      return rawValue ? formatToStandardDate(rawValue) : null;
    }
  },
  // Informações financeiras
  dailyBudget: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'daily_budget',
    comment: 'Orçamento diário da campanha'
  },
  lifetimeBudget: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'lifetime_budget',
    comment: 'Orçamento total da campanha'
  },
  // Dados de desempenho agregados
  spend: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Total gasto na campanha'
  },
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total de impressões'
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total de cliques'
  },
  conversions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total de conversões'
  },
  // Metadados
  lastSyncedAt: {
    type: DataTypes.DATE,
    field: 'last_synced_at',
    comment: 'Data e hora da última sincronização com a API do Meta',
    get() {
      const rawValue = this.getDataValue('lastSyncedAt');
      return rawValue ? formatToStandardDate(rawValue) : null;
    }
  },
  adAccountId: {
    type: DataTypes.STRING,
    field: 'ad_account_id',
    comment: 'ID da conta de anúncios'
  },
  // Campo de verificação para validar a sincronização de dados
  syncValidated: {
    type: DataTypes.BOOLEAN,
    field: 'sync_validated',
    defaultValue: false,
    comment: 'Indica se os dados foram validados com a API do Meta'
  }
}, {
  sequelize,
  modelName: 'Campaign',
  tableName: 'campaigns',
  underscored: true,
  timestamps: true,
  hooks: {
    // Hook para garantir formato consistente de datas antes de salvar
    beforeSave: (campaign) => {
      if (campaign.startDate) {
        campaign.startDate = formatToStandardDate(campaign.startDate);
      }
      if (campaign.endDate) {
        campaign.endDate = formatToStandardDate(campaign.endDate);
      }
    }
  }
});

// Método para sincronizar dados com a API
Campaign.prototype.syncFromMetaApi = function(apiData) {
  if (!apiData) return this;
  
  // Mapeamento de campos da API para o modelo
  this.name = apiData.name || this.name;
  this.status = apiData.status || this.status;
  this.objective = apiData.objective || this.objective;
  
  // Tratamento especial para datas
  if (apiData.start_time) {
    this.startDate = formatToStandardDate(apiData.start_time);
  }
  
  if (apiData.stop_time) {
    this.endDate = formatToStandardDate(apiData.stop_time);
  }
  
  // Orçamentos
  if (apiData.daily_budget) {
    this.dailyBudget = apiData.daily_budget / 100; // A API retorna em centavos
  }
  
  if (apiData.lifetime_budget) {
    this.lifetimeBudget = apiData.lifetime_budget / 100; // A API retorna em centavos
  }
  
  // Atualiza metadados
  this.lastSyncedAt = new Date();
  this.syncValidated = true;
  
  return this;
};

// Método para formatar todas as datas do modelo
Campaign.prototype.formatAllDates = function() {
  const dateFields = ['startDate', 'endDate', 'createdAt', 'updatedAt', 'lastSyncedAt'];
  
  dateFields.forEach(field => {
    if (this[field]) {
      this[field] = formatToStandardDate(this[field]);
    }
  });
  
  return this;
};

module.exports = Campaign;
