import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { checkAvailability, createCalendarEvent, createDateInArgentinaTimezone } from '@/lib/googleCalendar';
import { getConfig } from '@/lib/config';
import { createApiLogger } from '@/lib/logger';
import { addMinutes } from 'date-fns';
import { sendEmail, generateConfirmacionEmailHTML } from '@/lib/email';

interface TurnoData {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fecha: string;
  hora: string;
}

export async function POST(request: NextRequest) {
  const log = createApiLogger('turnos.confirmar');
  const startedAt = Date.now();

  try {
    const { data } = await request.json();
    log.info('request_received', { hasData: Boolean(data) });

    if (!data) {
      log.warn('validation_failed', { reason: 'missing_data' });
      return NextResponse.json(
        { error: 'Datos de confirmación no proporcionados' },
        { status: 400 }
      );
    }

    let turnoData: TurnoData;
    try {
      const decryptedData = decrypt(data);
      turnoData = JSON.parse(decryptedData);
      log.info('payload_decrypted', {
        fecha: turnoData.fecha,
        hora: turnoData.hora,
        email: turnoData.email,
        cliente: `${turnoData.nombre} ${turnoData.apellido}`,
      });
    } catch (error: any) {
      log.error('decrypt_failed', { error: error?.message || 'decrypt_error' });
      return NextResponse.json(
        { error: 'Datos de confirmación inválidos o corruptos' },
        { status: 400 }
      );
    }

    if (!turnoData.nombre || !turnoData.apellido || !turnoData.telefono || !turnoData.email || !turnoData.fecha || !turnoData.hora) {
      log.warn('validation_failed', { reason: 'incomplete_turno_data' });
      return NextResponse.json(
        { error: 'Datos incompletos en la solicitud' },
        { status: 400 }
      );
    }

    const config = getConfig();

    if (!config.enabled) {
      log.warn('rejected', { reason: 'system_disabled' });
      return NextResponse.json(
        { error: 'Las reservas están deshabilitadas temporalmente' },
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

    const startDateTime = createDateInArgentinaTimezone(turnoData.fecha, turnoData.hora);
    const endDateTime = addMinutes(startDateTime, 30);

    log.info('availability_check_start', {
      fecha: turnoData.fecha,
      hora: turnoData.hora,
      startUtc: startDateTime.toISOString(),
      endUtc: endDateTime.toISOString(),
    });

    const disponible = await checkAvailability(
      googleConfig,
      startDateTime,
      endDateTime
    );

    log.info('availability_check_done', {
      fecha: turnoData.fecha,
      hora: turnoData.hora,
      disponible,
    });

    if (!disponible) {
      log.warn('rejected', {
        reason: 'slot_busy',
        fecha: turnoData.fecha,
        hora: turnoData.hora,
      });
      return NextResponse.json(
        { error: 'El horario seleccionado ya no está disponible. Puede que haya sido reservado mientras procesabas la solicitud.' },
        { status: 409 }
      );
    }

    const adminEmail = config.calendarEmail || process.env.DEFAULT_CALENDAR_EMAIL;

    if (!adminEmail) {
      log.error('admin_email_missing');
      return NextResponse.json(
        { error: 'No se ha configurado el email del administrador' },
        { status: 500 }
      );
    }

    const tituloEvento = `Turno - ${turnoData.nombre} ${turnoData.apellido}`;
    log.info('calendar_event_create_start', {
      tituloEvento,
      fecha: turnoData.fecha,
      hora: turnoData.hora,
    });

    const eventId = await createCalendarEvent(
      googleConfig,
      tituloEvento,
      startDateTime,
      endDateTime,
      [adminEmail, turnoData.email]
    );

    log.info('calendar_event_create_done', { eventId });

    try {
      log.info('confirmation_emails_send_start', {
        cliente: turnoData.email,
        admin: adminEmail,
      });

      await sendEmail(
        turnoData.email,
        'Turno Confirmado',
        generateConfirmacionEmailHTML(
          turnoData.nombre,
          turnoData.apellido,
          turnoData.fecha,
          turnoData.hora,
          false,
          turnoData.telefono
        )
      );

      await sendEmail(
        adminEmail,
        'Turno Confirmado',
        generateConfirmacionEmailHTML(
          turnoData.nombre,
          turnoData.apellido,
          turnoData.fecha,
          turnoData.hora,
          true,
          turnoData.telefono
        )
      );

      log.info('confirmation_emails_send_done');
    } catch (emailError: any) {
      log.warn('confirmation_emails_send_failed', {
        error: emailError?.message || 'unknown_email_error',
        note: 'event_already_created',
        eventId,
      });
    }

    log.info('request_success', {
      eventId,
      fecha: turnoData.fecha,
      hora: turnoData.hora,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Turno confirmado exitosamente. Se han enviado emails de confirmación.',
      eventId,
    });
  } catch (error: any) {
    log.error('request_failed', {
      error: error?.message || 'unknown_error',
      stack: error?.stack,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: error.message || 'Error al confirmar el turno' },
      { status: 500 }
    );
  }
}
