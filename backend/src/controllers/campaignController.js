/**
 * Controlador de Campanhas
 * Implementa lógica robusta para garantir sincronização precisa com a API do Meta
 */

const { Op } = require('sequelize');
const Campaign = require('../models/Campaign');
const { MetaAccount } = require('../models');
const metaApiService = require('../services/metaApiService');
const logger = require('../utils/logger');
const { 
  formatToStandardDate, 
  prepareMetaTimeRange, 
  formatEntityDates,
  isValidDateFormat 
} = require('../utils/dateUtils');

class CampaignController {
  constructor() {
    // Bind instance methods to ensure 'this' context is preserved
    this.validateDateConsistency = this.validateDateConsistency.bind(this);
    this.getCampaignPerformanceById = this.getCampaignPerformanceById.bind(this);
    this.validateAndSyncCampaign = this.validateAndSyncCampaign.bind(this);
  }

  /**
   * Obtém todas as campanhas com filtros e paginação
   * Garante formatação consistente de datas em parâmetros e resultados
   */
  async getCampaigns(req, res) {
    try {
      // Extrair parâmetros da requisição
      const {
        startDate, endDate, status,
        search, sort = 'updatedAt',
        order = 'DESC', page = 1,
        limit = 10, accountId, performanceOnly
      } = req.query;

      // Log para depuração
      logger.debug('Todos os parâmetros recebidos na request:', {
        startDate, endDate, status, search, 
        accountId, page, limit, performanceOnly
      });

      // Validar e formatar datas
      let formattedStartDate = startDate ? formatToStandardDate(startDate) : null;
      let formattedEndDate = endDate ? formatToStandardDate(endDate) : null;

      // Log detalhado dos parâmetros
      logger.debug('Parâmetros de filtro para busca de campanhas', {
        originalDates: { startDate, endDate },
        formattedDates: { formattedStartDate, formattedEndDate },
        otherParams: { sort, order, page, limit },
        accountIdInfo: {
          value: accountId,
          type: typeof accountId,
          exists: !!accountId
        }
      });

      // Construir condição WHERE para a query
      const where = {};

      // Filtro por conta
      if (accountId) {
        logger.debug('Aplicando filtro de conta:', { accountId });
        where.adAccountId = accountId;
      }
      
      // Filtro por status
      if (status) {
        where.status = status;
      }
      
      // Filtro por texto (pesquisa)
      if (search) {
        where.name = {
          [Op.and]: [
            { [Op.iLike]: `%${search}%` },
            { [Op.notILike]: '%test%' },
            { [Op.notILike]: '%teste%' }
          ]
        };
      } else {
        where.name = {
          [Op.and]: [
            { [Op.notILike]: '%test%' },
            { [Op.notILike]: '%teste%' }
          ]
        };
      }
      
      if (formattedStartDate && formattedEndDate) {
        // Lógica melhorada: incluir campanhas que:
        // 1. Começaram antes do período e terminam durante ou depois dele
        // 2. Começaram durante o período
        where[Op.and] = [
          // A campanha ou começou antes/durante o período E termina depois/durante o período, 
          // OU a campanha não tem data final (campanha em andamento)
          {
            [Op.or]: [
              // Campanhas que se sobrepõem ao período de filtro
              {
                [Op.and]: [
                  { startDate: { [Op.lte]: formattedEndDate } },  // Começou antes do fim do período
                  { 
                    [Op.or]: [
                      { endDate: { [Op.gte]: formattedStartDate } },  // Termina após o início do período
                      { endDate: { [Op.is]: null } }  // Não tem data final (em andamento)
                    ]
                  }
                ]
              },
              // Campanhas que começaram durante o período
              {
                [Op.and]: [
                  { startDate: { [Op.gte]: formattedStartDate } },
                  { startDate: { [Op.lte]: formattedEndDate } }
                ]
              }
            ]
          }
        ];
      } else if (formattedStartDate) {
        where[Op.and] = [
          {
            [Op.or]: [
              // Campanhas que começaram após a data inicial
              { startDate: { [Op.gte]: formattedStartDate } },
              // Campanhas que começaram antes mas terminam após a data inicial ou são contínuas
              {
                [Op.and]: [
                  { startDate: { [Op.lt]: formattedStartDate } },
                  { 
                    [Op.or]: [
                      { endDate: { [Op.gte]: formattedStartDate } },
                      { endDate: { [Op.is]: null } }
                    ]
                  }
                ]
              }
            ]
          }
        ];
      } else if (formattedEndDate) {
        where[Op.and] = [
          {
            [Op.or]: [
              // Campanhas que terminam antes da data final
              { endDate: { [Op.lte]: formattedEndDate } },
              // Campanhas que começam antes da data final e não têm data final
              {
                [Op.and]: [
                  { startDate: { [Op.lte]: formattedEndDate } },
                  { endDate: { [Op.is]: null } }
                ]
              }
            ]
          }
        ];
      }

      // Filter para mostrar apenas campanhas validadas
      where.syncValidated = true;

      // Log da condição WHERE
      logger.debug('Condição WHERE para query:', {
        whereObject: JSON.stringify(where),
        hasAccountIdFilter: !!where.adAccountId
      });

      // Configurar opções de paginação e ordenação
      const options = {
        where,
        order: [[sort, order]],
        limit: parseInt(limit, 10),
        offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
      };

      // Executar a consulta paginada
      const { rows, count } = await Campaign.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [[sort, order]],
        include: [
          {
            model: MetaAccount,
            as: 'metaAccount',
            attributes: ['id', 'name', 'accountId']
          }
        ]
      });

