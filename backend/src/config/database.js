const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    timezone: 'UTC', // Garantir consistência no fuso horário
  },
  timezone: 'UTC', // Garantir consistência no fuso horário em nível global
});

module.exports = sequelize;
