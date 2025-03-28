import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Divider, 
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DateRangePicker from '../components/DateRangePicker';
import CampaignPerformanceChart from '../components/CampaignPerformanceChart';
import { getCampaignById, getCampaignPerformance } from '../services/api';
import { getLastDaysFilter, formatToDisplayDate } from '../utils/dateUtils';

/**
 * Página de detalhes da campanha
 * Implementa exibição sincronizada de dados com suporte a filtragem por datas
 */
const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados
  const [campaign, setCampaign] = useState(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState(null);
  
  const [performanceData, setPerformanceData] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [performanceError, setPerformanceError] = useState(null);
  
  // Obtém filtro para os últimos 30 dias como padrão
  const [dateFilter, setDateFilter] = useState(getLastDaysFilter(30));
  
  // Carrega os dados da campanha
  useEffect(() => {
    const fetchCampaignDetails = async () => {
      setCampaignLoading(true);
      setCampaignError(null);
      
      try {
        const response = await getCampaignById(id);
        if (response.success && response.data) {
          setCampaign(response.data);
        } else {
          setCampaignError(response.error || 'Erro ao carregar detalhes da campanha');
        }
      } catch (error) {
        console.error('Erro ao buscar campanha:', error);
        setCampaignError(error.response?.data?.message || error.message || 'Erro desconhecido');
      } finally {
        setCampaignLoading(false);
      }
    };
    
    if (id) {
      fetchCampaignDetails();
    }
  }, [id]);
  
  // Carrega os dados de desempenho quando o filtro de data muda
  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!id || !dateFilter.startDate || !dateFilter.endDate) return;
      
      setPerformanceLoading(true);
      setPerformanceError(null);
      
      try {
        console.log('Buscando desempenho com filtro:', dateFilter);
        const response = await getCampaignPerformance(
          id, 
          dateFilter.startDate, 
          dateFilter.endDate,
          'day'
        );
        
        if (response.success) {
          setPerformanceData(response.data);
          
          // Log para validação
          if (response.data && response.data.length > 0) {
            console.log('Primeiro registro:', response.data[0]);
            console.log('Último registro:', response.data[response.data.length - 1]);
          }
        } else {
          setPerformanceError(response.error || 'Erro ao carregar dados de desempenho');
        }
      } catch (error) {
        console.error('Erro ao buscar desempenho:', error);
        setPerformanceError(error.response?.data?.message || error.message || 'Erro desconhecido');
      } finally {
        setPerformanceLoading(false);
      }
    };
    
    fetchPerformanceData();
  }, [id, dateFilter]);
  
  // Manipula mudança no filtro de data
  const handleDateFilterChange = (newFilter) => {
    if (newFilter.startDate && newFilter.endDate) {
      setDateFilter(newFilter);
    }
  };
  
  // Volta para a lista de campanhas
  const handleBack = () => {
    navigate('/campaigns');
  };
  
  // Atualiza os dados de desempenho
  const handleRefresh = () => {
    // Recarrega os dados com o mesmo filtro
    const current = { ...dateFilter };
    setDateFilter({ ...current });
  };
  
  // Renderiza indicador de carregamento
  if (campaignLoading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  // Renderiza mensagem de erro
  if (campaignError) {
    return (
      <Container maxWidth="lg">
        <Box mt={4} mb={4}>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={handleBack}>
                Voltar
              </Button>
            }
          >
            {campaignError}
          </Alert>
        </Box>
      </Container>
    );
  }
  
  // Renderiza conteúdo principal
  return (
    <Container maxWidth="lg">
      <Box mt={3} mb={5}>
        {/* Cabeçalho */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={handleBack} color="primary">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              {campaign?.name || 'Detalhes da Campanha'}
            </Typography>
          </Box>
          
          <Chip 
            label={campaign?.status || '-'} 
            color={campaign?.status === 'ACTIVE' ? 'success' : 'default'} 
            variant="outlined"
          />
        </Box>
        
        {/* Informações básicas */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6} lg={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  ID da Campanha
                </Typography>
                <Typography variant="h6">
                  {campaign?.id || '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Objetivo
                </Typography>
                <Typography variant="h6">
                  {campaign?.objective || '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Data de Início
                </Typography>
                <Typography variant="h6">
                  {campaign?.startDate ? formatToDisplayDate(campaign.startDate) : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Data de Término
                </Typography>
                <Typography variant="h6">
                  {campaign?.endDate ? formatToDisplayDate(campaign.endDate) : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Seção de Desempenho */}
        <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarTodayIcon color="primary" />
              <Typography variant="h5">
                Desempenho no Período
              </Typography>
            </Box>
            
            <IconButton 
              onClick={handleRefresh} 
              color="primary"
              disabled={performanceLoading}
            >
              <RefreshIcon />
            </IconButton>
          </Box>
          
          <DateRangePicker 
            startDate={dateFilter.startDate}
            endDate={dateFilter.endDate}
            onChange={handleDateFilterChange}
            disabled={performanceLoading}
          />
          
          <Divider sx={{ my: 3 }} />
          
          {/* Resumo de métricas */}
          {!performanceLoading && performanceData.length > 0 && (
            <Grid container spacing={3} mb={4}>
              {renderMetricSummary('Impressões', 'impressions')}
              {renderMetricSummary('Cliques', 'clicks')}
              {renderMetricSummary('Custo (R$)', 'spend')}
              {renderMetricSummary('CTR (%)', 'ctr')}
            </Grid>
          )}
          
          {/* Gráfico de desempenho */}
          <CampaignPerformanceChart 
            data={performanceData}
            loading={performanceLoading}
            error={performanceError}
            dateRange={dateFilter}
          />
        </Paper>
      </Box>
    </Container>
  );
  
  // Função auxiliar para renderizar cards de métricas
  function renderMetricSummary(label, metricKey) {
    if (!performanceData || performanceData.length === 0) return null;
    
    // Calcula o total da métrica
    const total = performanceData.reduce((sum, item) => {
      return sum + (Number(item[metricKey]) || 0);
    }, 0);
    
    // Formata o valor de acordo com o tipo
    let formattedValue;
    if (metricKey === 'ctr') {
      formattedValue = (total / performanceData.length).toFixed(2) + '%';
    } else if (metricKey === 'spend') {
      formattedValue = total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      });
    } else {
      formattedValue = total.toLocaleString('pt-BR');
    }
    
    return (
      <Grid item xs={6} sm={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Typography variant="h6">
              {formattedValue}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  }
};

export default CampaignDetails;
