import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Label
} from 'recharts';
import { Box, Typography, CircularProgress, Alert, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { formatToDisplayDate, parseApiDate } from '../utils/dateUtils';

/**
 * Componente para visualização de desempenho de campanha em gráfico
 * Garante exibição correta e sincronizada dos dados da API
 */
const CampaignPerformanceChart = ({ 
  data, 
  loading,
  error,
  dateRange
}) => {
  const [metric, setMetric] = useState('impressions');
  const [chartData, setChartData] = useState([]);
  
  // Métricas disponíveis para visualização
  const metrics = [
    { value: 'impressions', label: 'Impressões', color: '#8884d8' },
    { value: 'clicks', label: 'Cliques', color: '#82ca9d' },
    { value: 'spend', label: 'Custo', color: '#ff7300', format: 'currency' },
    { value: 'ctr', label: 'CTR', color: '#0088FE', format: 'percent' },
    { value: 'cpm', label: 'CPM', color: '#FF8042', format: 'currency' },
    { value: 'cpc', label: 'CPC', color: '#FFBB28', format: 'currency' },
    { value: 'conversions', label: 'Conversões', color: '#00C49F' }
  ];
  
  // Encontra a métrica atual
  const currentMetric = metrics.find(m => m.value === metric) || metrics[0];
  
  // Processa os dados quando mudam
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      // Garantir que os dados estão ordenados por data
      const sortedData = [...data].sort((a, b) => {
        return parseApiDate(a.date_start) - parseApiDate(b.date_start);
      });
      
      // Formatar os dados para o gráfico
      const formattedData = sortedData.map(item => ({
        date: formatToDisplayDate(item.date_start),
        [metric]: formatMetricValue(item[metric], false),
        rawValue: item[metric],
        tooltipDate: `${formatToDisplayDate(item.date_start)} - ${formatToDisplayDate(item.date_stop)}`,
        ...item
      }));
      
      setChartData(formattedData);
    } else {
      setChartData([]);
    }
  }, [data, metric]);
  
  /**
   * Formata o valor da métrica de acordo com seu tipo
   * @param {number} value - Valor a ser formatado
   * @param {boolean} forTooltip - Se é para exibição no tooltip
   * @returns {string|number} Valor formatado
   */
  const formatMetricValue = (value, forTooltip = false) => {
    if (value === undefined || value === null) return '-';
    
    const { format } = currentMetric;
    
    if (format === 'currency') {
      return forTooltip 
        ? `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : Number(value);
    }
    
    if (format === 'percent') {
      return forTooltip 
        ? `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
        : Number(value);
    }
    
    return forTooltip ? Number(value).toLocaleString('pt-BR') : Number(value);
  };
  
  // Renderização do tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {data.tooltipDate}
          </Typography>
          <Typography variant="body2" color={currentMetric.color} fontWeight="bold">
            {`${currentMetric.label}: ${formatMetricValue(data.rawValue, true)}`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };
  
  // Se está carregando, mostra indicador
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Se ocorreu um erro, mostra alerta
  if (error) {
    return (
      <Box mt={2} mb={2}>
        <Alert severity="error">
          Erro ao carregar dados: {error}
        </Alert>
      </Box>
    );
  }
  
  // Se não há dados, mostra mensagem
  if (!chartData || chartData.length === 0) {
    return (
      <Box mt={2} mb={2}>
        <Alert severity="info">
          Não há dados disponíveis para o período selecionado.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Desempenho da Campanha
        </Typography>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Métrica</InputLabel>
          <Select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            label="Métrica"
          >
            {metrics.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {dateRange && (
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Período: {formatToDisplayDate(dateRange.startDate)} - {formatToDisplayDate(dateRange.endDate)}
        </Typography>
      )}
      
      <Box height={400}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 35 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              padding={{ left: 10, right: 10 }}
              angle={-45}
              tickMargin={20}
              tick={{ fontSize: 12 }}
            >
              <Label value="Data" offset={-10} position="insideBottom" />
            </XAxis>
            <YAxis
              tickFormatter={(value) => formatMetricValue(value, true)}
            >
              <Label 
                value={currentMetric.label} 
                angle={-90} 
                position="insideLeft" 
                style={{ textAnchor: 'middle' }} 
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Line
              name={currentMetric.label}
              type="monotone"
              dataKey={metric}
              stroke={currentMetric.color}
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default CampaignPerformanceChart;
