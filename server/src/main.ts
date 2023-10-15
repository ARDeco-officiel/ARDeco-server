import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe());
    app.use(cookieParser());
    app.enableCors({
      origin: 'http://localhost:3000', // Remplacez par l'URL de votre application Vue.js
      methods: 'POST',
    });
    await app.listen(8000);
}

bootstrap();
