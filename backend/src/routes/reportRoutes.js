const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Gerar relatório para uma campanha específica
router.get('/campaign/:campaignId', reportController.generateCampaignReport);

// Gerar relatório para todas as campanhas
router.get('/all-campaigns', reportController.generateAllCampaignsReport);

// Download de relatório (mantida para compatibilidade)
router.get('/:reportId/download', reportController.downloadReport);

// Criar link de compartilhamento para relatório
router.post('/:reportId/share', reportController.createShareLink);

// Acessar relatório compartilhado (mantida para compatibilidade)
router.get('/shared/:shareToken', reportController.getSharedReport);

module.exports = router;
