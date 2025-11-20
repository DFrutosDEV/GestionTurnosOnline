/**
 * Configuración por defecto del sistema
 */
export interface SystemConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowedDays: number[]; // 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado
  calendarEmail: string;
}

export const DEFAULT_CONFIG: SystemConfig = {
  enabled: true,
  startHour: 10,
  endHour: 20,
  allowedDays: [2, 3, 4, 5, 6], // Martes a Sábado
  calendarEmail: process.env.DEFAULT_CALENDAR_EMAIL || '',
};

// En producción, esto debería estar en una base de datos o localStorage
// Por ahora usamos una variable en memoria
let currentConfig: SystemConfig = { ...DEFAULT_CONFIG };

export function getConfig(): SystemConfig {
  return { ...currentConfig };
}

export function updateConfig(newConfig: Partial<SystemConfig>): SystemConfig {
  currentConfig = { ...currentConfig, ...newConfig };
  return { ...currentConfig };
}

