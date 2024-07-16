import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { Changelog } from "./models/changelog.entity";
import { QueryPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class ChangelogService {
    constructor(
        @InjectRepository(Changelog)
        private readonly ChangelogRepository: Repository<Changelog>
    ) {
    }

    async all(): Promise<Changelog[]> {
        return this.ChangelogRepository.find();
    }

    async create(data): Promise<Changelog> {
        const u = this.ChangelogRepository.save(data);
        console.log("Create changelog :", await u);
        return u;
    }

    async findOne(condit): Promise<Changelog> {
        return this.ChangelogRepository.findOne({ where: condit });
    }

    async update(
        id: number,
        data: QueryPartialEntity<Changelog>
    ): Promise<Changelog> {
        await this.ChangelogRepository.update(id, data);
        return await this.findOne({ id: id });
    }

    async delete(id: number): Promise<any> {
        console.log("Deleting Changelog item", id);
        return this.ChangelogRepository.createQueryBuilder("changelog")
            .delete()
            .from(Changelog)
            .where("id = id", { id: id })
            .execute();
    }
}
