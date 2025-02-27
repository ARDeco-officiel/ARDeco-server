import { Module } from "@nestjs/common";
import { FavoriteGalleryController } from "./favorite_gallery.controller";
import { FavoriteGalleryService } from "./favorite_gallery.service";
import { UserModule } from "../user/user.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { FavoriteGallery } from "./models/favorite_gallery.entity";
import { GalleryModule } from "../gallery/gallery.module";

@Module({
    imports: [
        UserModule,
        TypeOrmModule.forFeature([FavoriteGallery]),
        JwtModule.register({
            secret: "secret"
        }),
        GalleryModule
    ],
    controllers: [FavoriteGalleryController],
    providers: [FavoriteGalleryService],
    exports: [FavoriteGalleryService]
})
export class FavoriteGalleryModule {}
