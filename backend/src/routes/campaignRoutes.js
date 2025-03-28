/**
 * Rotas para gerenciamento de campanhas
 * Implementa endpoints RESTful com foco em consistência de dados
 */

const express = require('express');
const campaignController = require('../controllers/campaignController');
const { validateDateParams } = require('../middlewares/validators');

const router = express.Router();

/**
 * @route GET /api/campaigns
 * @desc Obtém todas as campanhas com filtros e paginação
 * @access Privado
 */
router.get('/', campaignController.getCampaigns);

/**
 * @route GET /api/campaigns/:id
 * @desc Obtém detalhes de uma campanha específica
 * @access Privado
 */
router.get('/:id', campaignController.getCampaignById);

/**
 * @route GET /api/campaigns/:id/performance
 * @desc Obtém dados de desempenho de uma campanha
 * @access Privado
 */
router.get('/:id/performance', validateDateParams, campaignController.getCampaignPerformanceById);

/**
 * @route GET /api/campaigns/:id/ads
 * @desc Obtém anúncios associados a uma campanha
 * @access Privado
 */
router.get('/:id/ads', campaignController.getAdsByCampaignId);

module.exports = router;
