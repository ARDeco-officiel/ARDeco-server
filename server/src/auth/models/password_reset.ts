import { IsEmail, IsNotEmpty } from "@nestjs/class-validator";
import { PrimaryGeneratedColumn } from "typeorm";

export class LoginDto {
    @PrimaryGeneratedColumn()
    id: number;

    @IsNotEmpty()
    @IsEmail()
    email: string;
}
