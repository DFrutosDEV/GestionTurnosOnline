'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
} from '@mui/material';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginDialog({
  open,
  onClose,
  onLoginSuccess,
}: LoginDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('isAuthenticated', 'true');
        onLoginSuccess();
        onClose();
        setUsername('');
        setPassword('');
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.5,
          bgcolor: '#f3f1ee',
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            pb: 1,
          }}
        >
          Iniciar sesión
          <Box
            sx={{
              width: 40,
              height: 3,
              bgcolor: '#c45c3a',
              mt: 1,
            }}
          />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              disabled={loading}
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              disabled={loading}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={onClose} disabled={loading} variant="outlined">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Iniciar sesión
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
