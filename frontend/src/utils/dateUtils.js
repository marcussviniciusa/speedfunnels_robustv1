/**
 * Utilitários para manipulação de datas no frontend
 * Garante consistência com o backend e API do Meta
 */

import { format, parse, isValid, parseISO, isBefore, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Constantes
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DISPLAY_FORMAT = 'dd/MM/yyyy';
export const API_FORMAT = 'yyyy-MM-dd';

/**
 * Formata uma data para o formato padrão da API (YYYY-MM-DD)
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export const formatToApiDate = (date) => {
  if (!date) return null;
  
  // Se já estiver no formato correto
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  try {
    let dateObj;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Tentar parse ISO
      dateObj = parseISO(date);
      
      // Se não for válido, tentar como string no formato DD/MM/YYYY
      if (!isValid(dateObj) && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        dateObj = parse(date, DISPLAY_FORMAT, new Date());
      }
    } else {
      // Caso seja timestamp
      dateObj = new Date(date);
    }
    
    // Verificar se a data é válida
    if (!isValid(dateObj)) {
      console.warn('Data inválida:', date);
      return null;
    }
    
    return format(dateObj, API_FORMAT);
  } catch (error) {
    console.error('Erro ao formatar data para API:', error);
    return null;
  }
};

/**
 * Formata uma data para exibição ao usuário (DD/MM/YYYY)
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data formatada para exibição
 */
export const formatToDisplayDate = (date) => {
  if (!date) return '';
  
  try {
    let dateObj;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Se for no formato API (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        dateObj = parse(date, API_FORMAT, new Date());
      } else {
        // Tentar como ISO
        dateObj = parseISO(date);
      }
    } else {
      // Caso seja timestamp
      dateObj = new Date(date);
    }
    
    // Verificar se a data é válida
    if (!isValid(dateObj)) {
      console.warn('Data inválida para exibição:', date);
      return '';
    }
    
    return format(dateObj, DISPLAY_FORMAT, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data para exibição:', error);
    return '';
  }
};

/**
 * Converte um objeto com campos de data para usar datas no formato da API
 * @param {Object} obj - Objeto com campos de data
 * @param {Array} dateFields - Array com nomes dos campos que são datas
 * @returns {Object} Objeto com datas formatadas
 */
export const formatObjectDates = (obj, dateFields) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  dateFields.forEach(field => {
    if (result[field]) {
      result[field] = formatToApiDate(result[field]);
    }
  });
  
  return result;
};

/**
 * Cria filtro de data para os últimos N dias
 * @param {number} days - Número de dias
 * @returns {Object} Objeto com startDate e endDate
 */
export const getLastDaysFilter = (days) => {
  const endDate = new Date();
  const startDate = subDays(endDate, days);
  
  return {
    startDate: formatToApiDate(startDate),
    endDate: formatToApiDate(endDate)
  };
};

/**
 * Cria filtro de data para o mês atual
 * @returns {Object} Objeto com startDate e endDate
 */
export const getCurrentMonthFilter = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date();
  
  return {
    startDate: formatToApiDate(startDate),
    endDate: formatToApiDate(endDate)
  };
};

/**
 * Valida um objeto de filtro de data
 * @param {Object} filter - Filtro com startDate e endDate
 * @returns {Object} Objeto com resultado da validação
 */
export const validateDateFilter = (filter) => {
  const result = {
    isValid: false,
    startDate: null,
    endDate: null,
    errors: []
  };
  
  // Verificar se o filtro existe e tem as propriedades necessárias
  if (!filter || !filter.startDate || !filter.endDate) {
    result.errors.push('Filtro de data incompleto');
    return result;
  }
  
  // Formatar e validar datas
  const startDate = formatToApiDate(filter.startDate);
  const endDate = formatToApiDate(filter.endDate);
  
  if (!startDate) {
    result.errors.push('Data inicial inválida');
  }
  
  if (!endDate) {
    result.errors.push('Data final inválida');
  }
  
  // Se ambas as datas são válidas, verificar se startDate <= endDate
  if (startDate && endDate) {
    const startObj = parse(startDate, API_FORMAT, new Date());
    const endObj = parse(endDate, API_FORMAT, new Date());
    
    if (isBefore(endObj, startObj)) {
      result.errors.push('A data final deve ser posterior à data inicial');
    } else {
      // Tudo válido
      result.isValid = true;
      result.startDate = startDate;
      result.endDate = endDate;
    }
  }
  
  return result;
};

/**
 * Formata uma string de data para um objeto JavaScript Date
 * @param {string} dateString - String de data no formato YYYY-MM-DD
 * @returns {Date} Objeto Date
 */
export const parseApiDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return parse(dateString, API_FORMAT, new Date());
    }
    return parseISO(dateString);
  } catch (error) {
    console.error('Erro ao converter string para Date:', error);
    return null;
  }
};
