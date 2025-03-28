/**
 * Rotas para acesso a estatísticas e métricas
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { validateDateParams } = require('../middlewares/validators');

// Rota para estatísticas do dashboard
router.get('/dashboard', validateDateParams, statsController.getDashboardStats);

module.exports = router;