      // Formatar datas em cada item retornado
      const formattedCampaigns = rows.map(campaign => {
        const campaignData = campaign.get({ plain: true });
        return formatEntityDates(
          campaignData, 
          ['startDate', 'endDate', 'createdAt', 'updatedAt', 'lastSyncedAt']
        );
      });

      // Filtrar campanhas com dados de desempenho, se solicitado
      let finalCampaigns = formattedCampaigns;
      
      if (performanceOnly === 'true' && formattedStartDate && formattedEndDate) {
        logger.debug('Filtrando campanhas por desempenho');
        const campaignsWithPerformance = [];

        // Para cada campanha, verificar se tem dados de desempenho no período
        for (const campaign of formattedCampaigns) {
          try {
            // Buscar dados de desempenho da API do Meta
            const { metaAccountId, adAccountId } = campaign;
            const accountId = metaAccountId || adAccountId;
            
            if (!accountId) continue;

            const metaAccount = await MetaAccount.findByPk(accountId);
            if (!metaAccount) continue;

            const timeRange = prepareMetaTimeRange(formattedStartDate, formattedEndDate);
            const insights = await metaApiService.getCampaignInsights(
              metaAccount.accessToken,
              campaign.campaignId || campaign.id,
              timeRange
            );

            // Verificar se a campanha tem pelo menos um dia com impressões, cliques ou gastos > 0
            const hasPerformance = insights.some(day => 
              (day.impressions > 0 || day.clicks > 0 || parseFloat(day.spend) > 0)
            );

            if (hasPerformance) {
              campaignsWithPerformance.push(campaign);
            }
          } catch (error) {
            logger.error(`Erro ao verificar desempenho da campanha ${campaign.id}:`, error);
            // Se não conseguir verificar o desempenho, mantém a campanha na lista
            campaignsWithPerformance.push(campaign);
          }
        }

        finalCampaigns = campaignsWithPerformance;
      }

