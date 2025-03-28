import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { format } from 'date-fns';
import axios from 'axios';
import { API_URL } from '../config';

const MetaAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('add'); // 'add', 'edit', 'delete'
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    accountId: '',
    accessToken: ''
  });
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Carregar contas ao inicializar
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Buscar contas do backend
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/meta-accounts`);
      if (response.data.success) {
        setAccounts(response.data.accounts);
      } else {
        showAlert('Erro ao carregar contas', 'error');
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      showAlert('Erro ao buscar contas do servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Abrir diálogo para adicionar conta
  const handleAddAccount = () => {
    setDialogType('add');
    setFormData({
      name: '',
      accountId: '',
      accessToken: ''
    });
    setOpenDialog(true);
  };

  // Abrir diálogo para editar conta
  const handleEditAccount = (account) => {
    setDialogType('edit');
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      accountId: account.accountId,
      accessToken: account.accessToken
    });
    setOpenDialog(true);
  };

  // Abrir diálogo para confirmar exclusão
  const handleDeleteAccount = (account) => {
    setDialogType('delete');
    setSelectedAccount(account);
    setOpenDialog(true);
  };

  // Fechar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAccount(null);
  };

  // Manipular mudanças no formulário
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Mostrar alerta
  const showAlert = (message, severity = 'success') => {
    setAlert({
      open: true,
      message,
      severity
    });
  };

  // Fechar alerta
  const handleCloseAlert = () => {
    setAlert(prev => ({
      ...prev,
      open: false
    }));
  };

  // Enviar formulário
  const handleSubmit = async () => {
    try {
      if (dialogType === 'add') {
        // Validar campos obrigatórios
        if (!formData.name || !formData.accountId || !formData.accessToken) {
          return showAlert('Todos os campos são obrigatórios', 'error');
        }
        
        const response = await axios.post(`${API_URL}/meta-accounts`, formData);
        if (response.data.success) {
          showAlert('Conta adicionada com sucesso');
          fetchAccounts();
        } else {
          showAlert(response.data.message || 'Erro ao adicionar conta', 'error');
        }
      } else if (dialogType === 'edit') {
        // Validar campos obrigatórios
        if (!formData.name || !formData.accountId || !formData.accessToken) {
          return showAlert('Todos os campos são obrigatórios', 'error');
        }
        
        const response = await axios.put(`${API_URL}/meta-accounts/${selectedAccount.id}`, formData);
        if (response.data.success) {
          showAlert('Conta atualizada com sucesso');
          fetchAccounts();
        } else {
          showAlert(response.data.message || 'Erro ao atualizar conta', 'error');
        }
      } else if (dialogType === 'delete') {
        const response = await axios.delete(`${API_URL}/meta-accounts/${selectedAccount.id}`);
        if (response.data.success) {
          showAlert('Conta removida com sucesso');
          fetchAccounts();
        } else {
          showAlert(response.data.message || 'Erro ao remover conta', 'error');
        }
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Erro na operação:', error);
      showAlert(`Erro: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  // Ativar conta
  const handleActivateAccount = async (account) => {
    try {
      const response = await axios.post(`${API_URL}/meta-accounts/${account.id}/activate`);
      if (response.data.success) {
        showAlert('Conta ativada com sucesso');
        fetchAccounts();
      } else {
        showAlert(response.data.message || 'Erro ao ativar conta', 'error');
      }
    } catch (error) {
      console.error('Erro ao ativar conta:', error);
      showAlert(`Erro: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  // Renderizar diálogo conforme o tipo
  const renderDialogContent = () => {
    if (dialogType === 'delete') {
      return (
        <>
          <DialogTitle>Remover Conta</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja remover a conta "{selectedAccount?.name}"? Esta ação não pode ser desfeita.
            </DialogContentText>
          </DialogContent>
        </>
      );
    }

    const title = dialogType === 'add' ? 'Adicionar Nova Conta' : 'Editar Conta';
    
    return (
      <>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogType === 'add' 
              ? 'Preencha os dados da conta do Meta Ads para adicionar ao sistema.'
              : 'Edite os dados da conta do Meta Ads.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Nome da Conta"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleFormChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="accountId"
            label="ID da Conta (sem o prefixo act_)"
            fullWidth
            variant="outlined"
            value={formData.accountId}
            onChange={handleFormChange}
            sx={{ mb: 2 }}
            helperText="ID numérico da conta do Meta Ads, sem o prefixo 'act_'"
          />
          <TextField
            margin="dense"
            name="accessToken"
            label="Token de Acesso"
            fullWidth
            variant="outlined"
            value={formData.accessToken}
            onChange={handleFormChange}
            multiline
            rows={3}
            helperText="Token de acesso à API do Meta"
          />
        </DialogContent>
      </>
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gerenciamento de Contas do Meta
        </Typography>

        <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1">
            {accounts.length} {accounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleAddAccount}
          >
            Adicionar Conta
          </Button>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>ID da Conta</TableCell>
                <TableCell>Último Uso</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">Carregando...</TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhuma conta cadastrada. Clique em "Adicionar Conta" para começar.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      {account.isActive ? (
                        <Tooltip title="Conta Ativa">
                          <CheckCircleIcon color="success" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Ativar Conta">
                          <IconButton 
                            size="small" 
                            onClick={() => handleActivateAccount(account)}
                            color="default"
                          >
                            <RadioButtonUncheckedIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.accountId}</TableCell>
                    <TableCell>
                      {account.lastUsed ? format(new Date(account.lastUsed), 'dd/MM/yyyy HH:mm') : 'Nunca usada'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton 
                          onClick={() => handleEditAccount(account)}
                          size="small"
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          onClick={() => handleDeleteAccount(account)}
                          size="small"
                          color="error"
                          disabled={account.isActive}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Diálogo para adicionar/editar/excluir conta */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        {renderDialogContent()}
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color={dialogType === 'delete' ? 'error' : 'primary'}
          >
            {dialogType === 'add' ? 'Adicionar' : dialogType === 'edit' ? 'Atualizar' : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alerta */}
      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MetaAccounts;
