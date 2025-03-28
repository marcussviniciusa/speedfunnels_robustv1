/**
 * Serviço de API com tratamento consistente de datas
 * Garante sincronização precisa entre frontend e backend
 */

import axios from 'axios';
import { format, parse } from 'date-fns';

// Constantes
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DATE_FORMAT = 'yyyy-MM-dd';

// Cliente axios configurado
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Interceptador para padronizar parâmetros de data
api.interceptors.request.use((config) => {
  // Clone dos parâmetros para modificação segura
  const newConfig = { ...config };
  
  // Se há parâmetros e são do tipo objeto (não FormData)
  if (newConfig.params && typeof newConfig.params === 'object' && !(newConfig.params instanceof FormData)) {
    const formattedParams = { ...newConfig.params };
    
    // Formatar datas nos parâmetros
    if (formattedParams.startDate) {
      formattedParams.startDate = formatDate(formattedParams.startDate);
    }
    
    if (formattedParams.endDate) {
      formattedParams.endDate = formatDate(formattedParams.endDate);
    }
    
    // Atualizar parâmetros com valores formatados
    newConfig.params = formattedParams;
    
    // Log para depuração (em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.debug('API Request:', {
        url: newConfig.url,
        params: formattedParams,
      });
    }
  }
  
  return newConfig;
});

// Interceptador para padronizar datas nas respostas
api.interceptors.response.use(
  (response) => {
    // Log para depuração (em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.debug('API Response:', {
        url: response.config.url,
        status: response.status,
      });
    }
    
    return response;
  },
  (error) => {
    // Log de erro detalhado
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    
    return Promise.reject(error);
  }
);

/**
 * Formata uma data para o formato padrão YYYY-MM-DD
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data formatada
 */
const formatDate = (date) => {
  if (!date) return null;
  
  // Se já for string no formato correto
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  try {
    // Se for objeto Date
    if (date instanceof Date) {
      return format(date, DATE_FORMAT);
    }
    
    // Se for string em outro formato, tentar converter
    return format(new Date(date), DATE_FORMAT);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return date; // Retorna original como fallback
  }
};

/**
 * Valida um objeto de filtro de data
 * @param {Object} dateFilter - Objeto com startDate e endDate
 * @returns {boolean} Indica se o filtro é válido
 */
const validateDateFilter = (dateFilter) => {
  if (!dateFilter || !dateFilter.startDate || !dateFilter.endDate) {
    return false;
  }
  
  // Validar formato das datas
  const startDateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateFilter.startDate);
  const endDateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateFilter.endDate);
  
  if (!startDateValid || !endDateValid) {
    return false;
  }
  
  // Validar se a data inicial é anterior à data final
  const startDate = new Date(dateFilter.startDate);
  const endDate = new Date(dateFilter.endDate);
  
  return startDate <= endDate;
};

// Serviços específicos de campanha

/**
 * Obtém lista de campanhas com filtros
 * @param {Object} filters - Filtros (status, startDate, endDate, etc.)
 * @param {number} page - Página atual
 * @param {number} limit - Itens por página
 * @returns {Promise} Promessa com os dados
 */
const getCampaigns = async (filters = {}, page = 1, limit = 10) => {
  // Garantir formato correto das datas nos filtros
  const formattedFilters = { ...filters };
  
  if (formattedFilters.startDate) {
    formattedFilters.startDate = formatDate(formattedFilters.startDate);
  }
  
  if (formattedFilters.endDate) {
    formattedFilters.endDate = formatDate(formattedFilters.endDate);
  }
  
  try {
    const response = await api.get('/campaigns', {
      params: {
        ...formattedFilters,
        page,
        limit,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    throw error;
  }
};

/**
 * Obtém detalhes de uma campanha específica
 * @param {string} id - ID da campanha
 * @returns {Promise} Promessa com os dados
 */
const getCampaignById = async (id) => {
  try {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar campanha ${id}:`, error);
    throw error;
  }
};

/**
 * Obtém dados de desempenho de uma campanha
 * @param {string} id - ID da campanha
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @param {string} granularity - Granularidade (day, week, month)
 * @returns {Promise} Promessa com os dados
 */
const getCampaignPerformance = async (id, startDate, endDate, granularity = 'day') => {
  // Validar e formatar datas
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  
  // Validação das datas
  if (!formattedStartDate || !formattedEndDate) {
    throw new Error('Datas inválidas. Use o formato YYYY-MM-DD');
  }
  
  try {
    const response = await api.get(`/campaigns/${id}/performance`, {
      params: {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        granularity,
      },
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar desempenho da campanha ${id}:`, error);
    throw error;
  }
};

/**
 * Obtém anúncios de uma campanha
 * @param {string} id - ID da campanha
 * @returns {Promise} Promessa com os dados
 */
const getCampaignAds = async (id) => {
  try {
    const response = await api.get(`/campaigns/${id}/ads`);
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar anúncios da campanha ${id}:`, error);
    throw error;
  }
};

/**
 * Obtém estatísticas gerais para o dashboard
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Promise} Promessa com os dados
 */
const getDashboardStats = async (startDate, endDate) => {
  // Validar e formatar datas
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  
  // Validação das datas
  if (!formattedStartDate || !formattedEndDate) {
    throw new Error('Datas inválidas. Use o formato YYYY-MM-DD');
  }
  
  try {
    const response = await api.get('/stats/dashboard', {
      params: {
        startDate: formattedStartDate,
        endDate: formattedEndDate
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    throw error;
  }
};

export {
  api as default,
  getCampaigns,
  getCampaignById,
  getCampaignPerformance,
  getCampaignAds,
  getDashboardStats,
  formatDate,
  validateDateFilter,
  DATE_FORMAT
};
