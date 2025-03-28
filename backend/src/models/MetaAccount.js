/**
 * Modelo para armazenar e gerenciar contas de anúncios do Meta (Facebook)
 */

const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class MetaAccount extends Model {
  static associate(models) {
    // Relacionamentos podem ser definidos aqui
  }
}

MetaAccount.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    accountId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Adicionando restrição de unicidade
      validate: {
        notEmpty: true
      },
      field: 'account_id'
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      field: 'access_token'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_active'
    },
    lastUsed: {
      type: DataTypes.DATE,
      field: 'last_used'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'MetaAccount',
    tableName: 'meta_accounts',
    timestamps: true,
    underscored: true
  });

module.exports = MetaAccount;
