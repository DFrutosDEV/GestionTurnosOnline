import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { checkAvailability, createCalendarEvent, createDateInArgentinaTimezone } from '@/lib/googleCalendar';
import { getConfig } from '@/lib/config';
import { addMinutes } from 'date-fns';
import { sendEmail, generateConfirmacionEmailHTML } from '@/lib/email';

interface TurnoData {
  nombre: string;
  apellido: string;
  email: string;
  fecha: string;
  hora: string;
}

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();

    if (!data) {
      return NextResponse.json(
        { error: 'Datos de confirmación no proporcionados' },
        { status: 400 }
      );
    }

    // Desencriptar datos
    let turnoData: TurnoData;
    try {
      const decryptedData = decrypt(data);
      turnoData = JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error desencriptando datos:', error);
      return NextResponse.json(
        { error: 'Datos de confirmación inválidos o corruptos' },
        { status: 400 }
      );
    }

    // Validar datos desencriptados
    if (!turnoData.nombre || !turnoData.apellido || !turnoData.email || !turnoData.fecha || !turnoData.hora) {
      return NextResponse.json(
        { error: 'Datos incompletos en la solicitud' },
        { status: 400 }
      );
    }

    // Obtener configuración
    const config = getConfig();

    // Verificar si el sistema está habilitado
    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Las reservas están deshabilitadas temporalmente' },
        { status: 400 }
      );
    }

    // Validar que las variables de entorno estén configuradas
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CALENDAR_ID) {
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

    // Crear fechas interpretándolas como hora de Argentina
    const startDateTime = createDateInArgentinaTimezone(turnoData.fecha, turnoData.hora);
    const endDateTime = addMinutes(startDateTime, 30); // Turno de 30 minutos

    const disponible = await checkAvailability(
      googleConfig,
      startDateTime,
      endDateTime
    );

    if (!disponible) {
      return NextResponse.json(
        { error: 'El horario seleccionado ya no está disponible. Puede que haya sido reservado mientras procesabas la solicitud.' },
        { status: 409 }
      );
    }

    // Obtener email del admin
    const adminEmail = config.calendarEmail || process.env.DEFAULT_CALENDAR_EMAIL;

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'No se ha configurado el email del administrador' },
        { status: 500 }
      );
    }

    // Crear evento en Google Calendar con ambos emails
    const tituloEvento = `Turno - ${turnoData.nombre} ${turnoData.apellido}`;
    const eventId = await createCalendarEvent(
      googleConfig,
      tituloEvento,
      startDateTime,
      endDateTime,
      [adminEmail, turnoData.email] // Admin y cliente como attendees
    );

    // Enviar emails de confirmación
    try {
      // Email al cliente
      await sendEmail(
        turnoData.email,
        'Turno Confirmado',
        generateConfirmacionEmailHTML(
          turnoData.nombre,
          turnoData.apellido,
          turnoData.fecha,
          turnoData.hora,
          false
        )
      );

      // Email al admin
      await sendEmail(
        adminEmail,
        'Turno Confirmado',
        generateConfirmacionEmailHTML(
          turnoData.nombre,
          turnoData.apellido,
          turnoData.fecha,
          turnoData.hora,
          true
        )
      );
    } catch (emailError) {
      console.error('Error enviando emails de confirmación:', emailError);
      // No fallar si el email falla, el evento ya fue creado
      console.warn('El turno fue creado pero hubo un error enviando los emails de confirmación');
    }

    return NextResponse.json({
      success: true,
      message: 'Turno confirmado exitosamente. Se han enviado emails de confirmación.',
      eventId,
    });
  } catch (error: any) {
    console.error('Error confirmando turno:', error);
    return NextResponse.json(
      { error: error.message || 'Error al confirmar el turno' },
      { status: 500 }
    );
  }
}

