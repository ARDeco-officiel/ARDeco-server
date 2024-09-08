import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cart } from "../../cart/models/cart.entity";
import { GalleryReport } from "../../report/gallery/models/gallery_reports.entity";
import { Gallery } from "../../gallery/models/gallery.entity";
import { Comment } from "../../comment/models/comment.entity";
import { Feedback } from "../../feedback/models/feedback.entity";
import { UserSettings } from "../../user_settings/models/user_settings.entity";
import { ProfilePicture } from "../../profile_picture/profile_picture.entity";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    /* TODO : Implement pseudo
        @Column({ unique: true })
        pseudo: string;
    */

    @Column()
    first_name: string; // First name for users, company name for companies

    @Column({ default: "" })
    last_name: string; // Last name for users, sub-company name (or company name if not) for companies

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    city: string;

    @Column()
    password: string;

    @Column({ default: 0 }) // 0 = false, 1 = true
    deleted: boolean;

    @Column({ default: "client" })
    role: string; // client, company, admin

    @Column({ nullable: true })
    company_api_key: string; // API key for company users, null for all other account types

    @OneToOne(() => Cart, cart => cart.user, { eager: true })
    @JoinColumn({
        name: "cart_id",
        referencedColumnName: "id"
    })
    cart: Cart;

    @Column({
        type: "int",
        nullable: true,
        default: null
    })
    cart_id: number;

    @OneToMany(_ => GalleryReport, galleryReport => galleryReport.user)
    galleryReports: GalleryReport[];

    @OneToMany(_ => Gallery, gallery => gallery.user)
    galleries: Gallery[];

    // TODO : Many to One with ProfilePicture
    /*@ManyToOne(type => ProfilePicture, (profile_picture) => profile_picture.users)
    @JoinColumn({
        name: "profile_picture_id",
        referencedColumnName: "id"
    })
    profile_picture: ProfilePicture*/

    @Column({ type: "int", default: 0 })
    profile_picture_id: number;

    @Column({ nullable: true })
    checkEmailToken: string;

    @Column({
        nullable: true,
        type: "timestamp",
        default: null
    })
    checkEmailSent: Date;

    @Column({
        type: "boolean",
        default: false // 0 = false, 1 = true
    })
    hasCheckedEmail: boolean;

    @OneToMany(_ => Comment, galleryComment => galleryComment.user)
    galleryComments: Comment[];

    @OneToMany(_ => Feedback, feedback => feedback.user)
    feedbacks: Feedback[];

    @OneToOne(_ => UserSettings, settings => settings.user, { eager: true, onDelete: "SET NULL" })
    @JoinColumn({
        name: "user_settings_id",
    })
    settings: UserSettings;
}
