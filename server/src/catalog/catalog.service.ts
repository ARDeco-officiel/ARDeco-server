import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Catalog } from "./models/catalog.entity";
import { ArchiveService } from "../archive/archive.service";
import { CatalogFilterDto } from "./models/catalog-filter.dto";

@Injectable()
export class CatalogService {
    constructor(
        @InjectRepository(Catalog)
        private readonly catalogRepository: Repository<Catalog>,
        @Inject(forwardRef(() => ArchiveService))
        private readonly archiveService: ArchiveService
    ) {}

    async all(): Promise<Catalog[]> {
        return this.catalogRepository.find();
    }

    async create(data): Promise<Catalog> {
        return await this.catalogRepository.save(data);
    }

    async findOne(condit): Promise<Catalog> {
        return await this.catalogRepository.findOne({ where: condit });
    }

    async update(id: number, data): Promise<any> {
        return this.catalogRepository.update(id, data);
    }

    async delete(id: number): Promise<any> {
        const backup = await this.findOne(id);
        await this.catalogRepository.delete(id);
        await this.archiveService.create(backup);
        return backup;
    }

    async deleteFromObjectId(object_id: string): Promise<any> {
        return this.catalogRepository.delete({ object_id: object_id });
    }

    async deleteArray(ids: number[]) {
        const backup = await this.catalogRepository.findByIds(ids);
        await this.catalogRepository.delete(ids);
        await this.archiveService.create(backup);
        return backup;
    }

    async deleteAllObjectsFromCompany(company_id: number) {
        const backup = await this.catalogRepository.find({
            where: { company: company_id }
        });
        await this.catalogRepository.delete({ company: company_id });
        await this.archiveService.create(backup);
        return backup;
    }
    async filterCatalog(filterDto: CatalogFilterDto): Promise<Catalog[]> {
        // Implement your filtering logic based on the provided criteria
        return this.catalogRepository.find({
          where: filterDto,
        });
      }
    
    
      private buildWhereClause(filterDto: CatalogFilterDto): object {
        const whereClause: any = {};
    
        // Add conditions for each property in the filterDto
        console.log("1", whereClause)
        if (filterDto.width) {
          whereClause.width = filterDto.width;
        }
        console.log("2", whereClause)
        // Add other conditions as needed for additional properties
    
        return whereClause;
      }
}
