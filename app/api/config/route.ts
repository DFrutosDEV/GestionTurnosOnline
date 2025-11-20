import { NextRequest, NextResponse } from 'next/server';
import { getConfig, updateConfig } from '@/lib/config';

export async function GET() {
  try {
    const config = getConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error obteniendo configuración' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const newConfig = await request.json();
    const updated = updateConfig(newConfig);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error actualizando configuración' },
      { status: 500 }
    );
  }
}

