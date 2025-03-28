import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Card, 
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DateRangePicker from '../components/DateRangePicker';
import { getLastDaysFilter, formatToDisplayDate } from '../utils/dateUtils';
import { getDashboardStats } from '../services/api';

/**
 * Página de Dashboard
 * Exibe métricas e estatísticas gerais sincronizadas com a API
 */
const Dashboard = () => {
  // Estados
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState(getLastDaysFilter(30));
  
  // Carregar estatísticas
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await getDashboardStats(dateFilter.startDate, dateFilter.endDate);
        
        if (response.success) {
          setStats(response.data);
          
          // Log para validação de datas
          console.log('Estatísticas carregadas:', response.data);
        } else {
          setError(response.error || 'Erro ao carregar estatísticas');
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        setError(error.response?.data?.message || error.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [dateFilter]);
  
  // Manipular mudança no filtro de data
  const handleDateFilterChange = (newFilter) => {
    if (newFilter.startDate && newFilter.endDate) {
      setDateFilter(newFilter);
    }
  };
  
  // Atualizar dados
  const handleRefresh = () => {
    // Recarrega os dados com o mesmo filtro
    const current = { ...dateFilter };
    setDateFilter({ ...current });
  };
  
  // Renderiza o card de estatística
  const renderStatCard = (title, value, previousValue, format = 'number', icon = null) => {
    if (!stats) return null;
    
    // Garantir que os valores sejam números válidos
    const numValue = value === undefined || value === null ? 0 : Number(value);
    const numPreviousValue = previousValue === undefined || previousValue === null ? 0 : Number(previousValue);
    
    // Verificar se o valor é um número válido (não NaN ou Infinity)
    const isValidNumber = !isNaN(numValue) && isFinite(numValue);
    
    // Formatar o valor de acordo com o tipo
    let formattedValue;
    if (!isValidNumber) {
      formattedValue = '-';
    } else if (format === 'currency') {
      formattedValue = numValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      });
    } else if (format === 'percent') {
      formattedValue = numValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + '%';
    } else {
      formattedValue = numValue.toLocaleString('pt-BR');
    }
    
    // Calcular variação percentual apenas se ambos os valores forem válidos e o anterior não for zero
    const percentChange = (isValidNumber && numPreviousValue !== 0) 
      ? ((numValue - numPreviousValue) / numPreviousValue) * 100 
      : 0;
    
    const isPositive = percentChange > 0;
    const percentChangeFormatted = Math.abs(percentChange).toFixed(2) + '%';
    
    return (
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Box display="flex" alignItems="center" mb={1}>
              {icon && (
                <Box mr={1} color="primary.main">
                  {icon}
                </Box>
              )}
              <Typography variant="h4">
                {formattedValue}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              {percentChange !== 0 && (
                <>
                  {isPositive ? (
                    <TrendingUpIcon color="success" fontSize="small" />
                  ) : (
                    <TrendingDownIcon color="error" fontSize="small" />
                  )}
                  <Typography 
                    variant="body2" 
                    color={isPositive ? 'success.main' : 'error.main'}
                    ml={0.5}
                  >
                    {percentChangeFormatted}
                  </Typography>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };
  
  // Renderiza indicador de carregamento
  if (loading && !stats) {
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
            Dashboard
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Atualizar
          </Button>
        </Box>
        
        {/* Filtro de data */}
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Período de Análise
          </Typography>
          
          <DateRangePicker 
            startDate={dateFilter.startDate}
            endDate={dateFilter.endDate}
            onChange={handleDateFilterChange}
            disabled={loading}
          />
          
          {stats && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              Dados sincronizados de {formatToDisplayDate(dateFilter.startDate)} até {formatToDisplayDate(dateFilter.endDate)}
            </Typography>
          )}
        </Paper>
        
        {/* Mensagem de erro */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Estatísticas */}
        {stats && (
          <Box mb={4}>
            <Typography variant="h5" gutterBottom>
              Visão Geral
            </Typography>
            
            <Grid container spacing={3}>
              {renderStatCard('Impressões', stats.impressions, stats.previousImpressions)}
              {renderStatCard('Cliques', stats.clicks, stats.previousClicks)}
              {renderStatCard('Investimento', stats.spend, stats.previousSpend, 'currency')}
              {renderStatCard('CTR', stats.ctr, stats.previousCtr, 'percent')}
            </Grid>
            
            <Divider sx={{ my: 4 }} />
            
            <Typography variant="h5" gutterBottom>
              Métricas de Conversão
            </Typography>
            
            {stats.conversions === 0 && stats.purchases === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Não há dados de conversão disponíveis para o período selecionado. Verifique se o acompanhamento de conversões está configurado corretamente no Meta Ads.
              </Alert>
            ) : null}
            
            <Grid container spacing={3}>
              {renderStatCard('Conversões Totais', stats.conversions, stats.previousConversions)}
              {renderStatCard('Compras', stats.purchases, stats.previousPurchases)}
              {renderStatCard('Receita', stats.revenue, stats.previousRevenue, 'currency')}
              {renderStatCard('ROAS', stats.roas, stats.previousRoas, 'percent')}
            </Grid>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {renderStatCard('Custo/Conversão', stats.costPerConversion, stats.previousCostPerConversion, 'currency')}
              {renderStatCard('Taxa de Conversão', stats.conversionRate, stats.previousConversionRate, 'percent')}
              {renderStatCard('Custo por Clique', stats.costPerClick, stats.previousCostPerClick, 'currency')}
              {renderStatCard('CTR', stats.ctr, stats.previousCtr, 'percent')}
            </Grid>
            
            {/* Se necessário, adicionar mais seções de estatísticas */}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;
