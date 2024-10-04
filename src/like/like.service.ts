import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, FindOptionsRelations, FindOptionsSelect, FindOptionsWhere, Repository } from "typeorm";
import { QueryPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { Like } from "./models/like.entity";

@Injectable()
export class LikeService {
    constructor(
        @InjectRepository(Like)
        private readonly likeRepository: Repository<Like>
    ) {
    }

    async create(user: number, gallery: number) {
        const like = new Like();
        like.user_id = user;
        like.gallery_id = gallery;
        return await this.likeRepository.save(like);
    }

    async findOne(
        where: FindOptionsWhere<Like>,
        relations: FindOptionsRelations<Like> = {},
        select: FindOptionsSelect<Like> = {},
        loadIds: boolean = false
    ): Promise<Like> {
        return this.likeRepository.findOne({
            where: where,
            relations: relations,
            loadRelationIds: loadIds,
            loadEagerRelations: false,
            select: select
        });
    }

    async findOneById(
        id: number,
        relations: FindOptionsRelations<Like>,
        select: FindOptionsSelect<Like> = {}
    ) {
        return this.findOne({ id: id }, relations, select);
    }

    async findAll(
        where: FindOptionsWhere<Like> = {},
        relations: FindOptionsRelations<Like> = {},
        select: FindOptionsSelect<Like> = {},
        loadIds: boolean = false
    ): Promise<Like[]> {
        let options: FindManyOptions<Like> = {
            where: where,
            relations: relations,
            loadRelationIds: loadIds,
            loadEagerRelations: false,
            select: select
        };
        return this.likeRepository.find(options);
    }

    async findForUser(user_id: number): Promise<Like[]> {
        return this.likeRepository.find({
            where: { user_id: user_id },
            relations: {
                gallery: true
            },
            loadEagerRelations: false,
            loadRelationIds: false,
            select: {
                id: true,
                gallery: {
                    id: true
                }
            }
        });
    }

    async findForGallery(gallery_id: number): Promise<Like[]> {
        return this.likeRepository.find({
            where: { gallery_id: gallery_id },
            relations: { user: true },
            loadEagerRelations: false,
            loadRelationIds: false,
            select: {
                id: true,
                user: {
                    id: true
                }
            }
        });
    }

    async numberForUser(user_id: number): Promise<number> {
        return (await this.likeRepository.find({ where: { user_id: user_id } })).length;
    }

    async numberForGallery(gallery_id: number): Promise<number> {
        return (await this.likeRepository.find({ where: { gallery_id: gallery_id } })).length;
    }

    async update(
        id: number,
        data: QueryPartialEntity<Like>
    ): Promise<Like> {
        await this.likeRepository.update(id, data);
        return await this.findOne({ id: id });
    }

    async delete(id: number): Promise<any> {
        return this.likeRepository.delete(id);
    }
}
