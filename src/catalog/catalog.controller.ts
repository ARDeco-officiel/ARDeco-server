import { Body, Controller, Delete, Get, HttpStatus, Param, ParseArrayPipe, Post, Put, Req, Res } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { UserService } from "../user/user.service";
import { Request, Response } from "express";
import { JwtService } from "@nestjs/jwt";
import { User } from "../user/models/user.entity";
import { CatalogFilterDto } from "./dtos/catalog-filter.dto";
import { CatalogCreateDto } from "./dtos/catalog-create.dto";
import { CatalogResponseDto } from "./dtos/catalog-response.dto";
import { CatalogUpdateDto } from "./dtos/catalog-update.dto";
import { exceptionFactory } from "../exception_filters/all-exceptions.filter";

@Controller("catalog")
export class CatalogController {
    constructor(
        private catalogService: CatalogService,
        private jwtService: JwtService,
        private userService: UserService
    ) {
    }

    @Get()
    async getCatalog(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        const user = await this.checkAuthorizationUser(req, res);
        if (!(user instanceof User)) return user;

        const includeInactive = user.role === "admin";

        res.status(200);
        return {
            status: "OK",
            code: 200,
            description: "All objects from catalog",
            data: await this.catalogService.all(!includeInactive)
        };
    }

    @Post()
    async filterCatalog(
        @Req() req: Request,
        @Body() body: CatalogFilterDto,
        @Res({ passthrough: true }) res: Response
    ) {
        const cookie = req.cookies["jwt"];
        const data = cookie ? this.jwtService.verify(cookie) : null;

        // Cookie or JWT not valid
        if (!cookie || !data) {
            res.status(401);
            return {
                status: "KO",
                code: 401,
                description: "You are not connected",
                data: null
            };
        }

        const company = await this.userService.findOne({ id: data["id"] });
        const isAdmin = company.role === "admin";

        if (!company) {
            res.status(403);
            return {
                status: "KO",
                code: 403,
                description:
                    "Your user doesn't exists ant can't access this resource",
                data: null
            };
        }

        res.status(200);
        return {
            status: "OK",
            code: 200,
            description: "All filtered objects from catalog",
            data: await this.catalogService.filter(body, isAdmin)
        };
    }

    @Get(":id")
    async getSpecificFurniture(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Param("id") id: number
    ): Promise<{
        status: string;
        code: number;
        description: string;
        data: null | CatalogResponseDto;
    }> {
        // 1. Check requesting user
        const cookie = req.cookies["jwt"];
        const data = cookie ? this.jwtService.verify(cookie) : null;

        // Cookie or JWT not valid
        if (!cookie || !data) {
            res.status(401);
            return {
                status: "KO",
                code: 401,
                description: "You are not connected",
                data: null
            };
        }

        const user = await this.userService.findOne({ id: data["id"] });

        if (!user) {
            res.status(403);
            return {
                status: "KO",
                code: 403,
                description:
                    "Your user doesn't exists ant can't access this resource",
                data: null
            };
        }

        // 2. Check furniture
        try {
            const furniture = await this.catalogService.findOneById(id);
            if (!furniture) {
                res.status(404);
                return {
                    status: "KO",
                    code: 404,
                    description: "This furniture doesn't exist in the catalog",
                    data: null
                };
            }

            // 3. Check furniture activation (and user role)
            if (!furniture.active) {
                // There's not any scenario where a user have access to an inactive furniture
                if (user.role === "user") {
                    res.status(HttpStatus.FORBIDDEN);
                    return {
                        status: "OK",
                        code: HttpStatus.FORBIDDEN,
                        description: "You don't have access to this furniture",
                        data: null
                    };
                }

                // If it's a company, check if it's the owner
                if (user.role === "company") {
                    console.log(furniture.company);
                    console.log(user.id);
                    if (furniture.company !== user.id) {
                        res.status(HttpStatus.FORBIDDEN);
                        return {
                            status: "OK",
                            code: HttpStatus.FORBIDDEN,
                            description: "You don't have access to this furniture",
                            data: null
                        };
                    }
                }
            }

            res.status(200);
            return {
                status: "OK",
                code: 200,
                description: `Furniture ${furniture.id}`,
                data: furniture
            };
        } catch (e) {
            console.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            return {
                status: "KO",
                code: HttpStatus.INTERNAL_SERVER_ERROR,
                description: "Internal server error occurring on furniture fetch",
                data: e
            };
        }
    }

