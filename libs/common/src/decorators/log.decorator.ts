import { AppLoggerService } from '../logger/logger.service';

/**
 * Decorator para logar entrada e saída de métodos
 * Usage: @Log()
 */
export function Log(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const logger = new AppLoggerService();
      logger.setContext(className);

      const methodName = `${className}.${String(propertyKey)}`;
      const startTime = Date.now();

      // Log de entrada
      logger.methodEntry(methodName, args);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Log de saída com sucesso
        logger.methodExit(methodName, result, duration);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log de erro
        logger.error(
          `Error in ${methodName}`,
          error instanceof Error ? error.stack : undefined,
          {
            duration,
            args,
            error: error instanceof Error ? error.message : String(error),
          },
        );

        throw error;
      }
    };

    return descriptor;
  };
}
