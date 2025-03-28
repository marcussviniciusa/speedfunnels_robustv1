/**
 * Rotas para gerenciamento de contas do Meta (Facebook)
 */

const express = require('express');
const router = express.Router();
const metaAccountController = require('../controllers/metaAccountController');

// Rota para obter todas as contas
router.get('/', metaAccountController.getAllAccounts);

// Rota para obter a conta ativa
router.get('/active', metaAccountController.getActiveAccount);

// Rota para criar uma nova conta
router.post('/', metaAccountController.createAccount);

// Rota para atualizar uma conta existente
router.put('/:id', metaAccountController.updateAccount);

// Rota para excluir uma conta
router.delete('/:id', metaAccountController.deleteAccount);

// Rota para definir uma conta como ativa
router.post('/:id/activate', metaAccountController.setActiveAccount);

module.exports = router;
