import { NextRequest, NextResponse } from 'next/server';
import {
  checkAvailability,
  createDateInArgentinaTimezone,
  filterAvailableSlots,
  getBusyPeriodsForDay,
} from '@/lib/googleCalendar';
import { getConfig } from '@/lib/config';
import { createApiLogger } from '@/lib/logger';
import { addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  const log = createApiLogger('turnos.disponibilidad');
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const { fecha, hora } = body;

    log.info('request_received', {
      fecha: fecha || null,
      hora: hora || null,
      mode: hora ? 'slot' : 'day',
    });

    if (!fecha) {
      log.warn('validation_failed', { reason: 'missing_fecha' });
      return NextResponse.json(
        { error: 'Fecha es requerida' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CALENDAR_ID) {
      log.error('google_config_missing');
      return NextResponse.json(
        { error: 'Configuración de Google Calendar no encontrada' },
        { status: 500 }
      );
    }

    const googleConfig = {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
    };

    // Si solo viene la fecha: devolver todos los horarios libres del día
    if (!hora) {
      const config = getConfig();
      log.info('day_query_start', {
        fecha,
        startHour: config.startHour,
        endHour: config.endHour,
        calendarId: googleConfig.calendarId,
      });

      const busyPeriods = await getBusyPeriodsForDay(googleConfig, fecha);
      log.info('day_busy_fetched', {
        fecha,
        busyCount: busyPeriods.length,
        busy: busyPeriods.map((b) => ({
          start: b.start.toISOString(),
          end: b.end.toISOString(),
        })),
      });

      const { disponibles, ocupados } = filterAvailableSlots(
        fecha,
        config.startHour,
        config.endHour,
        busyPeriods
      );

      log.info('day_query_done', {
        fecha,
        disponiblesCount: disponibles.length,
        ocupadosCount: ocupados.length,
        horasDisponibles: disponibles,
        horasOcupadas: ocupados,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json({
        fecha,
        horasDisponibles: disponibles,
        horasOcupadas: ocupados,
      });
    }

    // Si vienen fecha + hora: chequeo puntual (submit)
    const startDateTime = createDateInArgentinaTimezone(fecha, hora);
    const endDateTime = addMinutes(startDateTime, 30);

    log.info('slot_check_start', {
      fecha,
      hora,
      startUtc: startDateTime.toISOString(),
      endUtc: endDateTime.toISOString(),
      calendarId: googleConfig.calendarId,
    });

    const disponible = await checkAvailability(googleConfig, startDateTime, endDateTime);

    log.info('slot_check_done', {
      fecha,
      hora,
      disponible,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ disponible });
  } catch (error: any) {
    log.error('request_failed', {
      error: error?.message || 'unknown_error',
      stack: error?.stack,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: error.message || 'Error verificando disponibilidad' },
      { status: 500 }
    );
  }
}