      // Retornar resultado paginado
      return res.status(200).json({
        success: true,
        totalItems: performanceOnly === 'true' ? finalCampaigns.length : count,
        totalPages: performanceOnly === 'true' 
          ? Math.ceil(finalCampaigns.length / parseInt(limit))
          : Math.ceil(count / parseInt(limit)),
        currentPage: parseInt(page),
        data: finalCampaigns
      });

    } catch (error) {
      logger.error('Erro ao buscar campanhas:', {
        message: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar campanhas',
        message: error.message
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
      const self = this;
      let validationResult = { isValid: true }; // Default value
      
      if (performanceData && performanceData.length > 0) {
        try {
          validationResult = self.validateDateConsistency(
            performanceData, 
            formattedStartDate, 
            formattedEndDate
          );
          
          if (!validationResult.isValid) {
            logger.warn('Inconsistência de datas detectada na resposta da API', validationResult);
          }
        } catch (validationError) {
          logger.warn('Erro ao validar consistência de datas', {
            message: validationError.message,
            stack: validationError.stack
          });
          // Continue with default validation result if validation fails
        }
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
    const lastDate = formatToStandardDate(sortedData[sortedData.length - 1].date_stop);
    
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

  /**
   * Sincroniza campanhas do Meta para uma conta específica
   * Busca todas as campanhas da conta no Meta e atualiza o banco de dados local
   * @param {Object} req - Objeto de requisição
   * @param {Object} res - Objeto de resposta
   */
  async syncCampaignsFromMeta(req, res) {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          success: false,
          error: 'ID da conta não fornecido'
        });
      }

      // Buscar a conta no banco de dados
      const metaAccount = await MetaAccount.findOne({
        where: { accountId }
      });

      if (!metaAccount) {
        return res.status(404).json({
          success: false,
          error: 'Conta não encontrada'
        });
      }

      // Atualizar o last_used da conta
      metaAccount.lastUsed = new Date();
      await metaAccount.save();

      logger.info(`Iniciando sincronização de campanhas para conta ${accountId}`);

      // Buscar campanhas na API do Meta
      const { data: metaCampaigns } = await metaApiService.getCampaignsByAccount(
        accountId,
        metaAccount.accessToken
      );

      if (!metaCampaigns || metaCampaigns.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Nenhuma campanha encontrada para sincronização',
          data: {
            total: 0,
            created: 0,
            updated: 0,
            campaigns: []
          }
        });
      }

      logger.info(`Encontradas ${metaCampaigns.length} campanhas na API do Meta`);

      // Contadores para relatório
      let created = 0;
      let updated = 0;
      const processedCampaigns = [];

      // Processar cada campanha
      for (const metaCampaign of metaCampaigns) {
        // Verificar se a campanha é um teste (verificação extra)
        if (metaCampaign.name && (
            metaCampaign.name.toLowerCase().includes('test') || 
            metaCampaign.name.toLowerCase().includes('teste')
        )) {
          logger.debug(`Ignorando campanha de teste: ${metaCampaign.name}`);
          continue; // Pular esta campanha
        }
        
        // Buscar se a campanha já existe no banco
        let campaign = await Campaign.findByPk(metaCampaign.id);
        let isNew = false;

        // Se não existir, criar nova
        if (!campaign) {
          campaign = Campaign.build({
            id: metaCampaign.id,
            adAccountId: accountId
          });
          isNew = true;
          created++;
        } else {
          updated++;
        }

        // Sincronizar dados
        campaign.syncFromMetaApi(metaCampaign);
        
        // Verificar explicitamente se a campanha está ativa no Meta
        // e garantir que o status esteja corretamente sincronizado
        if (metaCampaign.status) {
          campaign.status = metaCampaign.status;
        }
        
        // Processar dados de insights se disponíveis
        if (metaCampaign.insights && metaCampaign.insights.data && metaCampaign.insights.data.length > 0) {
          const insights = metaCampaign.insights.data[0];
          
          // Converter para números antes de atribuir com validação rigorosa para evitar NaN
          // Parse como inteiro, com fallback para 0 se for NaN
          const safeParseInt = (value) => {
            const parsed = parseInt(value || 0, 10);
            return isNaN(parsed) ? 0 : parsed; 
          };
          
          // Parse como float, com fallback para 0 se for NaN
          const safeParseFloat = (value) => {
            const parsed = parseFloat(value || 0);
            return isNaN(parsed) ? 0 : parsed;
          };
          
          campaign.impressions = safeParseInt(insights.impressions);
          campaign.clicks = safeParseInt(insights.clicks);
          campaign.spend = safeParseFloat(insights.spend);
          campaign.conversions = safeParseInt(insights.conversions);
          
          // Log para debug
          logger.debug(`Processando insights para campanha ${metaCampaign.id}:`, {
            impressions: campaign.impressions,
            clicks: campaign.clicks,
            spend: campaign.spend,
            conversions: campaign.conversions
          });
        } else {
          // Garantir valores default se não houver insights
          campaign.impressions = campaign.impressions || 0;
          campaign.clicks = campaign.clicks || 0;
          campaign.spend = campaign.spend || 0;
          campaign.conversions = campaign.conversions || 0;
        }

        // Marcar como sincronizada
        campaign.syncValidated = true;
        campaign.lastSyncedAt = new Date();
        
        // Salvar no banco
        await campaign.save();

        // Adicionar à lista de processados
        processedCampaigns.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          isNew
        });
      }

      // Retornar relatório
      return res.status(200).json({
        success: true,
        data: {
          total: processedCampaigns.length,
          created,
          updated,
          campaigns: processedCampaigns
        }
      });

    } catch (error) {
      logger.error('Erro ao sincronizar campanhas do Meta:', {
        message: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        error: 'Erro ao sincronizar campanhas',
        message: error.message
      });
    }
  }
}

module.exports = new CampaignController();
