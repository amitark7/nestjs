import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { TransformInterceptor } from './utils/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.use(helmet());

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription('Task Management API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
  Logger.log(
    `Nest application successfully started on http://localhost:${process.env.PORT ?? 3000}`,
  );
}
bootstrap();
