/**
 * Sistema de log robusto para monitoramento e depuração
 * Implementa logs estruturados com diferentes níveis e rotação de arquivos
 */

const winston = require('winston');
const path = require('path');
require('dotenv').config();

// Configurações
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = path.join(__dirname, '../../logs');

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length 
      ? `\n${JSON.stringify(meta, null, 2)}` 
      : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaString}`;
  })
);

// Criação do logger com múltiplos transportes
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: customFormat,
  defaultMeta: { service: 'speedfunnels-api' },
  transports: [
    // Console para desenvolvimento
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    
    // Arquivo para erros
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Arquivo para todos os logs
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Arquivo específico para logs de sincronização
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'sync.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Métodos especializados para logs de sincronização
logger.syncInfo = (message, meta = {}) => {
  logger.info(`[SYNC] ${message}`, { ...meta, sync: true });
};

logger.syncError = (message, meta = {}) => {
  logger.error(`[SYNC] ${message}`, { ...meta, sync: true });
};

logger.syncDebug = (message, meta = {}) => {
  logger.debug(`[SYNC] ${message}`, { ...meta, sync: true });
};

// Método para comparação de dados
logger.compareData = (localData, remoteData, context = {}) => {
  const differences = [];
  
  // Comparação de chaves comuns
  Object.keys(localData).forEach(key => {
    if (remoteData[key] !== undefined && localData[key] !== remoteData[key]) {
      differences.push({
        field: key,
        local: localData[key],
        remote: remoteData[key]
      });
    }
  });
  
  if (differences.length > 0) {
    logger.syncInfo(`Diferenças detectadas: ${differences.length} campos`, {
      ...context,
      differences,
      type: 'data_comparison'
    });
  } else {
    logger.syncDebug('Sem diferenças detectadas entre dados locais e remotos', context);
  }
  
  return differences;
};

module.exports = logger;
