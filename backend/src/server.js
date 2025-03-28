/**
 * Servidor principal da aplicação
 * Configuração do Express com middlewares de segurança e rotas
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const sequelize = require('./config/database');
const campaignRoutes = require('./routes/campaignRoutes');
const statsRoutes = require('./routes/statsRoutes');
const metaAccountRoutes = require('./routes/metaAccountRoutes');
const seedRoutes = require('./routes/seedRoutes');
const logger = require('./utils/logger');

// Criação do diretório de logs caso não exista
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet()); // Segurança
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração de logs de requisições HTTP
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// Middleware para tracking de requisições com informação de tempo
app.use((req, res, next) => {
  const startTime = new Date();
  res.on('finish', () => {
    const duration = new Date() - startTime;
    logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Rotas
app.use('/api/campaigns', campaignRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/meta-accounts', metaAccountRoutes);
app.use('/api/seed', seedRoutes);

// Rota de teste/status
app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando normalmente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', {
    message: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    headers: req.headers
  });
  
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    message: `A rota ${req.originalUrl} não existe nesta API`
  });
});

// Inicialização do servidor
const startServer = async () => {
  try {
    // Testar conexão com o banco de dados
    await sequelize.authenticate();
    logger.info('Conexão com o banco de dados estabelecida com sucesso');
    
    // Sincronizar modelos com o banco de dados (não forçar em produção)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Modelos sincronizados com o banco de dados');
    }
    
    // Iniciar o servidor
    app.listen(PORT, () => {
      logger.info(`Servidor iniciado na porta ${PORT} em modo ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Erro ao iniciar o servidor:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Tratamento de sinais para graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido. Encerrando servidor...');
  process.exit(0);
});

// Iniciar o servidor
startServer();

module.exports = app; // Para testes
