import { NextRequest, NextResponse } from 'next/server';
import { getConfig, isDateWithinBookingWindow } from '@/lib/config';
import { encrypt } from '@/lib/encryption';
import { sendEmail, generateSolicitudEmailHTML } from '@/lib/email';
import { getDayOfWeekInArgentina } from '@/lib/googleCalendar';
import { createApiLogger } from '@/lib/logger';
import { getPhoneValidationError, normalizePhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  const log = createApiLogger('turnos.solicitar');
  const startedAt = Date.now();

  try {
    const body = await request.json();
    const { nombre, apellido, telefono, email, fecha, hora } = body;

    log.info('request_received', {
      fecha: fecha || null,
      hora: hora || null,
      email: email || null,
      telefono: telefono ? '***' : null,
      cliente: nombre && apellido ? `${nombre} ${apellido}` : null,
    });

    if (!nombre || !apellido || !telefono || !email || !fecha || !hora) {
      log.warn('validation_failed', { reason: 'missing_fields' });
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const telefonoError = getPhoneValidationError(telefono);
    if (telefonoError) {
      log.warn('validation_failed', { reason: 'invalid_telefono', detail: telefonoError });
      return NextResponse.json(
        { error: telefonoError },
        { status: 400 }
      );
    }
    const telefonoLimpio = normalizePhone(telefono);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      log.warn('validation_failed', { reason: 'invalid_email', email });
      return NextResponse.json(
        { error: 'El formato del email no es válido' },
        { status: 400 }
      );
    }

    const config = getConfig();
    log.info('config_loaded', {
      enabled: config.enabled,
      startHour: config.startHour,
      endHour: config.endHour,
      allowedDays: config.allowedDays,
      minAdvanceDays: config.minAdvanceDays,
      maxAdvanceDays: config.maxAdvanceDays,
    });

    if (!config.enabled) {
      log.warn('rejected', { reason: 'system_disabled', fecha, hora });
      return NextResponse.json(
        { error: 'Las reservas están deshabilitadas temporalmente' },
        { status: 400 }
      );
    }

    const diaSemana = getDayOfWeekInArgentina(fecha);
    if (!config.allowedDays.includes(diaSemana)) {
      log.warn('rejected', { reason: 'day_not_allowed', fecha, diaSemana, allowedDays: config.allowedDays });
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
      log.warn('rejected', {
        reason: 'hour_out_of_range',
        hora,
        startHour: config.startHour,
        endHour: config.endHour,
      });
      return NextResponse.json(
        { error: 'El horario seleccionado no está disponible para reservas' },
        { status: 400 }
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

    const turnoData = {
      nombre,
      apellido,
      telefono: telefonoLimpio,
      email,
      fecha,
      hora,
    };

    const encryptedData = encrypt(JSON.stringify(turnoData));
    log.info('payload_encrypted', { fecha, hora, email });

    let baseUrl = 'http://localhost:3000';
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }

    const confirmUrl = `${baseUrl}/confirmar-turno?data=${encodeURIComponent(encryptedData)}`;
    log.info('confirm_url_built', { baseUrl });

    try {
      log.info('admin_email_send_start', { to: adminEmail, fecha, hora });
      await sendEmail(
        adminEmail,
        `Nueva Solicitud de Turno - ${nombre} ${apellido}`,
        generateSolicitudEmailHTML(nombre, apellido, telefonoLimpio, email, fecha, hora, confirmUrl)
      );
      log.info('admin_email_send_done', { to: adminEmail });
    } catch (emailError: any) {
      log.error('admin_email_send_failed', {
        to: adminEmail,
        error: emailError?.message || 'unknown_email_error',
      });
      return NextResponse.json(
        { error: 'Error al enviar el email. Por favor, verifica la configuración de email.' },
        { status: 500 }
      );
    }

    log.info('request_success', {
      fecha,
      hora,
      email,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de turno enviada exitosamente',
    });
  } catch (error: any) {
    log.error('request_failed', {
      error: error?.message || 'unknown_error',
      stack: error?.stack,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud de turno' },
      { status: 500 }
    );
  }
}
