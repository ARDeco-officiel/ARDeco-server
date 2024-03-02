import { Controller, Body, Put, Req, Res, Param, Get } from "@nestjs/common";
import { BlockedUsersService } from "./blocked_users.service";
import { CreateBlockedUserDto } from "./dto/create-blocked_user.dto";
import { User } from "../user/models/user.entity";
import { NextFunction, Request, Response } from "express";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";

@Controller()
export class BlockedUsersController {
    constructor(
        private readonly blockedUsersService: BlockedUsersService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService
    ) {
    }

    @Get("/blocked_users")
    async getBlockedUsers(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const user = await this.checkAuthGet(req, res);
        if (!(user instanceof User)) return user;

        const blockedUsers = await this.blockedUsersService.findAll(user.id);
        const blockedUserIds = blockedUsers.map((blockedUser) => blockedUser.blocked_user_id);
        res.status(200).json({
            status: "OK",
            code: 200,
            description: "Blocked users retrieved successfully",
            data: blockedUserIds
        });
    }

    @Get("/blocked_users/:user_id")
    async getBlockedUsersForUser(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("user_id") user_id: number) {
        const user = await this.checkAuthGet(req, res, user_id);
        if (!(user instanceof User)) return user;

        const blockedUsers = await this.blockedUsersService.findAll(user_id);
        const blockedUserIds = blockedUsers.map((blockedUser) => blockedUser.blocked_user_id);

        res.status(200).json({
            status: "OK",
            code: 200,
            description: "Blocked user retrieved successfully",
            data: blockedUserIds
        });
    }

    @Put("/block/:user_id")
    async blockUser(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Param("user_id") user_id: number
    ) {
        const user = await this.checkAuthorization(req, res, user_id);
        if (!(user instanceof User)) return user;

        const isUserAlreadyBlocked = await this.blockedUsersService.findOne(user.id, user_id);
        if (isUserAlreadyBlocked) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "User is already blocked",
                data: null
            };
        }

        try {
            const blockedUser = new CreateBlockedUserDto();
            blockedUser.user_id = user.id;
            blockedUser.blocked_user_id = user_id;
            const result = await this.blockedUsersService.create(blockedUser);
            if (!result) {
                res.status(501);
                return {
                    status: "KO",
                    code: 501,
                    description: "User has not been blocked because of an error",
                    data: null
                };
            }
            res.status(200);
            return {
                status: "OK",
                code: 200,
                description: "User has been blocked successfully",
                data: null
            };
        } catch (e) {
            res.status(501);
            return {
                status: "KO",
                code: 501,
                description:
                    "User has not been blocked because of an error",
                error: e,
                data: null
            };
        }

    }

    @Put("/unblock/:user_id")
    async unblockUser(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Param("user_id") user_id: number
    ) {
        const user = await this.checkAuthorization(req, res, user_id);
        if (!(user instanceof User)) return user;

        const isUserAlreadyBlocked = await this.blockedUsersService.findOne(user.id, user_id);
        if (!isUserAlreadyBlocked) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "User is not blocked",
                data: null
            };
        }

        try {
            const result = await this.blockedUsersService.remove(user.id, user_id);
            res.status(200);
            return {
                status: "OK",
                code: 200,
                description: "User has been unblocked successfully",
                data: null
            };
        } catch (e) {
            res.status(501);
            return {
                status: "KO",
                code: 501,
                description:
                    "User has not been unblocked because of an error",
                error: e,
                data: null
            };
        }
    }

    private async checkAuthGet(req: Request, res: Response, user_id: number = null) {
        const cookie = req.cookies["jwt"];
        const data = cookie ? this.jwtService.verify(cookie) : null;

        // Cookie or JWT not valid
        if (!cookie || !data) {
            res.status(401);
            return {
                status: "KO",
                code: 401,
                description:
                    "You have to login in order to retrieve a user's blocked users list",
                data: null
            };
        }

        const user = await this.userService.findOne({ id: data["id"] });

        if (!user) {
            res.status(403);
            return {
                status: "KO",
                code: 403,
                description: "User not found",
                data: null
            };
        }

        // Check for specific user's list if not self route
        if (user_id) {
            const new_user_id = Number(user_id);

            if (isNaN(new_user_id)) {
                console.log("test0");
                res.status(400);
                console.log("ll");
                return {
                    status: "KO",
                    code: 400,
                    description: "The id of the user to retrieve its blocked users list must be a number",
                    data: null
                };
            }

            // Check if the user to retrieve is himself or an admin
            if (user.id !== new_user_id) {
                if (user.role !== "admin") {
                    return {
                        status: "KO",
                        code: 403,
                        description: "You must be an admin to retrieve this user's blocked users list",
                        data: null
                    };
                }

                const userToGet = await this.userService.findOne({ id: new_user_id });

                if (!userToGet) {
                    return {
                        status: "KO",
                        code: 404,
                        description: "User not found",
                        data: null
                    };
                }
            }
        }

        return user;
    }

    private async checkAuthorization(
        req: Request,
        res: Response,
        user_id: number
    ) {
        user_id = Number(user_id);
        if (isNaN(user_id)) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "The id of the user to block/unblock must be a number",
                data: null
            };
        }

        const cookie = req.cookies["jwt"];
        const data = cookie ? this.jwtService.verify(cookie) : null;

        // Cookie or JWT not valid
        if (!cookie || !data) {
            res.status(401);
            return {
                status: "KO",
                code: 401,
                description:
                    "You have to login in order to block or unblock a user",
                data: null
            };
        }

        const user = await this.userService.findOne({ id: data["id"] });

        if (!user) {
            res.status(403);
            return {
                status: "KO",
                code: 403,
                description: "User not found",
                data: null
            };
        }

        if (user.id === user_id) {
            res.status(400);
            return {
                status: "KO",
                code: 400,
                description: "You cannot block or unblock yourself",
                data: null
            };
        }

        const userToBlock = await this.userService.findOne({ id: user_id });

        if (!userToBlock) {
            res.status(404);
            return {
                status: "KO",
                code: 404,
                description: "User to block/unblock has not been found",
                data: null
            };
        }

        return user;
    }

}
