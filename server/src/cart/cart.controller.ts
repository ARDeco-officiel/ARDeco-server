/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthGuard } from "src/auth/auth.guard";
import { UserService } from "../user/user.service";
import { JwtService } from "@nestjs/jwt";
import { CatalogService } from "src/catalog/catalog.service";
import { AddItemToCartDTO } from "./models/addToCart.dto";
import { CartService } from "./cart.service";

@Controller("cart")
export class CartController {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private catalogService: CatalogService,
        private cartService: CartService
    ) {}

    @Post()
    @UseGuards(AuthGuard)
    async addItemToCart(
        @Body() addItemToCartDTO: AddItemToCartDTO,
        @Req() request: Request
    ) {
        const cookie = request.cookies["jwt"];
        const data = await this.jwtService.verifyAsync(cookie);
        const usr = await this.userService.findOne({ id: data["id"] });
        const item: number = addItemToCartDTO.id;
        console.log(item);
        if (!(await this.catalogService.findOne({ id: item }))) {
            return {
                status: "KO",
                code: 600,
                description: "No catalog item with this id",
                data: null
            };
        }
        if (!usr.cart) {
            const obj = {
                capacity: 101,
                catalogItems: "",
                user: usr
            };
            const cart = await this.cartService.create(obj);
            this.userService.update(usr.id, { cart: cart });
        }
        console.log(
            "User : ",
            await this.userService.findOne({ id: data["id"] })
        );
        let carta = await this.cartService.findOne(usr.cart);
        let catalogItem = (await this.cartService.findOne({ user: usr }))
            .catalogItems;
        catalogItem += `${item},`;
        carta.catalogItems = catalogItem;
        await this.cartService.update(usr.cart.id, { catalogItems: carta });
        return {
            status: "OK",
            code: 200,
            description: "Item added to cart",
            data: await this.cartService.findOne({ id: usr.cart.id })
        };
    }

    @Get()
    @UseGuards(AuthGuard)
    async getCurrentCart(
        @Req() request: Request,
        @Res({ passthrough: true }) resp: Response
    ) {
        const cookie = request.cookies["jwt"];
        const data = await this.jwtService.verifyAsync(cookie);
        const usr = await this.userService.findOne({ id: data["id"] });
        
        if (!usr.cart) {
            resp.status(404)
            return {
                status: "KO",
                code: 404,
                description: "No cart found",
                data: null
            };        
        }
        console.log(
            "Getting cart of user : ",
            await this.userService.findOne({ id: data["id"] }) // On trouve le panier
        );
        await this.cartService.findOne({ id: usr.cart.id })
        let catalogItem = (await this.cartService.findOne({ user: usr }))
        .catalogItems;
        const values = catalogItem.split(",");
        let itemsInCart = []
        for (let i = 0; i != values.length; i++) { // Fonction pour convertir les id des meubles en json de meuble
            const parsedId = parseInt(values[i]);
            if (isNaN(parsedId)) {
                console.error(`Invalid id: ${values[i]}`);
            } else {
                itemsInCart.push(await this.catalogService.findOne({ id: parsedId }));
            }
        }
        console.log(itemsInCart)
        return {
            status: "OK",
            code: 200,
            description: "Current cart",
            data: {
                ids: (await this.cartService.findOne({ id: usr.cart.id })).catalogItems, // On return les meubles
                catalogInfo: itemsInCart
            }
        };
    }


    @Delete()
    @UseGuards(AuthGuard)
    async delete(
        @Body() addItemToCartDTO: AddItemToCartDTO,
        @Req() request: Request
    ) {
        const cookie = request.cookies["jwt"];
        const data = await this.jwtService.verifyAsync(cookie);
        const usr = await this.userService.findOne({ id: data["id"] });
        const item: number = addItemToCartDTO.id;
        console.log(item);
        if (!(await this.catalogService.findOne({ id: item }))) {
            return {
                status: "KO",
                code: 600,
                description: "No catalog item with this id",
                data: null
            };
        }
        if (!usr.cart) {
            const obj = {
                capacity: 101,
                catalogItems: "",
                user: usr
            };
            const cart = await this.cartService.create(obj);
            this.userService.update(usr.id, { cart: cart });
        }
        console.log(
            "User : ",
            await this.userService.findOne({ id: data["id"] })
        );
        let carta = await this.cartService.findOne(usr.cart);
        let catalogItem = (await this.cartService.findOne({ user: usr }))
            .catalogItems;
        const values = catalogItem.split(",");
        const numberAsString = item.toString(); // Convert the number to a string for comparison
        const indexToRemove = values.indexOf(numberAsString);
        if (indexToRemove !== -1) {
            values.splice(indexToRemove, 1); // Remove the element at the found index
        } else {
            return {
                status: "KO",
                code: 601,
                description: "No catalog item within this cart",
                data: null
            };
        }
        carta.catalogItems = values.join(",");
        await this.cartService.update(usr.cart.id, { catalogItems: carta });
        return {
            status: "OK",
            code: 200,
            description: "Item removed from cart",
            data: await this.cartService.findOne({ id: usr.cart.id })
        };
    }

    @Delete("All")
    @UseGuards(AuthGuard)
    async deleteAll(
        @Req() request: Request
    ) {
        const cookie = request.cookies["jwt"];
        const data = await this.jwtService.verifyAsync(cookie);
        const usr = await this.userService.findOne({ id: data["id"] });

        if (!usr.cart) { // Verification si il y a un panier
            return
        }
        console.log(
            await this.userService.findOne({ id: data["id"] }) // On cherche la panier de l'user
        );
        await this.cartService.update(usr.cart.id, { catalogItems: "" }); // On delete tout
        return {
            status: "OK",
            code: 200,
            description: "Cart fully cleared",
            data: await this.cartService.findOne({ id: usr.cart.id })
        };
    }

}
