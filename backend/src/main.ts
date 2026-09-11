import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle("Messenger API")
    .setDescription("API документация для мессенджера")
    .setVersion("1.0")
    // .addBearerAuth() // если используешь JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
