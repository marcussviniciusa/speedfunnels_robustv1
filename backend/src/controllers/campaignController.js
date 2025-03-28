/**
 * Controlador de Campanhas
 * Implementa lógica robusta para garantir sincronização precisa com a API do Meta
 */

const { Op } = require('sequelize');
const Campaign = require('../models/Campaign');
const metaApiService = require('../services/metaApiService');
const logger = require('../utils/logger');
const { 
  formatToStandardDate, 
  prepareMetaTimeRange, 
  formatEntityDates,
  isValidDateFormat 
} = require('../utils/dateUtils');

class CampaignController {
  /**
   * Obtém todas as campanhas com filtros e paginação
   * Garante formatação consistente de datas em parâmetros e resultados
   */
  async getCampaigns(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status,
        startDate,
        endDate, 
        sort = 'updatedAt',
        order = 'DESC' 
      } = req.query;

      // Validação e formatação das datas de filtro
      let formattedStartDate = startDate ? formatToStandardDate(startDate) : null;
      let formattedEndDate = endDate ? formatToStandardDate(endDate) : null;

      // Log detalhado para depuração
      logger.debug('Parâmetros de filtro para busca de campanhas', {
        originalDates: { startDate, endDate },
        formattedDates: { formattedStartDate, formattedEndDate },
        otherParams: { status, sort, order, page, limit }
      });

      // Construção dos filtros
      const where = {};
      
      if (status) where.status = status;
      
      if (formattedStartDate && formattedEndDate) {
        where.startDate = {
          [Op.gte]: formattedStartDate,
        };
        where.endDate = {
          [Op.lte]: formattedEndDate,
        };
      } else if (formattedStartDate) {
        where.startDate = {
          [Op.gte]: formattedStartDate,
        };
      } else if (formattedEndDate) {
        where.endDate = {
          [Op.lte]: formattedEndDate,
        };
      }

      // Configuração da paginação
      const offset = (page - 1) * limit;
      
