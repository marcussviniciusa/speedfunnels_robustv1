import React, { useState, useEffect } from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Box, 
  CircularProgress 
} from '@mui/material';
import api from '../services/api';

/**
 * Componente de seleção de conta de anúncio do Meta
 * Permite ao usuário escolher entre as contas disponíveis
 */
const AccountSelector = ({ value, onChange, disabled = false }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar contas disponíveis - apenas uma vez na montagem
  useEffect(() => {
    let isMounted = true;
    const fetchAccounts = async () => {
      try {
        const response = await api.get('/meta-accounts');
        
        if (isMounted) {
          if (response.data && response.data.success) {
            // Usar accounts em vez de data de acordo com a API real
            setAccounts(response.data.accounts || []);
          } else {
            setError(response.data?.error || 'Erro ao carregar contas');
          }
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Erro ao buscar contas:', error);
          setError(error.response?.data?.message || error.message || 'Erro desconhecido');
          setLoading(false);
        }
      }
    };
    
    fetchAccounts();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Dependência vazia para executar apenas uma vez

  // Tratador de mudança
  const handleChange = (event) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  // Se estiver carregando, mostrar indicador
  if (loading) {
    return (
      <Box display="flex" alignItems="center">
        <CircularProgress size={20} />
        <Box ml={1}>Carregando contas...</Box>
      </Box>
    );
  }

  // Se houve erro, mostrar mensagem simples
  if (error) {
    return (
      <Box color="error.main">
        Erro ao carregar contas: {error}
      </Box>
    );
  }

  // Renderizar seletor
  return (
    <FormControl fullWidth variant="outlined" size="small" disabled={disabled || loading}>
      <InputLabel id="account-selector-label">Conta de Anúncio</InputLabel>
      <Select
        labelId="account-selector-label"
        id="account-selector"
        value={value || ''}
        onChange={handleChange}
        label="Conta de Anúncio"
      >
        <MenuItem value="">
          <em>Conta padrão</em>
        </MenuItem>
        {accounts.map((account) => (
          <MenuItem key={account.accountId} value={account.accountId}>
            {account.name || account.accountId}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default AccountSelector;
