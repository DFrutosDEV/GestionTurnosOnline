'use client';

import { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

export type ToastState = {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
} | null;

interface ToastProps {
  toast: ToastState;
  onClose: () => void;
  autoHideDuration?: number;
}

const softColors = {
  success: {
    bg: '#e8f5e9',
    color: '#2e7d32',
    border: '#a5d6a7',
  },
  error: {
    bg: '#fdecea',
    color: '#c62828',
    border: '#f5c2c0',
  },
  warning: {
    bg: '#fff8e1',
    color: '#b28704',
    border: '#ffe082',
  },
  info: {
    bg: '#eef3f7',
    color: '#0b1c2c',
    border: '#d0dbe6',
  },
} as const;

export default function Toast({
  toast,
  onClose,
  autoHideDuration = 2000,
}: ToastProps) {
  // Conservamos el último toast visible para que no pierda estilos durante el fade-out
  const [displayToast, setDisplayToast] = useState<ToastState>(toast);

  useEffect(() => {
    if (toast) {
      setDisplayToast(toast);
    }
  }, [toast]);

  const open = Boolean(toast);
  const palette = softColors[displayToast?.type || 'info'];

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={(_, reason) => {
        if (reason === 'clickaway') return;
        onClose();
      }}
      TransitionProps={{
        onExited: () => setDisplayToast(null),
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={displayToast?.type || 'info'}
        variant="outlined"
        elevation={0}
        sx={{
          width: '100%',
          minWidth: { xs: 280, sm: 360 },
          fontWeight: 600,
          alignItems: 'center',
          bgcolor: palette.bg,
          color: palette.color,
          borderColor: palette.border,
          boxShadow: '0 8px 24px rgba(11, 28, 44, 0.08)',
          '& .MuiAlert-icon': {
            color: palette.color,
          },
          '& .MuiAlert-action .MuiIconButton-root': {
            color: palette.color,
          },
        }}
      >
        {displayToast?.text}
      </Alert>
    </Snackbar>
  );
}
