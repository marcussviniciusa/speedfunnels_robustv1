import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress,
  Divider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DescriptionIcon from '@mui/icons-material/Description';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import axios from 'axios';
import { format, subDays } from 'date-fns';

function Reports() {
  // Estados para filtros
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  
  // Estados para geração e compartilhamento
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [showAlert, setShowAlert] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareExpiry, setShareExpiry] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    fetchCampaigns();
    fetchMetaAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualizar campanhas quando as datas mudarem
  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Buscar campanhas
  const fetchCampaigns = async () => {
    try {
      // Incluir datas para filtrar campanhas com desempenho
      const dateParams = `startDate=${formatDateForApi(startDate)}&endDate=${formatDateForApi(endDate)}`;
      // Adicionar o parâmetro performanceOnly para filtrar campanhas com dados de desempenho
      const response = await axios.get(`/api/campaigns?${dateParams}&performanceOnly=true`);
      // Garante que response.data é um array
      setCampaigns(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      showMessage('Erro ao carregar campanhas', 'error');
      // Em caso de erro, garante que campaigns permanece um array vazio
      setCampaigns([]);
    }
  };

  // Buscar contas Meta
  const fetchMetaAccounts = async () => {
    try {
      const response = await axios.get('/api/meta-accounts');
      // Garante que response.data é um array
      setMetaAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erro ao carregar contas Meta:', error);
      showMessage('Erro ao carregar contas Meta', 'error');
      // Em caso de erro, garante que metaAccounts permanece um array vazio
      setMetaAccounts([]);
    }
  };

  // Formatar data para a API
  const formatDateForApi = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  // Exibir mensagem de alerta
  const showMessage = (message, severity = 'success') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setShowAlert(true);
  };

  // Fechar alerta
  const handleCloseAlert = () => {
    setShowAlert(false);
  };

  // Gerar relatório
  const generateReport = async () => {
    setLoading(true);
    try {
      let response;
      const dateParams = `startDate=${formatDateForApi(startDate)}&endDate=${formatDateForApi(endDate)}`;
      
      if (selectedCampaign === 'all') {
        // Relatório de todas as campanhas (possivelmente filtrado por conta)
        const accountFilter = selectedAccount !== 'all' ? `&metaAccountId=${selectedAccount}` : '';
        response = await axios.get(`/api/reports/all-campaigns?${dateParams}${accountFilter}`);
      } else {
        // Relatório de campanha específica
        response = await axios.get(`/api/reports/campaign/${selectedCampaign}?${dateParams}`);
      }
      
      setReportData(response.data);
      showMessage('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      showMessage(
        error.response?.data?.error || 'Erro ao gerar relatório', 
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Baixar relatório
  const downloadReport = () => {
    if (!reportData) return;
    
    // Usar a URL completa fornecida pelo backend
    if (reportData.fullDownloadUrl) {
      window.open(reportData.fullDownloadUrl, '_blank');
    } else {
      // Fallback para o comportamento anterior
      const baseUrl = window.location.origin;
      const fullDownloadUrl = `${baseUrl}${reportData.downloadUrl}`;
      window.open(fullDownloadUrl, '_blank');
    }
  };

  // Criar link de compartilhamento
  const createShareLink = async () => {
    if (!reportData) return;
    
    try {
      setLoading(true);
      const response = await axios.post(`/api/reports/${reportData.reportId}/share`);
      
      // Usar a URL completa fornecida pelo backend
      if (response.data.fullShareUrl) {
        setShareUrl(response.data.fullShareUrl);
      } else {
        // Fallback para o comportamento anterior
        const baseUrl = window.location.origin;
        const fullShareUrl = `${baseUrl}${response.data.shareUrl}`;
        setShareUrl(fullShareUrl);
      }
      
      setShareExpiry(new Date(response.data.expiresAt).toLocaleDateString('pt-BR'));
      setShareDialogOpen(true);
    } catch (error) {
      showMessage('Erro ao criar link de compartilhamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Copiar link para área de transferência
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        showMessage('Link copiado para a área de transferência!');
      })
      .catch(() => {
        showMessage('Erro ao copiar link', 'error');
      });
  };

  // Renderizar controles da página
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Cabeçalho */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Relatórios
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gere relatórios de desempenho para suas campanhas e compartilhe com sua equipe.
          </Typography>
        </Box>

        {/* Filtros para geração de relatório */}
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Filtros do Relatório
          </Typography>
          
          <Grid container spacing={3}>
            {/* Período */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Período
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker
                  label="Data inicial"
                  value={startDate}
                  onChange={(newDate) => setStartDate(newDate)}
                  sx={{ flex: 1 }}
                />
                <DatePicker
                  label="Data final"
                  value={endDate}
                  onChange={(newDate) => setEndDate(newDate)}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Grid>

            {/* Contas e Campanhas */}
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Conta Meta</InputLabel>
                    <Select
                      value={selectedAccount}
                      label="Conta Meta"
                      onChange={(e) => setSelectedAccount(e.target.value)}
                    >
                      <MenuItem value="all">Todas as contas</MenuItem>
                      {metaAccounts.map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Campanha</InputLabel>
                    <Select
                      value={selectedCampaign}
                      label="Campanha"
                      onChange={(e) => setSelectedCampaign(e.target.value)}
                    >
                      <MenuItem value="all">Todas as campanhas</MenuItem>
                      {campaigns.map((campaign) => (
                        <MenuItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>

            {/* Botões de ação */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<DescriptionIcon />}
                onClick={generateReport}
                disabled={loading}
                sx={{ mr: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Gerar Relatório'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Área de relatório gerado */}
        {reportData && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Relatório Gerado
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={downloadReport}
                  sx={{ mr: 1 }}
                >
                  Download
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={createShareLink}
                  disabled={loading}
                >
                  Compartilhar
                </Button>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Seu relatório foi gerado com sucesso! Utilize os botões acima para baixar o PDF ou criar um link de compartilhamento.
            </Typography>
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2">
                Detalhes do Relatório:
              </Typography>
              <Typography variant="body2">
                • ID: {reportData.reportId}
              </Typography>
              <Typography variant="body2">
                • Período: {formatDateForApi(startDate)} a {formatDateForApi(endDate)}
              </Typography>
              <Typography variant="body2">
                • Tipo: {selectedCampaign === 'all' ? 'Múltiplas campanhas' : 'Campanha específica'}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Dialog para compartilhamento */}
        <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
          <DialogTitle>Compartilhar Relatório</DialogTitle>
          <DialogContent>
            <Typography variant="body2" paragraph>
              Use o link abaixo para compartilhar este relatório. Este link expira em {shareExpiry}.
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                fullWidth
                value={shareUrl}
                InputProps={{
                  readOnly: true,
                }}
                size="small"
                variant="outlined"
              />
              <Tooltip title="Copiar link">
                <IconButton onClick={copyShareLink} edge="end">
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Typography variant="caption" color="text.secondary">
              Qualquer pessoa com este link poderá visualizar o relatório até a data de expiração.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShareDialogOpen(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>

        {/* Alertas */}
        <Snackbar
          open={showAlert}
          autoHideDuration={6000}
          onClose={handleCloseAlert}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseAlert} severity={alertSeverity} sx={{ width: '100%' }}>
            {alertMessage}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}

export default Reports;
