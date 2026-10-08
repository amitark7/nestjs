// Jest stand-in for the ESM-only @nestjs/terminus package.
// Used by unit specs (via jest.mock) and by the e2e config (via moduleNameMapper).
import { Module } from '@nestjs/common';

export const HealthCheck =
  (..._args: any[]) =>
  (_target: any, _key?: any, _desc?: any) =>
    undefined;

export class HealthCheckService {
  check = jest.fn().mockResolvedValue({ status: 'ok' });
}
export class TypeOrmHealthIndicator {
  pingCheck = jest.fn().mockResolvedValue({ database: { status: 'up' } });
}
export class MemoryHealthIndicator {
  checkHeap = jest.fn();
  checkRSS = jest.fn();
}
export class DiskHealthIndicator {
  checkStorage = jest.fn();
}
export class HttpHealthIndicator {
  pingCheck = jest.fn();
}

// A real (empty-ish) Nest module so `imports: [TerminusModule]` provides
// the mock services to whatever imports it.
@Module({
  providers: [
    HealthCheckService,
    TypeOrmHealthIndicator,
    MemoryHealthIndicator,
    DiskHealthIndicator,
    HttpHealthIndicator,
  ],
  exports: [
    HealthCheckService,
    TypeOrmHealthIndicator,
    MemoryHealthIndicator,
    DiskHealthIndicator,
    HttpHealthIndicator,
  ],
})
export class TerminusModule {
  static forRoot() {
    return TerminusModule;
  }
}
