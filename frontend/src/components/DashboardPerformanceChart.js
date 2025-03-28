import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Label,
  Area,
  AreaChart,
  ComposedChart,
  Bar
} from 'recharts';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  Paper, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { formatToDisplayDate } from '../utils/dateUtils';

// Métricas disponíveis para visualização (movido para fora do componente)
const AVAILABLE_METRICS = [
  { value: 'impressions', label: 'Impressões', color: '#8884d8', axis: 'left' },
  { value: 'clicks', label: 'Cliques', color: '#82ca9d', axis: 'left' },
  { value: 'spend', label: 'Investimento', color: '#ff7300', format: 'currency', axis: 'right' },
  { value: 'ctr', label: 'CTR', color: '#0088FE', format: 'percent', axis: 'right' },
  { value: 'cpc', label: 'CPC', color: '#FF8042', format: 'currency', axis: 'right' },
  { value: 'conversions', label: 'Conversões', color: '#FFBB28', axis: 'left' },
  { value: 'cost_per_conversion', label: 'CPL', color: '#00C49F', format: 'currency', axis: 'right' }
];

/**
 * Componente para visualização de métricas do dashboard em gráficos de linha
 */
const DashboardPerformanceChart = ({ 
  data, 
  loading,
  error,
  dateRange
}) => {
  const [primaryMetric, setPrimaryMetric] = useState('impressions');
  const [secondaryMetric, setSecondaryMetric] = useState('clicks');
  const [chartType, setChartType] = useState('line');
  const [chartData, setChartData] = useState([]);
  
  // Usar useMemo para evitar recálculos desnecessários
  const primaryMetricInfo = useMemo(() => 
    AVAILABLE_METRICS.find(m => m.value === primaryMetric) || AVAILABLE_METRICS[0], 
    [primaryMetric]
  );
  
  const secondaryMetricInfo = useMemo(() => 
    AVAILABLE_METRICS.find(m => m.value === secondaryMetric) || AVAILABLE_METRICS[1], 
    [secondaryMetric]
  );
  
  // Processa os dados quando mudam
  useEffect(() => {
    if (data && Array.isArray(data)) {
      console.log('Dados originais recebidos:', data);
      
      // Garantir que os dados estão ordenados por data
      const sortedData = [...data].sort((a, b) => {
        return new Date(a.date_start).getTime() - new Date(b.date_start).getTime();
      });
      
      console.log('Dados ordenados por data:', sortedData);
      
      // Mapear os dados para dias disponíveis e preencher datas ausentes com zeros
      const datesMap = {};
      const dailyData = [];
      
      // Primeiro, adicionar todos os dias do intervalo ao mapa
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        
        // Criar um array de todas as datas no intervalo
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dateString = formatToDisplayDate(date);
          datesMap[dateString] = {
            date: dateString,
            tooltipDate: dateString,
            raw: {}
          };
          
          // Inicializar todas as métricas com zero
          AVAILABLE_METRICS.forEach(metric => {
            datesMap[dateString][metric.value] = 0;
            datesMap[dateString].raw[metric.value] = 0;
          });
        }
      }
      
      // Agora, preencher com os dados reais disponíveis
      sortedData.forEach(item => {
        const dateLabel = formatToDisplayDate(item.date_start || item.date);
        
        // Garantir que todos os valores sejam números válidos
        const safeNumber = (value) => {
          const num = Number(value);
          return (isNaN(num) || !isFinite(num)) ? 0 : num;
        };
        
        if (datesMap[dateLabel]) {
          // Atualizar valores para este dia
          AVAILABLE_METRICS.forEach(metric => {
            datesMap[dateLabel][metric.value] = safeNumber(item[metric.value]);
            datesMap[dateLabel].raw[metric.value] = item[metric.value];
          });
        }
      });
      
      // Converter o mapa de volta para um array
      Object.values(datesMap).forEach(day => {
        dailyData.push(day);
      });
      
      console.log('Dados formatados para o gráfico:', dailyData);
      setChartData(dailyData);
    } else {
      console.log('Nenhum dado recebido ou formato inválido:', data);
      setChartData([]);
    }
  }, [data, dateRange, primaryMetric, secondaryMetric]);
  
  /**
   * Formata o valor da métrica de acordo com seu tipo
   */
  const formatMetricValue = (value, metric, forTooltip = false) => {
    if (value === undefined || value === null) return '-';
    
    const metricInfo = AVAILABLE_METRICS.find(m => m.value === metric) || {};
    const { format } = metricInfo;
    
    // Para tooltips, formata como string legível
    if (forTooltip) {
      if (format === 'currency') {
        return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      
      if (format === 'percent') {
        return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
      }
      
      return Number(value).toLocaleString('pt-BR');
    }
    
    // Para o eixo e gráfico, retorna o valor numérico
    return Number(value);
  };
  
  // Renderização do tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {data.tooltipDate || label}
          </Typography>
          <Typography variant="body2" color={primaryMetricInfo.color} fontWeight="bold">
            {`${primaryMetricInfo.label}: ${formatMetricValue(data[primaryMetric], primaryMetric, true)}`}
          </Typography>
          <Typography variant="body2" color={secondaryMetricInfo.color} fontWeight="bold">
            {`${secondaryMetricInfo.label}: ${formatMetricValue(data[secondaryMetric], secondaryMetric, true)}`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };
  
  // Manipulador para tipo de gráfico
  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      setChartType(newType);
    }
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
  
  // Renderiza o gráfico apropriado com base no tipo selecionado
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 35 }
    };
    
    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              angle={-45}
              tickMargin={20}
              tick={{ fontSize: 12 }}
            >
              <Label value="Data" offset={-10} position="insideBottom" />
            </XAxis>
            <YAxis 
              yAxisId="left"
              tickFormatter={(value) => formatMetricValue(value, primaryMetric, true)}
            >
              <Label 
                value={primaryMetricInfo.label} 
                angle={-90} 
                position="insideLeft" 
                style={{ textAnchor: 'middle' }} 
              />
            </YAxis>
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tickFormatter={(value) => formatMetricValue(value, secondaryMetric, true)}
            >
              <Label 
                value={secondaryMetricInfo.label} 
                angle={90} 
                position="insideRight" 
                style={{ textAnchor: 'middle' }} 
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Area
              name={primaryMetricInfo.label}
              type="monotone"
              dataKey={primaryMetric}
              stroke={primaryMetricInfo.color}
              fill={primaryMetricInfo.color}
              fillOpacity={0.3}
              yAxisId={primaryMetricInfo.axis || "left"}
              connectNulls={true}
              isAnimationActive={true}
            />
            <Area
              name={secondaryMetricInfo.label}
              type="monotone"
              dataKey={secondaryMetric}
              stroke={secondaryMetricInfo.color}
              fill={secondaryMetricInfo.color}
              fillOpacity={0.3}
              yAxisId={secondaryMetricInfo.axis || "right"}
              connectNulls={true}
              isAnimationActive={true}
            />
          </AreaChart>
        );
        
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              angle={-45}
              tickMargin={20}
              tick={{ fontSize: 12 }}
            >
              <Label value="Data" offset={-10} position="insideBottom" />
            </XAxis>
            <YAxis 
              yAxisId="left"
              tickFormatter={(value) => formatMetricValue(value, primaryMetric, true)}
            >
              <Label 
                value={primaryMetricInfo.label} 
                angle={-90} 
                position="insideLeft" 
                style={{ textAnchor: 'middle' }} 
              />
            </YAxis>
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tickFormatter={(value) => formatMetricValue(value, secondaryMetric, true)}
            >
              <Label 
                value={secondaryMetricInfo.label} 
                angle={90} 
                position="insideRight" 
                style={{ textAnchor: 'middle' }} 
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Bar
              name={primaryMetricInfo.label}
              dataKey={primaryMetric}
              fill={primaryMetricInfo.color}
              yAxisId={primaryMetricInfo.axis || "left"}
              isAnimationActive={true}
            />
            <Line
              name={secondaryMetricInfo.label}
              type="monotone"
              dataKey={secondaryMetric}
              stroke={secondaryMetricInfo.color}
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
              strokeWidth={2}
              yAxisId={secondaryMetricInfo.axis || "right"}
              connectNulls={true}
              isAnimationActive={true}
            />
          </ComposedChart>
        );
        
      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              angle={-45}
              tickMargin={20}
              tick={{ fontSize: 12 }}
            >
              <Label value="Data" offset={-10} position="insideBottom" />
            </XAxis>
            <YAxis 
              yAxisId="left"
              tickFormatter={(value) => formatMetricValue(value, primaryMetric, true)}
            >
              <Label 
                value={primaryMetricInfo.label} 
                angle={-90} 
                position="insideLeft" 
                style={{ textAnchor: 'middle' }} 
              />
            </YAxis>
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tickFormatter={(value) => formatMetricValue(value, secondaryMetric, true)}
            >
              <Label 
                value={secondaryMetricInfo.label} 
                angle={90} 
                position="insideRight" 
                style={{ textAnchor: 'middle' }} 
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Line
              name={primaryMetricInfo.label}
              type="monotone"
              dataKey={primaryMetric}
              stroke={primaryMetricInfo.color}
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ r: 4 }}
              yAxisId={primaryMetricInfo.axis || "left"}
              connectNulls={true}
              isAnimationActive={true}
            />
            <Line
              name={secondaryMetricInfo.label}
              type="monotone"
              dataKey={secondaryMetric}
              stroke={secondaryMetricInfo.color}
              activeDot={{ r: 8 }}
              strokeWidth={2}
              dot={{ r: 4 }}
              yAxisId={secondaryMetricInfo.axis || "right"}
              connectNulls={true}
              isAnimationActive={true}
            />
          </LineChart>
        );
    }
  };
  
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
        <Typography variant="h6">
          Análise de Desempenho
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            size="small"
            aria-label="tipo de gráfico"
          >
            <ToggleButton value="line" aria-label="linha">
              Linha
            </ToggleButton>
            <ToggleButton value="area" aria-label="área">
              Área
            </ToggleButton>
            <ToggleButton value="composed" aria-label="composto">
              Combinado
            </ToggleButton>
          </ToggleButtonGroup>
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Métrica Principal</InputLabel>
            <Select
              value={primaryMetric}
              onChange={(e) => setPrimaryMetric(e.target.value)}
              label="Métrica Principal"
            >
              {AVAILABLE_METRICS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Métrica Secundária</InputLabel>
            <Select
              value={secondaryMetric}
              onChange={(e) => setSecondaryMetric(e.target.value)}
              label="Métrica Secundária"
            >
              {AVAILABLE_METRICS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      {dateRange && (
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Período: {formatToDisplayDate(dateRange.startDate)} - {formatToDisplayDate(dateRange.endDate)}
        </Typography>
      )}
      
      <Box height={400}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default DashboardPerformanceChart;
