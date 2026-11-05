import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability, createCalendarEvent, createDateInArgentinaTimezone, getDayOfWeekInArgentina } from '@/lib/googleCalendar';
import { getConfig, isDateWithinBookingWindow } from '@/lib/config';
import { createApiLogger } from '@/lib/logger';
import { addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  const log = createApiLogger('turnos.reservar');
  const startedAt = Date.now();

  try {
    const { nombre, apellido, fecha, hora } = await request.json();

    log.info('request_received', {
      fecha: fecha || null,
      hora: hora || null,
      cliente: nombre && apellido ? `${nombre} ${apellido}` : null,
    });

    if (!nombre || !apellido || !fecha || !hora) {
      log.warn('validation_failed', { reason: 'missing_fields' });
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const config = getConfig();
    log.info('config_loaded', {
      enabled: config.enabled,
      startHour: config.startHour,
      endHour: config.endHour,
      allowedDays: config.allowedDays,
    });

    if (!config.enabled) {
      log.warn('rejected', { reason: 'system_disabled' });
      return NextResponse.json(
        { error: 'Las reservas están deshabilitadas temporalmente' },
        { status: 400 }
      );
    }

    const diaSemana = getDayOfWeekInArgentina(fecha);
    if (!config.allowedDays.includes(diaSemana)) {
      log.warn('rejected', { reason: 'day_not_allowed', fecha, diaSemana });
      return NextResponse.json(
        { error: 'El día seleccionado no está disponible para reservas' },
        { status: 400 }
      );
    }

    const [year, month, day] = fecha.split('-').map(Number);
    const fechaTurno = new Date(year, month - 1, day, 12, 0, 0);
    if (!isDateWithinBookingWindow(fechaTurno, config)) {
      log.warn('rejected', {
        reason: 'outside_booking_window',
        fecha,
        minAdvanceDays: config.minAdvanceDays,
        maxAdvanceDays: config.maxAdvanceDays,
      });
      return NextResponse.json(
        {
          error: `La fecha debe estar entre ${config.minAdvanceDays} y ${config.maxAdvanceDays} días desde hoy`,
        },
        { status: 400 }
      );
    }

    const horaTurno = parseInt(hora.split(':')[0]);
    if (horaTurno < config.startHour || horaTurno > config.endHour) {
      log.warn('rejected', { reason: 'hour_out_of_range', hora });
      return NextResponse.json(
        { error: 'El horario seleccionado no está disponible para reservas' },
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

    const startDateTime = createDateInArgentinaTimezone(fecha, hora);
    const endDateTime = addMinutes(startDateTime, 30);

    const googleConfig = {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
    };

    log.info('availability_check_start', {
      fecha,
      hora,
      startUtc: startDateTime.toISOString(),
      endUtc: endDateTime.toISOString(),
      calendarId: googleConfig.calendarId,
    });

    const disponible = await checkAvailability(googleConfig, startDateTime, endDateTime);
    log.info('availability_check_done', { fecha, hora, disponible });

    if (!disponible) {
      log.warn('rejected', { reason: 'slot_busy', fecha, hora });
      return NextResponse.json(
        { error: 'El horario seleccionado no está disponible' },
        { status: 409 }
      );
    }

    const tituloEvento = `Turno - ${nombre} ${apellido}`;
    log.info('calendar_event_create_start', { tituloEvento, fecha, hora });

    const eventId = await createCalendarEvent(
      googleConfig,
      tituloEvento,
      startDateTime,
      endDateTime,
      config.calendarEmail || undefined
    );

    log.info('request_success', {
      fecha,
      hora,
      eventId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Turno reservado exitosamente',
      eventId,
    });
  } catch (error: any) {
    log.error('request_failed', {
      error: error?.message || 'unknown_error',
      stack: error?.stack,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: error.message || 'Error al reservar el turno' },
      { status: 500 }
    );
  }
}
