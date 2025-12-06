'use client';

import { useState, useEffect } from 'react';
import { Container, Box, Button, AppBar, Toolbar, Typography } from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import ReservaForm from '@/components/ReservaForm';
import LoginDialog from '@/components/LoginDialog';
import AdminPanel from '@/components/AdminPanel';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { APP_VERSION } from '@/lib/version';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  useEffect(() => {
    // Verificar si el usuario está autenticado
    const authStatus = sessionStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Sistema de Gestión de Turnos
            </Typography>
            {!isAuthenticated ? (
              <Button
                color="inherit"
                startIcon={<LoginIcon />}
                onClick={() => setLoginDialogOpen(true)}
              >
                Iniciar Sesión
              </Button>
            ) : (
              <Button color="inherit" onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          {isAuthenticated ? (
            <AdminPanel />
          ) : (
            <Box>
              <ReservaForm />
            </Box>
          )}
        </Container>

        <LoginDialog
          open={loginDialogOpen}
          onClose={() => setLoginDialogOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        <Box
          component="footer"
          sx={{
            mt: 'auto',
            py: 2,
            px: 2,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography align="right" variant="body2" color="text.secondary">
            Versión {APP_VERSION}
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

