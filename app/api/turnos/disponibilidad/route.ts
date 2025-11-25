import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability, createDateInArgentinaTimezone } from '@/lib/googleCalendar';
import { addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] [DISPONIBILIDAD] Iniciando consulta de disponibilidad`);

  try {
    const { fecha, hora } = await request.json();
    console.log(`[${requestId}] [DISPONIBILIDAD] Parámetros recibidos:`, { fecha, hora });

    if (!fecha || !hora) {
      console.log(`[${requestId}] [DISPONIBILIDAD] Error: Fecha o hora faltantes`);
      return NextResponse.json(
        { error: 'Fecha y hora son requeridos' },
        { status: 400 }
      );
    }

    // Crear las fechas interpretándolas como hora de Argentina (UTC-3)
    const startDateTime = createDateInArgentinaTimezone(fecha, hora);
    const endDateTime = addMinutes(startDateTime, 30); // Turno de 30 minutos
    console.log(`[${requestId}] [DISPONIBILIDAD] Fechas calculadas (Argentina UTC-3):`, {
      fecha,
      hora,
      inicioISO: startDateTime.toISOString(),
      finISO: endDateTime.toISOString(),
      inicioLocal: startDateTime.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
      finLocal: endDateTime.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
    });

    // Validar que las variables de entorno estén configuradas
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CALENDAR_ID) {
      console.error(`[${requestId}] [DISPONIBILIDAD] Error: Variables de entorno de Google Calendar no configuradas`);
      return NextResponse.json(
        { error: 'Configuración de Google Calendar no encontrada. Por favor, configura las variables de entorno GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY y GOOGLE_CALENDAR_ID.' },
        { status: 500 }
      );
    }

    const googleConfig = {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
    };
    console.log(`[${requestId}] [DISPONIBILIDAD] Consultando disponibilidad en Google Calendar...`);

    const disponible = await checkAvailability(
      googleConfig,
      startDateTime,
      endDateTime
    );

    console.log(`[${requestId}] [DISPONIBILIDAD] Resultado:`, { disponible, fecha, hora });
    return NextResponse.json({ disponible });
  } catch (error: any) {
    console.error(`[${requestId}] [DISPONIBILIDAD] Error verificando disponibilidad:`, {
      message: error.message,
      stack: error.stack,
      error: error,
    });
    return NextResponse.json(
      { error: error.message || 'Error verificando disponibilidad' },
      { status: 500 }
    );
  }
}

