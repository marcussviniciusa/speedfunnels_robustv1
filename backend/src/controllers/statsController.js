/**
 * Controller para estatísticas e métricas consolidadas
 * Garante dados consistentes para o dashboard
 */

const { Campaign } = require('../models');
const { Op } = require('sequelize');
const metaApiService = require('../services/metaApiService');
const { validateDateRange, formatDateForApi } = require('../utils/dateUtils');
const { format } = require('date-fns');
const logger = require('../utils/logger');

/**
 * Retorna estatísticas consolidadas para o dashboard
 * Inclui comparações e tendências entre períodos
 */
const getDashboardStats = async (req, res) => {
  try {
    // Extrair parâmetros da requisição
    const { startDate, endDate, accountId } = req.query;
    
    // Validar datas
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Datas de início e fim são obrigatórias.' });
    }
    
    // Converter para datas JS e validar
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const today = new Date();
    
    // Verificar se as datas são válidas
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ success: false, error: 'Datas inválidas. Use o formato YYYY-MM-DD.' });
    }
    
    // Verificar se a data de início é posterior à data de fim
    if (startDateObj > endDateObj) {
      return res.status(400).json({ success: false, error: 'A data de início não pode ser posterior à data de fim.' });
    }
    
    // Ajustar datas futuras para o dia atual
    let adjustedStartDate = startDate;
    let adjustedEndDate = endDate;
    
    if (startDateObj > today) {
      adjustedStartDate = formatDateForApi(today);
      logger.warn(`Data de início no futuro ajustada para hoje: ${adjustedStartDate}`);
    }
    
    if (endDateObj > today) {
      adjustedEndDate = formatDateForApi(today);
      logger.warn(`Data de fim no futuro ajustada para hoje: ${adjustedEndDate}`);
    }
    
    // Log das datas processadas
    logger.info({
      requestedStartDate: startDate,
      requestedEndDate: endDate,
      processedStartDate: adjustedStartDate,
      processedEndDate: adjustedEndDate,
      today: formatDateForApi(today),
      isEndDateToday: formatDateForApi(endDateObj) === formatDateForApi(today),
      dayOfWeek: {
        day: today.getDate(),
        month: today.getMonth(),
        year: today.getFullYear()
      }
    });
    
    // Buscar dados do período atual via API Meta usando as datas originais ajustadas (não as formatadas)
    // Este é o ponto chave para garantir que estamos buscando os dados do dia correto
    // Vamos usar as datas originais que foram validadas para não perder precisão
    const currentPeriodData = await metaApiService.getAccountPerformance(
      adjustedStartDate,  // Usar a data ajustada
      adjustedEndDate,    // Usar a data ajustada
      false,      // impedir a geração de dados simulados
      'day',       // garantir que os dados sejam diários
      accountId    // passar o ID da conta selecionada, se houver
    );
    
    // Log para debug dos dados diários
    logger.info(`Dados diários recebidos: ${currentPeriodData.length} registros`);
    
    // Garantir que temos dados para todos os dias do período, mesmo que vazios
    const allDaysInPeriod = [];
    const startDateObjNew = new Date(adjustedStartDate);
    const endDateObjNew = new Date(adjustedEndDate);
    const dayInMillis = 24 * 60 * 60 * 1000;
    
    // Criar um mapa dos dados existentes indexados por data
    const dataByDate = {};
    currentPeriodData.forEach(day => {
      dataByDate[day.date_start] = day;
    });
    
    // Preencher todos os dias do período
    for (let d = new Date(startDateObjNew); d <= endDateObjNew; d = new Date(d.getTime() + dayInMillis)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (dataByDate[dateStr]) {
        // Usamos os dados existentes
        allDaysInPeriod.push(dataByDate[dateStr]);
      } else {
        // Criamos um registro vazio para este dia
        allDaysInPeriod.push({
          date_start: dateStr,
          date_stop: dateStr,
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          purchases: 0,
          revenue: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          conversionRate: 0,
          costPerConversion: 0,
          roas: 0
        });
      }
    }
    
    logger.info(`Total de dias após preenchimento: ${allDaysInPeriod.length} dias`);
    
    // Calcular as datas do período anterior com base nas datas originais validadas
    const daysInPeriod = Math.round((endDateObjNew.getTime() - startDateObjNew.getTime()) / (24 * 60 * 60 * 1000));
    const previousStart = new Date(adjustedStartDate);
    previousStart.setDate(previousStart.getDate() - daysInPeriod - 1);
    const previousEnd = new Date(adjustedStartDate);
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
    const current = aggregatePeriodData(allDaysInPeriod);
    
    // Extrair e somar métricas do período anterior
    const previous = aggregatePeriodData(previousPeriodData);
    
    // Verificar se temos dados vazios devido a datas futuras
    if (current.dataPointsCount === 0 && formatDateForApi(endDateObj) === formatDateForApi(today)) {
      logger.info('Período atual sem dados, possivelmente devido à data de hoje');
    }
    
    // Contar campanhas ativas no período
    const activeCampaignsCount = await Campaign.count({
      where: {
        status: 'ACTIVE',
        startDate: {
          [Op.lte]: formatDateForApi(endDateObjNew)
        },
        endDate: {
          [Op.gte]: formatDateForApi(startDateObjNew)
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
        
        // Dados diários para gráficos
        dailyData: allDaysInPeriod.map(day => ({
          date_start: day.date_start,
          date_stop: day.date_stop,
          impressions: day.impressions || 0,
          clicks: day.clicks || 0,
          spend: day.spend || 0,
          conversions: day.conversions || 0,
          purchases: day.purchases || 0,
          revenue: day.revenue || 0,
          ctr: day.impressions ? (day.clicks / day.impressions) * 100 : 0,
          cpc: day.clicks ? day.spend / day.clicks : 0,
          cpm: day.impressions ? (day.spend / day.impressions) * 1000 : 0,
          conversionRate: day.clicks ? (day.conversions / day.clicks) * 100 : 0,
          costPerConversion: day.conversions ? day.spend / day.conversions : 0,
          roas: day.spend ? (day.revenue / day.spend) * 100 : 0
        })),
        
        // Meta-informações
        activeCampaigns: activeCampaignsCount,
        hasSimulatedData: false,
        requestedPeriod: {
          startDate: startDate,
          endDate: endDate
        },
        currentPeriod: {
          startDate: adjustedStartDate,           // Usar a data ajustada
          endDate: adjustedEndDate                // Usar a data ajustada
        },
        previousPeriod: {
          startDate: formattedPreviousStart,  // Usar as novas datas calculadas corretamente
          endDate: formattedPreviousEnd       // Usar as novas datas calculadas corretamente
        }
      }
    };
    
    // Validação final dos dados retornados
    logger.info('Estatísticas preparadas para retorno:', {
      requestedStartDate: startDate,
      requestedEndDate: endDate,
      processedStartDate: adjustedStartDate,
      processedEndDate: adjustedEndDate,
      today: formatDateForApi(today),
      isEndDateToday: formatDateForApi(endDateObj) === formatDateForApi(today),
      dataPointsCount: allDaysInPeriod.length,
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
