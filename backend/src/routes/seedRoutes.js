/**
 * Rotas para adicionar dados de teste (seed)
 */

const express = require('express');
const router = express.Router();
const seedController = require('../controllers/seedController');

// Rota para adicionar contas de teste do Meta
router.post('/meta-accounts', seedController.seedMetaAccounts);

module.exports = router;
