import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Catalog } from "./models/catalog.entity";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { UserModule } from "../user/user.module";
import { ArchiveModule } from "../archive/archive.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([Catalog]),
        JwtModule.register({
            secret: "secret"
        }),
        UserModule,
        forwardRef(() => ArchiveModule)
    ],
    controllers: [CatalogController],
    providers: [CatalogService],
    exports: [CatalogService]
})
export class CatalogModule {}
