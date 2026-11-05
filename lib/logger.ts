type LogLevel = 'info' | 'warn' | 'error';

function stamp() {
  return new Date().toISOString();
}

function createRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function write(level: LogLevel, scope: string, requestId: string, message: string, data?: Record<string, unknown>) {
  const payload = {
    ts: stamp(),
    level,
    scope,
    requestId,
    message,
    ...(data ? { data } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createApiLogger(scope: string) {
  const requestId = createRequestId();

  return {
    requestId,
    info: (message: string, data?: Record<string, unknown>) => write('info', scope, requestId, message, data),
    warn: (message: string, data?: Record<string, unknown>) => write('warn', scope, requestId, message, data),
    error: (message: string, data?: Record<string, unknown>) => write('error', scope, requestId, message, data),
  };
}
