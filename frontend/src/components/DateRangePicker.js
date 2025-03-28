import React, { useState, useEffect } from 'react';
import { Grid, Button, Typography, Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ptBR from 'date-fns/locale/pt-BR';
import { formatToApiDate, parseApiDate } from '../utils/dateUtils';

/**
 * Componente de seleção de intervalo de datas 
 * Garante formatação consistente e validação
 */
const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onChange, 
  showQuickSelectors = true,
  disabled = false
}) => {
  const [start, setStart] = useState(parseApiDate(startDate) || null);
  const [end, setEnd] = useState(parseApiDate(endDate) || null);
  const [error, setError] = useState(null);

  // Atualiza estado interno quando as props mudam
  useEffect(() => {
    setStart(parseApiDate(startDate));
    setEnd(parseApiDate(endDate));
  }, [startDate, endDate]);

  // Valida e notifica mudanças
  const handleChange = (newStart, newEnd) => {
    setStart(newStart);
    setEnd(newEnd);
    
    // Validar datas
    if (newStart && newEnd) {
      if (newStart > newEnd) {
        setError('A data inicial deve ser anterior à data final');
        return;
      }
      
      setError(null);
      
      // Notificar com datas formatadas para API
      if (onChange) {
        onChange({
          startDate: formatToApiDate(newStart),
          endDate: formatToApiDate(newEnd)
        });
      }
    }
  };

  // Seletores rápidos
  const handleQuickSelect = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    handleChange(startDate, endDate);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box mb={2}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Data Inicial"
              value={start}
              onChange={(date) => handleChange(date, end)}
              format="dd/MM/yyyy"
              disabled={disabled}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'outlined',
                  size: 'small',
                  error: !!error
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Data Final"
              value={end}
              onChange={(date) => handleChange(start, date)}
              format="dd/MM/yyyy"
              disabled={disabled}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'outlined',
                  size: 'small',
                  error: !!error
                }
              }}
            />
          </Grid>
          
          {showQuickSelectors && (
            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleQuickSelect(7)}
                  disabled={disabled}
                >
                  7 dias
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleQuickSelect(30)}
                  disabled={disabled}
                >
                  30 dias
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => handleQuickSelect(90)}
                  disabled={disabled}
                >
                  90 dias
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
        
        {error && (
          <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default DateRangePicker;
