import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Página de erro 404 - Não encontrado
 */
const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <Container maxWidth="md">
      <Box mt={10} mb={5} textAlign="center">
        <Paper elevation={0} sx={{ p: 5, borderRadius: 2 }}>
          <ErrorOutlineIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom>
            Página não encontrada
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            A página que você está procurando não existe ou foi movida para outro local.
          </Typography>
          
          <Box mt={4}>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={() => navigate('/dashboard')}
            >
              Voltar para o Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;
