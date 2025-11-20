import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { encrypt } from '@/lib/encryption';
import { sendEmail, generateSolicitudEmailHTML } from '@/lib/email';
import { getDayOfWeekInArgentina } from '@/lib/googleCalendar';

export async function POST(request: NextRequest) {
  try {
    const { nombre, apellido, email, fecha, hora } = await request.json();

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !fecha || !hora) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El formato del email no es válido' },
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

    // Validar día de la semana
    const diaSemana = getDayOfWeekInArgentina(fecha);

    if (!config.allowedDays.includes(diaSemana)) {
      return NextResponse.json(
        { error: 'El día seleccionado no está disponible para reservas' },
        { status: 400 }
      );
    }

    // Validar hora
    const horaTurno = parseInt(hora.split(':')[0]);
    if (horaTurno < config.startHour || horaTurno >= config.endHour) {
      return NextResponse.json(
        { error: 'El horario seleccionado está fuera del rango permitido' },
        { status: 400 }
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

    // Encriptar los datos del turno
    const turnoData = {
      nombre,
      apellido,
      email,
      fecha,
      hora,
    };

    const encryptedData = encrypt(JSON.stringify(turnoData));

    // Generar URL de confirmación
    let baseUrl = 'http://localhost:3000';

    if (process.env.NEXT_PUBLIC_BASE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }

    const confirmUrl = `${baseUrl}/confirmar-turno?data=${encodeURIComponent(encryptedData)}`;

    // Enviar email al admin
    try {
      await sendEmail(
        adminEmail,
        `Nueva Solicitud de Turno - ${nombre} ${apellido}`,
        generateSolicitudEmailHTML(nombre, apellido, email, fecha, hora, confirmUrl)
      );
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
      return NextResponse.json(
        { error: 'Error al enviar el email. Por favor, verifica la configuración de email.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud de turno enviada exitosamente',
    });
  } catch (error: any) {
    console.error('Error procesando solicitud de turno:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud de turno' },
      { status: 500 }
    );
  }
}

