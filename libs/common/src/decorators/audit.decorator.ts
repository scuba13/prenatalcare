import { AppLoggerService } from '../logger/logger.service';

/**
 * Decorator para auditoria de operações sensíveis
 * Usage: @Audit('OPERATION_NAME')
 */
export function Audit(operation: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const logger = new AppLoggerService();
      logger.setContext('Audit');

      const methodName = `${className}.${String(propertyKey)}`;
      const startTime = Date.now();

      // Log de auditoria - entrada
      logger.log(`🔍 AUDIT START: ${operation}`, {
        operation,
        method: methodName,
        timestamp: new Date().toISOString(),
        args: sanitizeArgs(args),
      });

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Log de auditoria - sucesso
        logger.log(`✅ AUDIT SUCCESS: ${operation}`, {
          operation,
          method: methodName,
          duration,
          timestamp: new Date().toISOString(),
          result: sanitizeResult(result),
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log de auditoria - falha
        logger.error(
          `❌ AUDIT FAILURE: ${operation}`,
          error instanceof Error ? error.stack : undefined,
          {
            operation,
            method: methodName,
            duration,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          },
        );

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Sanitiza argumentos para não logar dados sensíveis
 */
function sanitizeArgs(args: any[]): any {
  // Remove senhas, tokens, etc
  const sanitized = JSON.parse(JSON.stringify(args));

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];

  function recursiveSanitize(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(recursiveSanitize);
    }

    const result: any = {};
    for (const key in obj) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        result[key] = '***REDACTED***';
      } else {
        result[key] = recursiveSanitize(obj[key]);
      }
    }
    return result;
  }

  return recursiveSanitize(sanitized);
}

/**
 * Sanitiza resultado para não logar dados sensíveis
 */
function sanitizeResult(result: any): any {
  if (typeof result !== 'object' || result === null) {
    return result;
  }

  // Limita o tamanho do resultado no log
  const stringified = JSON.stringify(result);
  if (stringified.length > 1000) {
    return `[Result too large: ${stringified.length} chars]`;
  }

  return sanitizeArgs([result])[0];
}
