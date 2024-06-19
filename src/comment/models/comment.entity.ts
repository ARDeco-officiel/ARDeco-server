import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Gallery } from "../../gallery/models/gallery.entity";
import { User } from "../../user/models/user.entity";

@Entity("comments")
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(_ => Gallery, gallery => gallery.comments, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "gallery_id",
        referencedColumnName: "id"
    })
    gallery: Gallery;

    @ManyToOne(_ => User, user => user.galleryComments, { onDelete: "CASCADE" })
    @JoinColumn({
        name: "user_id",
        referencedColumnName: "id"
    })
    user: User;

    @Column()
    comment: string;

    @Column({
        type: "datetime",
        default: () => "CURRENT_DATETIME"
    })
    creation_date: Date;
}
