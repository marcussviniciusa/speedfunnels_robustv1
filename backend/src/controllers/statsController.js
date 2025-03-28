/**
 * Controller para estatísticas e métricas consolidadas
 * Garante dados consistentes para o dashboard
 */

const { Campaign } = require('../models');
const { Op } = require('sequelize');
const metaApiService = require('../services/metaApiService');
const { validateDateRange, formatDateForApi } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Retorna estatísticas consolidadas para o dashboard
 * Inclui comparações e tendências entre períodos
 */
const getDashboardStats = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    
    // Validar o intervalo de datas
    if (!validateDateRange(startDate, endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Intervalo de datas inválido. Use o formato YYYY-MM-DD'
      });
    }
    
    // Obter a data atual e normalizar para comparações
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a hora para comparação precisa
    const formattedToday = formatDateForApi(today);
    
    // Armazenar as datas originais solicitadas para logs
    const originalStartDate = startDate;
    const originalEndDate = endDate;
    
    // Verificar se as datas solicitadas estão no futuro
    const requestedEndDate = new Date(endDate);
    requestedEndDate.setHours(0, 0, 0, 0);
    if (requestedEndDate > today) {
      logger.warn('Data solicitada está no futuro, ajustando para hoje', {
        requestedEndDate: endDate,
        adjustedTo: formattedToday
      });
      endDate = formattedToday;
    }
    
    // Verificar se a data inicial também está no futuro
    const requestedStartDate = new Date(startDate);
    requestedStartDate.setHours(0, 0, 0, 0);
    if (requestedStartDate > today) {
      logger.warn('Data inicial solicitada está no futuro, ajustando para hoje', {
        requestedStartDate: startDate,
        adjustedTo: formattedToday
      });
      startDate = formattedToday;
    }
    
    logger.info('Buscando estatísticas para o dashboard', { startDate, endDate });
    
    // Usar as datas validadas e potencialmente ajustadas
    const currentStartDate = new Date(startDate);
    const currentEndDate = new Date(endDate);
    
    // Garantir que as datas não tenham componentes de hora que possam afetar as comparações
    currentStartDate.setHours(0, 0, 0, 0);
    currentEndDate.setHours(0, 0, 0, 0);
    
    // Garantir que estamos usando as datas ajustadas, não as originais
    if (currentEndDate > today) {
      currentEndDate.setTime(today.getTime());
    }
    
    if (currentStartDate > today) {
      currentStartDate.setTime(today.getTime());
    }
    
    // Calcular a duração do período em milissegundos
    const periodDuration = currentEndDate.getTime() - currentStartDate.getTime();
    
    // Calcular datas do período anterior para comparação
    // Usamos a duração do período atual para determinar o período anterior
    const previousEndDate = new Date(currentStartDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1); // Dia anterior ao início do período atual
    
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setTime(previousStartDate.getTime() - periodDuration); // Mesmo número de dias que o período atual
    
    // Formatar datas para a API - usando diretamente as datas validadas sem modificações adicionais
    // Importante: Não devemos modificar as datas validadas exceto para casos futuros
    const formattedCurrentStartDate = formatDateForApi(currentStartDate);
    const formattedCurrentEndDate = formatDateForApi(currentEndDate);
    const formattedPreviousStartDate = formatDateForApi(previousStartDate);
    const formattedPreviousEndDate = formatDateForApi(previousEndDate);
    
    // Log das datas formatadas para depuração
    logger.info('Datas formatadas para API:', {
      currentStartDate: formattedCurrentStartDate,
      currentEndDate: formattedCurrentEndDate,
      previousStartDate: formattedPreviousStartDate,
      previousEndDate: formattedPreviousEndDate
    });
    
    // Verificar se a data final é hoje (usando a variável today já definida acima)
    const isEndDateToday = (
      currentEndDate.getDate() === today.getDate() &&
      currentEndDate.getMonth() === today.getMonth() &&
      currentEndDate.getFullYear() === today.getFullYear()
    );
    
    logger.info(`Verificando se a data final é hoje: ${isEndDateToday}`, {
      endDate: formattedCurrentEndDate,
      today: formattedToday,
      endDateObj: {
        day: currentEndDate.getDate(),
        month: currentEndDate.getMonth(),
        year: currentEndDate.getFullYear()
      },
      todayObj: {
        day: today.getDate(),
        month: today.getMonth(),
        year: today.getFullYear()
      }
    });
    
    // Buscar dados do período atual via API Meta usando as datas originais ajustadas (não as formatadas)
    // Este é o ponto chave para garantir que estamos buscando os dados do dia correto
    // Vamos usar as datas originais que foram validadas para não perder precisão
    const currentPeriodData = await metaApiService.getAccountPerformance(
      startDate,  // Usar a data original validada (ou ajustada se estava no futuro)
      endDate,    // Usar a data original validada (ou ajustada se estava no futuro)
      false       // impedir a geração de dados simulados
    );
    
    // Calcular as datas do período anterior com base nas datas originais validadas
    const daysInPeriod = Math.round(periodDuration / (24 * 60 * 60 * 1000));
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - daysInPeriod - 1);
    const previousEnd = new Date(startDate);
    previousEnd.setDate(previousEnd.getDate() - 1);
    
    // Formatar datas para API
    const formattedPreviousStart = formatDateForApi(previousStart);
    const formattedPreviousEnd = formatDateForApi(previousEnd);
    
    // Buscar dados do período anterior via API Meta
    const previousPeriodData = await metaApiService.getAccountPerformance(
      formattedPreviousStart,
      formattedPreviousEnd,
      false // impedir a geração de dados simulados
    );
    
    // Extrair e somar métricas do período atual
    const current = aggregatePeriodData(currentPeriodData);
    
    // Extrair e somar métricas do período anterior
    const previous = aggregatePeriodData(previousPeriodData);
    
    // Verificar se temos dados vazios devido a datas futuras
    if (current.dataPointsCount === 0 && isEndDateToday) {
      logger.info('Período atual sem dados, possivelmente devido à data de hoje');
    }
    
    // Contar campanhas ativas no período
    const activeCampaignsCount = await Campaign.count({
      where: {
        status: 'ACTIVE',
        startDate: {
          [Op.lte]: formattedCurrentEndDate
        },
        endDate: {
          [Op.gte]: formattedCurrentStartDate
        }
      }
    });
    
    // Montar objeto de resposta com métricas atuais e anteriores
    const stats = {
      success: true,
      data: {
        // Métricas principais
        impressions: current.impressions,
        clicks: current.clicks,
        spend: current.spend,
        ctr: current.impressions ? (current.clicks / current.impressions) * 100 : 0,
        costPerClick: current.clicks ? current.spend / current.clicks : 0,
        conversions: current.conversions,
        
        // Métricas de compras (nova categoria)
        purchases: current.purchases || 0,
        revenue: current.revenue || 0,
        
        // Métricas de conversão
        conversionRate: current.clicks ? (current.conversions / current.clicks) * 100 : 0,
        costPerConversion: current.conversions ? current.spend / current.conversions : 0,
        roas: current.spend ? (current.revenue / current.spend) * 100 : 0,
        
        // Métricas do período anterior
        previousImpressions: previous.impressions,
        previousClicks: previous.clicks,
        previousSpend: previous.spend,
        previousCtr: previous.impressions ? (previous.clicks / previous.impressions) * 100 : 0,
        previousCostPerClick: previous.clicks ? previous.spend / previous.clicks : 0,
        previousConversions: previous.conversions,
        previousPurchases: previous.purchases || 0,
        previousRevenue: previous.revenue || 0,
        previousConversionRate: previous.clicks ? (previous.conversions / previous.clicks) * 100 : 0,
        previousCostPerConversion: previous.conversions ? previous.spend / previous.conversions : 0,
        previousRoas: previous.spend ? (previous.revenue / previous.spend) * 100 : 0,
        
        // Meta-informações
        activeCampaigns: activeCampaignsCount,
        hasSimulatedData: false,
        requestedPeriod: {
          startDate: originalStartDate,
          endDate: originalEndDate
        },
        currentPeriod: {
          startDate: startDate,           // Usar a data validada diretamente
          endDate: endDate                // Usar a data validada diretamente
        },
        previousPeriod: {
          startDate: formattedPreviousStart,  // Usar as novas datas calculadas corretamente
          endDate: formattedPreviousEnd       // Usar as novas datas calculadas corretamente
        }
      }
    };
    
    // Validação final dos dados retornados
    logger.info('Estatísticas preparadas para retorno:', {
      requestedStartDate: originalStartDate,
      requestedEndDate: originalEndDate,
      processedStartDate: formattedCurrentStartDate,
      processedEndDate: formattedCurrentEndDate,
      today: formatDateForApi(today),
      isEndDateToday,
      dataPointsCount: currentPeriodData.length,
      hasSimulatedData: false, // garantir que não sejam reportados dados simulados
      metrics: {
        impressions: current.impressions,
        clicks: current.clicks,
        spend: current.spend,
        conversions: current.conversions,
        purchases: current.purchases || 0,
        revenue: current.revenue || 0
      }
    });
    
    return res.json(stats);
  } catch (error) {
    logger.error('Erro ao buscar estatísticas do dashboard', { error: error.message });
    
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas do dashboard'
    });
  }
};

/**
 * Agrega dados de performance de um período
 * @param {Array} periodData - Array de dados diários
 * @returns {Object} Objeto com métricas agregadas
 */
const aggregatePeriodData = (periodData) => {
  if (!periodData || !Array.isArray(periodData) || periodData.length === 0) {
    return {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      purchases: 0,
      revenue: 0
    };
  }
  
  // Reduzir array de dados em um objeto com somas
  return periodData.reduce((aggregated, day) => {
    return {
      impressions: aggregated.impressions + (parseInt(day.impressions) || 0),
      clicks: aggregated.clicks + (parseInt(day.clicks) || 0),
      spend: aggregated.spend + (parseFloat(day.spend) || 0),
      conversions: aggregated.conversions + (parseInt(day.conversions) || 0),
      purchases: aggregated.purchases + (parseInt(day.purchases) || 0),
      revenue: aggregated.revenue + (parseFloat(day.revenue) || 0)
    };
  }, {
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    purchases: 0,
    revenue: 0
  });
};

module.exports = {
  getDashboardStats
};