      // Execução da consulta
      const { count, rows } = await Campaign.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [[sort, order]],
      });

      // Formatação consistente de datas antes de enviar a resposta
      const formattedCampaigns = rows.map(campaign => {
        const plainCampaign = campaign.get({ plain: true });
        return formatEntityDates(plainCampaign, [
          'startDate', 
          'endDate', 
          'createdAt', 
          'updatedAt', 
          'lastSyncedAt'
        ]);
      });

      // Log de validação dos resultados
      logger.debug(`Retornando ${formattedCampaigns.length} campanhas (total: ${count})`, {
        firstResult: formattedCampaigns.length > 0 ? JSON.stringify(formattedCampaigns[0]) : 'Sem resultados'
      });

      // Resposta formatada
      return res.status(200).json({
        success: true,
        data: formattedCampaigns,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      logger.error('Erro ao buscar campanhas:', {
        message: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar campanhas',
        message: error.message,
      });
    }
  }

  /**
   * Obtém detalhes de uma campanha específica
   * Garante que os dados estão sincronizados com a API do Meta
   */
  async getCampaignById(req, res) {
    try {
      const { id } = req.params;
      
      // Busca no banco local
      const campaign = await Campaign.findByPk(id);
      
      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campanha não encontrada',
        });
      }
      
      // Formatação consistente de datas
      const formattedCampaign = formatEntityDates(
        campaign.get({ plain: true }), 
        ['startDate', 'endDate', 'createdAt', 'updatedAt', 'lastSyncedAt']
      );
      
      // Valida se os dados estão sincronizados com a API do Meta
      // (opcional, pode ser ativado com um query param)
      if (req.query.validateSync === 'true') {
        await this.validateAndSyncCampaign(id, formattedCampaign);
      }
      
      return res.status(200).json({
        success: true,
        data: formattedCampaign,
      });
    } catch (error) {
      logger.error(`Erro ao buscar campanha por ID (${req.params.id}):`, {
        message: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar campanha',
        message: error.message,
      });
    }
  }

  /**
   * Obtém o desempenho de uma campanha específica
   * Garante sincronização precisa com a API do Meta
   */
  async getCampaignPerformanceById(req, res) {
    try {
      const { id } = req.params;
      const { 
        startDate, 
        endDate, 
        granularity = 'day'
      } = req.query;
      
      // Validação e formatação das datas
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetros de data são obrigatórios',
          message: 'Os parâmetros startDate e endDate são obrigatórios',
        });
      }
      
      // Formatação consistente das datas
      const formattedStartDate = formatToStandardDate(startDate);
      const formattedEndDate = formatToStandardDate(endDate);
      
      // Verificação de datas válidas
      if (!isValidDateFormat(formattedStartDate) || !isValidDateFormat(formattedEndDate)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de data inválido',
          message: 'As datas devem estar no formato YYYY-MM-DD',
        });
      }
      
      if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
        return res.status(400).json({
          success: false,
          error: 'Intervalo de datas inválido',
          message: 'A data inicial deve ser anterior à data final',
        });
      }
      
      // Log detalhado para depuração
      logger.debug('Parâmetros para busca de desempenho de campanha', {
        campaignId: id,
        originalDates: { startDate, endDate },
        formattedDates: { formattedStartDate, formattedEndDate },
        granularity
      });
      
      // Preparação dos parâmetros para a API do Meta
      const timeRange = prepareMetaTimeRange(formattedStartDate, formattedEndDate);
      
      // Campos para obter da API
      const fields = [
        'campaign_name',
        'impressions',
        'reach',
        'clicks',
        'spend',
        'conversions',
        'cpc',
        'cpm',
        'ctr',
        'frequency',
      ];
      
      // Busca de insights na API do Meta com validação rigorosa de datas
      const insightsResponse = await metaApiService.getInsights(id, 'campaign', {
        time_range: JSON.stringify(timeRange),
        fields: fields.join(','),
        time_increment: granularity === 'day' ? 1 : (granularity === 'week' ? 7 : 30),
        limit: 1000, // Garantir que pegamos todos os dados
      });
      
      if (!insightsResponse || !insightsResponse.data || insightsResponse.data.length === 0) {
        logger.warn(`Sem dados de desempenho para a campanha ${id} no período especificado`);
        return res.status(200).json({
          success: true,
          data: [],
          timeRange: {
            startDate: formattedStartDate,
            endDate: formattedEndDate,
          },
        });
      }
      
      // Formatação e processamento dos dados
      const performanceData = insightsResponse.data.map(item => {
        // Garantir formatação consistente de datas
        const formattedItem = {
          ...item,
          date_start: formatToStandardDate(item.date_start),
          date_stop: formatToStandardDate(item.date_stop),
        };
        
        // Cálculos adicionais
        if (formattedItem.impressions && formattedItem.conversions) {
          formattedItem.conversion_rate = (formattedItem.conversions / formattedItem.impressions) * 100;
        }
        
        if (formattedItem.conversions && formattedItem.spend) {
          formattedItem.cost_per_conversion = formattedItem.spend / formattedItem.conversions;
        }
        
        return formattedItem;
      });
      
      // Ordenação por data para garantir sequência temporal
      performanceData.sort((a, b) => {
        return new Date(a.date_start) - new Date(b.date_start);
      });
      
      // Validação final de consistência de datas
      const validationResult = this.validateDateConsistency(
        performanceData, 
        formattedStartDate, 
        formattedEndDate
      );
      
      if (!validationResult.isValid) {
        logger.warn('Inconsistência de datas detectada na resposta da API', validationResult);
      }
      
      return res.status(200).json({
        success: true,
        data: performanceData,
        timeRange: {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
        },
        // Incluir informações de validação na resposta para depuração
        validation: process.env.NODE_ENV === 'development' ? validationResult : undefined
      });
    } catch (error) {
      logger.error(`Erro ao buscar desempenho da campanha ${req.params.id}:`, {
        message: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar desempenho da campanha',
        message: error.message,
      });
    }
  }

  /**
   * Valida e sincroniza uma campanha com a API do Meta
   * @param {string} campaignId - ID da campanha
   * @param {Object} localCampaign - Dados locais da campanha
   * @returns {Promise<Object>} Campanha sincronizada
   */
  async validateAndSyncCampaign(campaignId, localCampaign) {
    try {
      // Obter dados atualizados da API do Meta
      const metaCampaign = await metaApiService.getCampaignDetails(campaignId);
      
      if (!metaCampaign) {
        logger.warn(`Campanha ${campaignId} não encontrada na API do Meta`);
        return localCampaign;
      }
      
      // Comparação de dados para identificar inconsistências
      const differences = logger.compareData(
        {
          name: localCampaign.name,
          status: localCampaign.status,
          startDate: localCampaign.startDate,
          endDate: localCampaign.endDate,
        },
        {
          name: metaCampaign.name,
          status: metaCampaign.status,
          startDate: formatToStandardDate(metaCampaign.start_time),
          endDate: formatToStandardDate(metaCampaign.stop_time),
        },
        { campaignId, source: 'validateAndSyncCampaign' }
      );
      
      // Se encontrou diferenças, atualizar o registro local
      if (differences.length > 0) {
        logger.syncInfo(`Sincronizando campanha ${campaignId} com dados da API`, { 
          differences 
        });
        
        // Buscar o modelo para atualização
        const dbCampaign = await Campaign.findByPk(campaignId);
        
        if (dbCampaign) {
          // Sincronizar com dados da API
          dbCampaign.syncFromMetaApi(metaCampaign);
          await dbCampaign.save();
          
          // Retornar dados atualizados
          const updatedCampaign = dbCampaign.get({ plain: true });
          return formatEntityDates(
            updatedCampaign, 
            ['startDate', 'endDate', 'createdAt', 'updatedAt', 'lastSyncedAt']
          );
        }
      }
      
      return localCampaign;
    } catch (error) {
      logger.error(`Erro ao validar e sincronizar campanha ${campaignId}:`, {
        message: error.message,
        stack: error.stack
      });
      
      return localCampaign;
    }
  }

  /**
   * Valida a consistência das datas nos dados de desempenho
   * @param {Array} performanceData - Dados de desempenho da campanha
   * @param {string} expectedStartDate - Data inicial esperada
   * @param {string} expectedEndDate - Data final esperada
   * @returns {Object} Resultado da validação
   */
  validateDateConsistency(performanceData, expectedStartDate, expectedEndDate) {
    if (!performanceData || performanceData.length === 0) {
      return {
        isValid: false,
        message: 'Sem dados para validar',
      };
    }
    
    // Ordenar dados por data
    const sortedData = [...performanceData].sort(
      (a, b) => new Date(a.date_start) - new Date(b.date_start)
    );
    
    // Verificar datas de início e fim
    const firstDate = formatToStandardDate(sortedData[0].date_start);
    const lastDate = formatToStandardDate(sortedData[sortedData.length -
1].date_stop);
    
    const isStartDateValid = firstDate === expectedStartDate;
    const isEndDateValid = lastDate === expectedEndDate;
    
    // Verificar sequência temporal sem lacunas
    let hasGaps = false;
    for (let i = 1; i < sortedData.length; i++) {
      const prevEndDate = new Date(sortedData[i-1].date_stop);
      const currentStartDate = new Date(sortedData[i].date_start);
      
      if (prevEndDate.getTime() !== currentStartDate.getTime() - 86400000) { // 1 dia em ms
        hasGaps = true;
        break;
      }
    }
    
    return {
      isValid: isStartDateValid && isEndDateValid && !hasGaps,
      firstDate,
      lastDate,
      expectedStartDate,
      expectedEndDate,
      hasGaps,
      isStartDateValid,
      isEndDateValid,
      message: isStartDateValid && isEndDateValid && !hasGaps
        ? 'Dados consistentes'
        : 'Inconsistência nos dados de data'
    };
  }
  
  /**
   * Obtém anúncios associados a uma campanha
   * Garante sincronização e formatação consistente de datas
   */
  async getAdsByCampaignId(req, res) {
    try {
      const { id } = req.params;
      
      // Obter anúncios da API do Meta
      const ads = await metaApiService.getAdsByCampaignId(id);
      
      if (!ads || ads.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
      
      // Formatação consistente de datas
      const formattedAds = ads.map(ad => {
        return formatEntityDates(ad, ['created_time', 'updated_time']);
      });
      
      return res.status(200).json({
        success: true,
        data: formattedAds,
      });
    } catch (error) {
      logger.error(`Erro ao buscar anúncios da campanha ${req.params.id}:`, {
        message: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar anúncios da campanha',
        message: error.message,
      });
    }
  }
}

module.exports = new CampaignController();
