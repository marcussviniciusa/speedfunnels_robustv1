/**
 * Middlewares de validação
 * Implementa verificações robustas para parâmetros de requisição
 */

const { isValidDateFormat } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Valida parâmetros de data em requisições
 * Garante que datas estejam no formato correto antes de processá-las
 */
const validateDateParams = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Verificar presença dos parâmetros
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetros ausentes',
      message: 'Os parâmetros startDate e endDate são obrigatórios'
    });
  }
  
  // Validar formato das datas (YYYY-MM-DD)
  if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
    logger.warn('Tentativa de acesso com formato de data inválido', {
      path: req.path,
      params: req.query,
      ip: req.ip
    });
    
    return res.status(400).json({
      success: false,
      error: 'Formato de data inválido',
      message: 'As datas devem estar no formato YYYY-MM-DD'
    });
  }
  
  // Verificar se a data inicial é anterior à data final
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return res.status(400).json({
      success: false,
      error: 'Intervalo de datas inválido',
      message: 'A data inicial deve ser anterior à data final'
    });
  }
  
  // Verificar se o intervalo não é muito grande (ex: máximo de 1 ano)
  const maxDaysInterval = 366; // Aproximadamente 1 ano
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > maxDaysInterval) {
    return res.status(400).json({
      success: false,
      error: 'Intervalo de datas muito grande',
      message: `O intervalo máximo permitido é de ${maxDaysInterval} dias`
    });
  }
  
  // Se todas as validações passarem, continua para o próximo middleware
  next();
};

module.exports = {
  validateDateParams
};