    @Get("company/:company_id")
    async getCompanyCatalog(
        @Req() req: Request,
        @Param("company_id") company_id: number,
        @Res({ passthrough: true }) res: Response
    ): Promise<{
        status: string;
        code: number;
        description: string;
        data: null | CatalogResponseDto[];
    }> {
        const cookie = req.cookies["jwt"];
        const data = cookie ? this.jwtService.verify(cookie) : null;

        // Cookie or JWT not valid
        if (!cookie || !data) {
            res.status(401);
            return {
                status: "KO",
                code: 401,
                description: "You are not connected",
                data: null
            };
        }

        const user = await this.userService.findOne({ id: data["id"] });

        if (!user) {
            res.status(403);
            return {
                status: "KO",
                code: 403,
                description:
                    "Your user doesn't exists ant can't access this resource",
                data: null
            };
        }

        const company = user.id === company_id ? user : await this.userService.findOne({ id: company_id });

        if (!company || company.role !== "company") {
            res.status(404);
            return {
                status: "KO",
                code: 404,
                description: "Company not found",
                data: null
            };
        }

        const items = await this.catalogService.findByCompany(company_id);
        const activeItems = items.filter(item => {
            if (!item.active) {
                return (item.company === user.id) || (user.role === "admin");
            }
            return true;
        });

        res.status(200);
        return {
            status: "OK",
            code: 200,
            description: `All available objects from catalog for company ${company.id} (${company.first_name} ${company.last_name})`,
            data: activeItems
        };
    }


