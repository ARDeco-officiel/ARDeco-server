import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CatalogColors } from "./catalog_colors.entity";
import { CatalogRooms } from "./catalog_rooms.entity";
import { CatalogStyles } from "./catalog_styles.entity";

@Entity("catalog")
export class Catalog {
    @PrimaryGeneratedColumn()
    id: number; // Product ID

    @Column()
    name: string; // Product name

    @Column()
    price: number; // in euro cents

    @OneToMany(_ => CatalogStyles, catalogStyles => catalogStyles.style)
    styles: CatalogStyles[];

    @OneToMany(_ => CatalogRooms, catalogRooms => catalogRooms.room)
    rooms: CatalogRooms[];

    @Column()
    width: number; // in cm

    @Column()
    height: number; // in cm

    @Column()
    depth: number; // in cm

    @OneToMany(_ => CatalogColors, catalogColors => catalogColors.furniture)
    colors: CatalogColors[];

    @Column()
    object_id: string; // Partner object ID

    @Column({ type: "int", default: 0 }) // Default is used when no model is available
    model_id: number; // 3D model ID in the model database

    @Column({ default: true })
    active: boolean; // true if the product is active, false if it is not active

    @Column()
    company: number; // Company ID

    @Column()
    company_name: string; // Company name
}
