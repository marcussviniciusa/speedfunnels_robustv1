/**
 * Utilitários para manipulação de datas
 * Este módulo centraliza todas as operações relacionadas a datas
 * para garantir consistência em toda a aplicação
 */

const moment = require('moment-timezone');
const { format, parseISO } = require('date-fns');

// Define o formato padrão para todas as datas na aplicação
const DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';
const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_TIME = 'T12:00:00Z'; // Meio-dia UTC para evitar problemas de fuso

/**
 * Formata uma data para o formato padrão YYYY-MM-DD
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada como YYYY-MM-DD
 */
const formatToStandardDate = (date) => {
  if (!date) return null;
  
  // Se já for uma string no formato correto, retorna diretamente
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  try {
    // Tenta formatar usando date-fns para maior precisão
    if (typeof date === 'string') {
      return format(parseISO(date), DEFAULT_DATE_FORMAT);
    }
    return format(date, DEFAULT_DATE_FORMAT);
  } catch (error) {
    // Fallback para moment se date-fns falhar
    return moment(date).tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD');
  }
};

/**
 * Adiciona o horário padrão a uma data no formato YYYY-MM-DD
 * Isso garante consistência quando a data é usada em APIs
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {string} Data ISO com horário padrão
 */
const addDefaultTime = (dateString) => {
  if (!dateString) return null;
  return `${dateString}${DEFAULT_TIME}`;
};

/**
 * Prepara um objeto de intervalo de datas para uso na API do Meta
 * @param {string} startDate - Data inicial no formato YYYY-MM-DD
 * @param {string} endDate - Data final no formato YYYY-MM-DD
 * @returns {Object} Objeto time_range compatível com a API do Meta
 */
const prepareMetaTimeRange = (startDate, endDate) => {
  return {
    since: formatToStandardDate(startDate),
    until: formatToStandardDate(endDate)
  };
};

/**
 * Converte um timestamp para o formato padrão YYYY-MM-DD
 * @param {number} timestamp - Timestamp em milissegundos
 * @returns {string} Data formatada como YYYY-MM-DD
 */
const timestampToStandardDate = (timestamp) => {
  if (!timestamp) return null;
  return formatToStandardDate(new Date(Number(timestamp)));
};

/**
 * Formata todas as datas em um objeto
 * @param {Object} obj - Objeto contendo propriedades de data
 * @param {Array} dateFields - Array com nomes das propriedades que são datas
 * @returns {Object} Objeto com as datas formatadas
 */
const formatEntityDates = (obj, dateFields) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const formattedObj = { ...obj };
  
  dateFields.forEach(field => {
    if (formattedObj[field]) {
      formattedObj[field] = formatToStandardDate(formattedObj[field]);
    }
  });
  
  return formattedObj;
};

/**
 * Valida se uma string é uma data válida no formato YYYY-MM-DD
 * @param {string} dateString - String de data a ser validada
 * @returns {boolean} Verdadeiro se for uma data válida
 */
const isValidDateFormat = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;
  
  // Verifica o formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  
  // Verifica se é uma data válida
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
};

/**
 * Valida um intervalo de datas
 * Verifica se as datas estão em formato válido e se a data inicial é anterior à final
 * @param {string} startDate - Data inicial no formato YYYY-MM-DD
 * @param {string} endDate - Data final no formato YYYY-MM-DD
 * @returns {boolean} Verdadeiro se o intervalo for válido
 */
const validateDateRange = (startDate, endDate) => {
  if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
    return false;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end;
};

/**
 * Formata uma data para uso na API
 * @param {Date} date - Objeto Date para formatar
 * @returns {string} Data formatada como YYYY-MM-DD
 */
const formatDateForApi = (date) => {
  if (!date || !(date instanceof Date)) return null;
  return format(date, DEFAULT_DATE_FORMAT);
};

module.exports = {
  formatToStandardDate,
  addDefaultTime,
  prepareMetaTimeRange,
  timestampToStandardDate,
  formatEntityDates,
  isValidDateFormat,
  validateDateRange,
  formatDateForApi,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIMEZONE,
  DEFAULT_TIME
};
