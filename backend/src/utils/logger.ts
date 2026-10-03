export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  STREAM = 'STREAM',
  UPLOAD = 'UPLOAD',
  FFMPEG = 'FFMPEG',
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    let formatted = `[${timestamp}] [${level.padEnd(6)}] ${message}`;
    if (meta !== undefined) {
      if (typeof meta === 'object') {
        try {
          formatted += ` ${JSON.stringify(meta)}`;
        } catch {
          formatted += ` [Complex Object]`;
        }
      } else {
        formatted += ` ${meta}`;
      }
    }
    return formatted;
  }

  info(message: string, meta?: any): void {
    console.log(`\x1b[36m${this.formatMessage(LogLevel.INFO, message, meta)}\x1b[0m`);
  }

  warn(message: string, meta?: any): void {
    console.warn(`\x1b[33m${this.formatMessage(LogLevel.WARN, message, meta)}\x1b[0m`);
  }

  error(message: string, meta?: any): void {
    console.error(`\x1b[31m${this.formatMessage(LogLevel.ERROR, message, meta)}\x1b[0m`);
  }

  debug(message: string, meta?: any): void {
    if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
      console.log(`\x1b[90m${this.formatMessage(LogLevel.DEBUG, message, meta)}\x1b[0m`);
    }
  }

  stream(message: string, meta?: any): void {
    console.log(`\x1b[35m${this.formatMessage(LogLevel.STREAM, message, meta)}\x1b[0m`);
  }

  upload(message: string, meta?: any): void {
    console.log(`\x1b[32m${this.formatMessage(LogLevel.UPLOAD, message, meta)}\x1b[0m`);
  }

  ffmpeg(message: string, meta?: any): void {
    console.log(`\x1b[34m${this.formatMessage(LogLevel.FFMPEG, message, meta)}\x1b[0m`);
  }
}

export const logger = new Logger();