    @Post(":id/add")
    /*
    L’intégralité des meubles seront vérifiés avant de les ajouter en base de données. Si un meuble est invalide, rien ne sera inscrit en base de données et une erreur sera retournée à l’utilisateur
    Si la requête aboutit, un code HTTP 201 sera renvoyé ainsi que les meubles et leurs propriétés dans un tableau d’objets JSON
    */
    async add(
        @Req() req: Request,
        @Param("id") id: number,
        @Body(new ParseArrayPipe({
            items: CatalogCreateDto,
            exceptionFactory: exceptionFactory
        })) catalog: CatalogCreateDto[],
        @Res({ passthrough: true }) res: Response
    ) {
        const authorizedCompany = await this.checkAuthorization(req, res, id);
        if (!(authorizedCompany instanceof User)) return authorizedCompany;

        const company = authorizedCompany.id === id ? authorizedCompany : await this.userService.findOne({ id: id });

        if (!company) {
            res.status(404);
            return {
                status: "KO",
                code: 404,
                description: "Company not found",
                data: null
            };
        }

        if (company.role !== "company") {
            res.status(403);
            return {
                status: "KO",
                code: 403,
                description: "User is not a company",
                data: null
            };
        }

        if (!(catalog instanceof Array) || catalog.length === 0) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "No object to register",
                data: null
            };
        }

        const errors = [];

        // Check errors of each object
        for (let i = 0; i < catalog.length; i++) {
            const isValid = this.checkObject(company, catalog[i], i);
            if (isValid.length > 0) {
                errors.push(isValid);
            }
        }

        // If there are errors, return them and don't register any object in database
        if (errors.length > 0) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: errors,
                data: null
            };
        }

        // If there are no errors, register each object in database
        for (let i = 0; i < catalog.length; i++) {
            await this.catalogService.create(catalog[i]).catch(err => {
                console.error(err);
                res.status(500);
                return {
                    status: "KO",
                    code: 500,
                    description: "Internal server error",
                    data: null
                };
            });
        }

        res.status(201);
        return {
            status: "OK",
            code: 201,
            description: "Objects registered",
            data: catalog
        };
    }

    @Put(":company_id/edit/:catalog_id")
    async update(
        @Req() req: Request,
        @Param("company_id") company_id: number,
        @Param("catalog_id") catalog_id: number,
        @Body() catalog: CatalogUpdateDto,
        @Res({ passthrough: true }) res: Response
    ) {
        const authorizedCompany = await this.checkAuthorization(
            req,
            res,
            company_id
        );
        if (!(authorizedCompany instanceof User)) return authorizedCompany;

        const company = authorizedCompany.id === company_id ? authorizedCompany : await this.userService.findOne({ id: company_id });

        const object = await this.catalogService.findOne({
            id: catalog_id,
            company: company_id
        });

        if (object === null) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "Object doesn't exist in the catalog",
                data: null
            };
        }

        const errors = this.checkObject(company, catalog);
        if (errors.length > 0) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "Object not updated",
                data: errors
            };
        }

        const updatedObject = await this.catalogService.update(object, catalog);
        if (updatedObject === null) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "Object not updated",
                data: null
            };
        }


        res.status(200);
        return {
            status: "OK",
            code: 200,
            description: "Object updated",
            data: updatedObject
        };
    }

    @Delete([":company_id/removeAll", ":company_id/archiveAll"])
    async removeAll(
        @Req() req: Request,
        @Param("company_id") company_id: number,
        @Res({ passthrough: true }) res: Response
    ) {
        const authorizedCompany = await this.checkAuthorization(req, res, company_id);
        if (!(authorizedCompany instanceof User)) return authorizedCompany;

        const removedObjects = await this.catalogService.archiveAllForCompany(company_id);
        if (removedObjects === null) {
            res.status(500);
            return {
                status: "KO",
                code: 500,
                description: "Some objects have not been removed due to a server error",
                data: null
            };
        }

        res.status(200);
        return {
            status: "OK",
            code: 200,
            description: "Objects removed",
            data: removedObjects
        };
    }

    @Delete([":company_id/remove/:catalog_id", ":company_id/archive/:catalog_id"])
    async removeOne(
        @Req() req: Request,
        @Param("company_id") company_id: number,
        @Param("catalog_id") catalog_id: number,
        @Res({ passthrough: true }) res: Response
    ) {
        const authorizedCompany = await this.checkAuthorization(req, res, company_id);
        if (!(authorizedCompany instanceof User)) return authorizedCompany;

        const object = await this.catalogService.findOne({
            id: catalog_id,
            company: company_id
        });

        if (object === null) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "Object doesn't exists in catalog",
                data: null
            };
        }

        const removedObject = await this.catalogService.archive(object.id);
        if (removedObject === null) {
            res.status(500);
            return {
                status: "KO",
                code: 500,
                description: "Object has not been removed due to a server error",
                data: null
            };
        } else {
            res.status(200);
            return {
                status: "OK",
                code: 200,
                description: "Object successfully removed from catalog",
                data: removedObject
            };
        }
    }

    @Delete([":company_id/remove", ":company_id/archive"])
    async remove(
        @Req() req: Request,
        @Param("company_id") company_id: number,
        @Body() objects: string[],
        @Res({ passthrough: true }) res: Response
    ) {
        const authorizedCompany = await this.checkAuthorization(req, res, company_id);
        if (!(authorizedCompany instanceof User)) return authorizedCompany;

        if (objects.length === 0) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "No object to remove from catalog",
                data: null
            };
        }

        objects = objects.map(x => x.trim());

        if (this.checkIfDuplicateExists(objects)) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "Duplicate object(s) id in request body",
                data: null
            };
        }

        const errors: string[] = [];
        const ids: number[] = [];

        for (let i = 0; i < objects.length; i++) {
            const object_id = objects[i];
            const res = await this.catalogService.findOne({
                object_id: object_id,
                company: company_id
            });
            if (res == null) errors.push(i + " - \"object_id\" doesn't exists");
            else ids.push(res.id);
        }

        if (errors.length > 0 || ids.length === 0) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "Some objects doesn't exists in catalog",
                data: errors
            };
        }

        const removedObjects = await this.catalogService.archiveArray(ids);
        if (removedObjects === null) {
            res.status(500);
            return {
                status: "KO",
                code: 500,
                description: "Some objects have not been removed due to a server error",
                data: null
            };
        } else {
            res.status(200);
            return {
                status: "OK",
                code: 200,
                description: "Objects successfully removed from catalog",
                data: removedObjects
            };
        }
    }

    checkIfDuplicateExists(arr) {
        return new Set(arr).size !== arr.length;
    }

    generateNewId(company: User, iteration = 0, max_iteration = 10): string {
        if (iteration >= max_iteration) {
            throw new Error("Max iteration reached");
        }

        const object_id =
            company.id.toString() +
            "-" +
            Math.floor(Math.random() * 1000000).toString();
        this.catalogService.findOne({ object_id: object_id }).then(res => {
            if (res !== null) {
                console.error("Object id already exists");
                return this.generateNewId(
                    company,
                    iteration + 1,
                    max_iteration
                );
            }
        });

        return object_id;
    }

    checkObject(
        company: User,
        catalog: CatalogCreateDto | CatalogUpdateDto,
        number: number = 0
    ): string[] {
        const errors: string[] = [];

        // Catalog creation
        if (catalog instanceof CatalogCreateDto) {
            catalog.company = company.id;
            if (!catalog.company_name) {
                catalog.company_name = company.first_name + "-" + company.last_name;
            }

            if (!catalog.object_id)
                catalog.object_id = this.generateNewId(company);
            else {
                this.catalogService
                    .findOne({ object_id: `${catalog.object_id}` })
                    .then(res => {
                        if (res !== null)
                            errors.push(
                                number + " - \"object_id\" already exists"
                            );
                    });
            }
        }

        // Catalog update
        if (catalog instanceof CatalogUpdateDto) {
            if (catalog.object_id) {
                this.catalogService
                    .findOne({ object_id: `${catalog.object_id}` })
                    .then(res => {
                        if (res !== null)
                            errors.push(
                                number + " - \"object_id\" already exists"
                            );
                    });
            }
        }

        return errors;
    }

    async checkAuthorization(req: Request, res: Response, id: number) {
        const cookie = req.cookies["jwt"];
        const data = cookie ? this.jwtService.verify(cookie) : null;

        // Cookie or JWT not valid
        if (!cookie || !data) {
            res.status(401);
            return {
                status: "KO",
                code: 401,
                description: "You are not connected",
                data: null
            };
        }

        const company = await this.userService.findOne({ id: data["id"] });

        if (!company) {
            res.status(403);
            return {
                status: "KO",
                code: 403,
                description:
                    "Your user doesn't exists ant can't access this resource",
                data: null
            };
        }

        if (company.role === "admin") {
            // Admin can access all resources
            return company;
        } else {
            if (company.role !== "company" || company.id !== Number(id)) {
                res.status(403);
                return {
                    status: "KO",
                    code: 403,
                    description:
                        "You are not authorized to access this resource",
                    data: null
                };
            }

            if (!company.company_api_key) {
                res.status(403);
                return {
                    status: "KO",
                    code: 403,
                    description:
                        "You don't have any API key, please generate one before using this endpoint",
                    data: null
                };
            }

            // Wrong company API key
            if (company.company_api_key !== req.query["company_api_key"]) {
                res.status(403);
                return {
                    status: "KO",
                    code: 403,
                    description:
                        "API key is not valid in \"company_api_key\" query parameter",
                    data: null
                };
            }
        }

        return company;
    }


    @Post("ai")
    async getValuesFromImage(@Body() body: {
        image: string
    }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        console.log("Début AI");
        console.log("Body :", body);
        console.log("Image :", body.image);
        const user = await this.checkAuthorizationUser(req, res);
        if (!(user instanceof User)) {
            console.log("Échec de l'autorisation utilisateur");
            return user;
        }
        console.log("Utilisateur autorisé:", user.id);

        //check if image is valid
        if (!body.image) {
            console.log("Image non fournie");
            return {
                status: "KO",
                code: 400,
                description: "Image non fournie",
                data: null
            };
        }


        const imageBase64 = body.image;
        console.log("Image reçue, longueur base64:", imageBase64.length);
        console.log("Image :", imageBase64);
        console.log("Récupération du catalogue complet");
        let fullCatalog = await this.catalogService.all(true);
        console.log("Nombre d'éléments dans le catalogue complet:", fullCatalog.length);
        console.log("Parsing du catalogue");
        let parsedCatalog = fullCatalog.map(item => ({
            id: item.id,
            rooms: item.rooms,
            color: item.colors,
            styles: item.styles
        }));
        console.log("Nombre d'éléments dans le catalogue parsé:", parsedCatalog.length);

        console.log("Appel à l'API GPT-4 Vision");
        const openaiResponse = await this.callGPT4Vision(imageBase64, parsedCatalog);
        console.log("Réponse reçue de GPT-4 Vision:", openaiResponse);

        console.log("Traitement de la réponse GPT-4");
        const furnitureIds = await this.processChatGPTResponse(openaiResponse);
        console.log("IDs de meubles suggérés:", furnitureIds);

        res.status(200);
        console.log("Fin de getValuesFromImage");
        return {
            status: "OK",
            code: 200,
            description: "AI Suggestions",
            data: furnitureIds
        };
    }

    async checkAuthorizationUser(
        req: Request,
        res: Response
    ): Promise<User | {
        status: string,
        code: number,
        description: string,
        data: null
    }> {
        const cookie = req.cookies["jwt"];
        const data = cookie ? this.jwtService.verify(cookie) : null;

        // Cookie or JWT not valid
        if (!cookie || !data) {
            res.status(401);
            return {
                status: "KO",
                code: 401,
                description: "You are not connected",
                data: null
            };
        }

        const user = await this.userService.findOne({ id: data["id"] });

        if (!user) {
            res.status(403);
            return {
                status: "KO",
                code: 403,
                description:
                    "You are not allowed to access/modify this resource",
                data: null
            };
        }

        return user;
    }

    private async callGPT4Vision(imageBase64: string, catalog: any): Promise<string> {
        const apiKey = process.env.OPENAI_API_KEY;
        const url = "https://api.openai.com/v1/chat/completions";

        console.log("API Key:", apiKey);
        console.log("URL:", url);
        console.log("Image Base64:", imageBase64);
        console.log("Catalog:", catalog);

        const payload = {
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Je vais vous envoyer une image d'une pièce. En fonction de l'image :\n" +
                        "1. Identification de la pièce : Déterminez le type de pièce (par exemple, salle à manger, salon, chambre, cuisine ou salle de bain).\n" +
                        "2. Analyse du style et des couleurs : Identifiez le style de design de la pièce (par exemple, moderne, rustique, minimaliste) et le schéma de couleurs dominant.\n" +
                        "3. Espace et disposition : Estimez l'espace disponible dans la pièce et l'agencement optimal des meubles.\n\n" +
                        "En utilisant ces informations :\n\n" +
                        "• Sélection de meubles : Choisissez des articles appropriés dans le catalogue JSON fourni qui correspondent au type de pièce, au style et au schéma de couleurs.\n" +
                        "• Format de réponse : Listez les IDs des meubles séparés par des points-virgules (par exemple, 'ID1; ID2; ID3'). Vous pouvez inclure plusieurs instances du même article lorsque cela a du sens (par exemple, plusieurs chaises pour une salle à manger).\n" +
                        "• Restriction sur les grands meubles : Suggérez uniquement un grand article (par exemple, canapé, table à manger) à moins que l'espace ne puisse clairement en accueillir plus.\n" +
                        "• Évitez l'encombrement : Assurez-vous que les articles sélectionnés s'adaptent à l'espace disponible sans surcharger. Priorisez la fonctionnalité de la disposition.\n" +
                        "• Suggestions : Fournissez au moins trois suggestions qui améliorent l'apparence générale de la pièce, en garantissant l'harmonie et l'équilibre.\n" +
                        " Si tu ne sais pas quoi mettre pour la piece ou determiner le type de pièce, donne quand même des ids de chaises et tables" +
                        "Réponse uniquement avec des IDs séparés par des points-virgules."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`
                            }
                        },
                        {
                            type: "text",
                            text: JSON.stringify(catalog)
                        }
                    ]
                }
            ],
            max_tokens: 900
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("Error calling GPT-4 Vision API:", error);
        }
    }

    private processChatGPTResponse(response: string): string {
        return response;
    }

}
