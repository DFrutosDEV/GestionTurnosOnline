'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Link, Typography } from '@mui/material';
import ReservaForm from '@/components/ReservaForm';
import LoginDialog from '@/components/LoginDialog';
import AdminPanel from '@/components/AdminPanel';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { APP_VERSION } from '@/lib/version';

const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    h1: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    h2: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    h3: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    h4: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    h5: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    h6: { fontFamily: 'var(--font-display)', fontWeight: 700 },
    button: {
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      textTransform: 'none',
      letterSpacing: '0.01em',
      fontSize: '1.05rem',
    },
  },
  palette: {
    primary: {
      main: '#111111',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#c45c3a',
    },
    background: {
      default: '#f3f1ee',
      paper: '#ffffff',
    },
    text: {
      primary: '#0b1c2c',
      secondary: '#8a8680',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: 'none',
          paddingInline: 20,
          paddingBlock: 12,
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#111111',
          '&:hover': {
            backgroundColor: '#2a2a2a',
          },
          '&.Mui-disabled': {
            backgroundColor: '#cfcbc4',
            color: '#8a8680',
          },
        },
        outlined: {
          borderColor: '#0b1c2c',
          color: '#0b1c2c',
          '&:hover': {
            borderColor: '#0b1c2c',
            backgroundColor: 'rgba(11, 28, 44, 0.04)',
          },
        },
        text: {
          color: '#0b1c2c',
          '&:hover': {
            backgroundColor: 'rgba(11, 28, 44, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderRadius: 4,
          fontSize: '1.05rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#d8d4ce',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0b1c2c',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#c45c3a',
            borderWidth: 1.5,
          },
        },
        input: {
          paddingTop: 16,
          paddingBottom: 16,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '1.05rem',
          '&.Mui-focused': {
            color: '#c45c3a',
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '1.05rem',
        },
      },
    },
  },
});

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  useEffect(() => {
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

      {isAuthenticated ? (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 2, md: 4 },
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: { xs: '1.2rem', sm: '1.45rem' },
                letterSpacing: '-0.02em',
              }}
            >
              MiTurnoVirtual
            </Typography>
            <Button variant="outlined" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </Box>

          <Box sx={{ flex: 1, py: 4, px: { xs: 2, md: 4 } }}>
            <AdminPanel />
          </Box>

          <Box sx={{ px: 2, py: 1.5, textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Versión {APP_VERSION}
              {' · '}
              <Link
                href="https://www.linkedin.com/in/daniel-frutos-83b522210/"
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                color="inherit"
              >
                Desarrollada por Daniel Frutos
              </Link>
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gridTemplateRows: { xs: '220px 1fr', md: '1fr' },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              minHeight: { xs: 220, md: '100vh' },
              backgroundImage: 'url(/barber-tools.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(160deg, rgba(11,28,44,0.55) 0%, rgba(11,28,44,0.25) 55%, rgba(11,28,44,0.45) 100%)',
              }}
            />
            <Typography
              component="p"
              sx={{
                position: 'absolute',
                top: { xs: 20, md: 36 },
                left: { xs: 20, md: 36 },
                zIndex: 1,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: { xs: '1.55rem', md: '2rem' },
                letterSpacing: '-0.03em',
                color: '#f3f1ee',
                lineHeight: 1,
              }}
            >
              MiTurnoVirtual
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: { xs: 'auto', md: '100vh' },
              bgcolor: 'background.default',
              px: { xs: 3, sm: 5, md: 7 },
              py: { xs: 4, md: 5 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                mb: { xs: 2, md: 1 },
              }}
            >
              <Button
                variant="text"
                onClick={() => setLoginDialogOpen(true)}
                sx={{
                  fontWeight: 600,
                  color: 'text.secondary',
                  px: 1.5,
                  '&:hover': { color: 'text.primary' },
                }}
              >
                Iniciar sesión
              </Button>
            </Box>

            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                maxWidth: 560,
                mx: 'auto',
              }}
            >
              <ReservaForm />
            </Box>

            <Box sx={{ pt: 3, textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Versión {APP_VERSION}
                {' · '}
                <Link
                  href="https://www.linkedin.com/in/daniel-frutos-83b522210/"
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="inherit"
                >
                  Desarrollada por Daniel Frutos
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </ThemeProvider>
  );
}
