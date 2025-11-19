import { AppLoggerService } from '../logger/logger.service';

/**
 * Decorator para medir performance de métodos
 * Usage: @TrackPerformance()
 * @param threshold - threshold em ms para considerar operação lenta (default: 1000ms)
 */
export function TrackPerformance(threshold: number = 1000): MethodDecorator {
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

      const operationName = `${className}.${String(propertyKey)}`;
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Log de performance
        logger.performance(operationName, duration, {
          threshold,
          args: args.length,
        });

        // Warning se exceder o threshold
        if (duration > threshold) {
          logger.warn(`⚠️  Slow operation detected: ${operationName} took ${duration}ms`, {
            threshold,
            duration,
            exceedBy: duration - threshold,
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `Performance tracking failed for ${operationName}`,
          error instanceof Error ? error.stack : undefined,
          { duration },
        );
        throw error;
      }
    };

    return descriptor;
  };
}
