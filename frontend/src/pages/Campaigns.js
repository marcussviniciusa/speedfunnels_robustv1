import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Button,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SyncIcon from '@mui/icons-material/Sync';
import DateRangePicker from '../components/DateRangePicker';
import AccountSelector from '../components/AccountSelector';
import { getCampaigns, syncCampaignsFromMeta } from '../services/api';
import { getLastDaysFilter, formatToDisplayDate } from '../utils/dateUtils';

/**
 * Página de listagem de campanhas
 * Implementa filtragem por data e busca com dados consistentes
 */
const Campaigns = () => {
  const navigate = useNavigate();
  
  // Estados
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(getLastDaysFilter(30));
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Estado de sincronização
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState({ open: false, message: '', type: 'info' });
  
  // Carregar campanhas
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Preparar filtros
      const filters = {
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        accountId: selectedAccountId || undefined
      };
      
      // Log para depuração
      console.log('Enviando filtros para API:', filters);
      
      // Buscar dados
      const response = await getCampaigns(
        filters,
        page + 1, // API usa 1-indexed
        rowsPerPage
      );
      
      if (response.success) {
        setCampaigns(response.data);
        setTotal(response.pagination?.total || 0);
        
        // Log para validação de datas
        if (response.data && response.data.length > 0) {
          console.log('Amostra de campanha:', response.data[0]);
        }
      } else {
        setError(response.error || 'Erro ao carregar campanhas');
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      setError(error.response?.data?.message || error.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, searchTerm, selectedAccountId, page, rowsPerPage]);
  
  // Carregar campanhas no carregamento da página e quando os filtros mudarem
  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);
  
  // Manipular mudança de página
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Manipular mudança de itens por página
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Manipular mudança no filtro de data
  const handleDateFilterChange = (newFilter) => {
    if (newFilter.startDate && newFilter.endDate) {
      setDateFilter(newFilter);
      setPage(0); // Resetar para primeira página
    }
  };
  
  // Manipular busca
  const handleSearch = (e) => {
    // Debounce implementado para não fazer muitas requisições
    const value = e.target.value;
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      setSearchTerm(value);
      setPage(0); // Resetar para primeira página
    }, 500);
  };
  
  // Manipular clique em campanha
  const handleCampaignClick = (id) => {
    navigate(`/campaigns/${id}`);
  };
  
  // Manipular filtro de status
  const handleStatusFilter = (status) => {
    setStatusFilter(status === statusFilter ? '' : status);
    setPage(0); // Resetar para primeira página
  };
  
  // Manipular seleção de conta
  const handleAccountChange = (accountId) => {
    console.log('Conta selecionada:', accountId);
    setSelectedAccountId(accountId);
    setPage(0); // Resetar para primeira página
  };
  
  // Sincronizar campanhas com o Meta
  const handleSyncCampaigns = async () => {
    if (!selectedAccountId) {
      setSyncFeedback({
        open: true,
        message: 'Selecione uma conta para sincronizar as campanhas',
        type: 'error'
      });
      return;
    }
    
    setSyncLoading(true);
    
    try {
      const response = await syncCampaignsFromMeta(selectedAccountId);
      
      if (response.success) {
        const { created, updated, total } = response.data;
        
        setSyncFeedback({
          open: true,
          message: `Sincronização concluída! Total: ${total} campanhas (${created} novas, ${updated} atualizadas)`,
          type: 'success'
        });
        
        // Recarregar a lista de campanhas
        fetchCampaigns();
      } else {
        setSyncFeedback({
          open: true,
          message: response.error || 'Erro ao sincronizar campanhas',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setSyncFeedback({
        open: true,
        message: error.message || 'Erro desconhecido na sincronização',
        type: 'error'
      });
    } finally {
      setSyncLoading(false);
    }
  };
  
  // Fechar notificação
  const handleCloseFeedback = () => {
    setSyncFeedback({
      ...syncFeedback,
      open: false
    });
  };
  
  // Renderizar indicador de carregamento
  if (loading && campaigns.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box mt={3} mb={5}>
        {/* Cabeçalho */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Campanhas
          </Typography>
          
          <Button 
            variant="outlined" 
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
          <Button 
            variant="contained" 
            startIcon={<SyncIcon />}
            onClick={handleSyncCampaigns}
            disabled={syncLoading}
          >
            Sincronizar Campanhas
          </Button>
        </Box>
        
        {/* Barra de busca */}
        <Box mb={3}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar campanhas..."
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        {/* Filtros */}
        {showFilters && (
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filtros
            </Typography>
            
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Conta
              </Typography>
              <AccountSelector 
                value={selectedAccountId}
                onChange={handleAccountChange}
              />
            </Box>
            
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Período
              </Typography>
              <DateRangePicker 
                startDate={dateFilter.startDate}
                endDate={dateFilter.endDate}
                onChange={handleDateFilterChange}
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Status
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {['ACTIVE', 'PAUSED', 'DELETED'].map((status) => (
                <Chip
                  key={status}
                  label={status}
                  color={statusFilter === status ? 'primary' : 'default'} 
                  variant={statusFilter === status ? 'filled' : 'outlined'}
                  onClick={() => handleStatusFilter(status)}
                  clickable
                />
              ))}
            </Box>
          </Paper>
        )}
        
        {/* Mensagem de erro */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Resumo de campanhas */}
        {!loading && campaigns.length > 0 && (
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total de Campanhas
                  </Typography>
                  <Typography variant="h4">
                    {total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Campanhas Ativas
                  </Typography>
                  <Typography variant="h4">
                    {campaigns.filter(c => c.status === 'ACTIVE').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Período
                  </Typography>
                  <Typography variant="body1">
                    {formatToDisplayDate(dateFilter.startDate)} - {formatToDisplayDate(dateFilter.endDate)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        
        {/* Tabela de Campanhas */}
        <TableContainer component={Paper} variant="outlined">
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Início</TableCell>
                <TableCell>Término</TableCell>
                <TableCell>Orçamento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhuma campanha encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow 
                    key={campaign.id}
                    hover
                    onClick={() => handleCampaignClick(campaign.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell component="th" scope="row">
                      {campaign.name}
                    </TableCell>
                    <TableCell>{campaign.id}</TableCell>
                    <TableCell>
                      <Chip 
                        label={campaign.status} 
                        size="small"
                        color={campaign.status === 'ACTIVE' ? 'success' : 'default'} 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatToDisplayDate(campaign.startDate)}</TableCell>
                    <TableCell>{formatToDisplayDate(campaign.endDate)}</TableCell>
                    <TableCell>
                      {campaign.dailyBudget 
                        ? `R$ ${Number(campaign.dailyBudget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia` 
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Itens por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </TableContainer>
      </Box>
      <Snackbar
        open={syncFeedback.open}
        autoHideDuration={6000}
        onClose={handleCloseFeedback}
      >
        <Alert 
          onClose={handleCloseFeedback} 
          severity={syncFeedback.type} 
          sx={{ width: '100%' }}
        >
          {syncFeedback.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Campaigns;
