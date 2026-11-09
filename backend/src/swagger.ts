import type { Express } from "express";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  loginRequestSchema,
  loginResponseSchema,
  currentUserResponseSchema,
  createGroupRequestSchema,
  createGroupInviteResponseSchema,
  joinGroupResponseSchema,
  groupResponseSchema,
  signupRequestSchema,
  signupResponseSchema,
  sharedTicketPhotoUploadRequestSchema,
  sharedTicketPhotoUploadUrlsResponseSchema,
} from "@mind-do/shared";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MIND-DO API",
      version: "1.0.0",
      description: "MIND-DO 백엔드 API 문서입니다.",
    },
    components: {
      schemas: {
        SignupRequest: z.toJSONSchema(signupRequestSchema, {
          target: "openapi-3.0",
          io: "input",
        }),
        SignupResponse: z.toJSONSchema(signupResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
        LoginRequest: z.toJSONSchema(loginRequestSchema, {
          target: "openapi-3.0",
          io: "input",
        }),
        LoginResponse: z.toJSONSchema(loginResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
        CurrentUserResponse: z.toJSONSchema(currentUserResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
        CreateGroupRequest: z.toJSONSchema(createGroupRequestSchema, {
          target: "openapi-3.0",
          io: "input",
        }),
        GroupResponse: z.toJSONSchema(groupResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
        CreateGroupInviteResponse: z.toJSONSchema(
          createGroupInviteResponseSchema,
          {
            target: "openapi-3.0",
            io: "output",
          },
        ),
        JoinGroupResponse: z.toJSONSchema(joinGroupResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
        SharedTicketPhotoUploadRequest: z.toJSONSchema(
          sharedTicketPhotoUploadRequestSchema,
          {
            target: "openapi-3.0",
            io: "input",
          },
        ),
        SharedTicketPhotoUploadUrlsResponse: z.toJSONSchema(
          sharedTicketPhotoUploadUrlsResponseSchema,
          {
            target: "openapi-3.0",
            io: "output",
          },
        ),
        ErrorResponse: z.toJSONSchema(errorResponseSchema, {
          target: "openapi-3.0",
        }),
      },
      securitySchemes: {
        AccessTokenCookie: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
    },
    servers: [
      {
        url: "/",
        description: "현재 API 서버",
      },
    ],
  },
  apis: [
    fileURLToPath(
      new URL(
        "./modules/{auth,users,groups,shared-tickets}/*.routes.{ts,js}",
        import.meta.url,
      ),
    ).replaceAll("\\", "/"),
  ],
};

export const setupSwagger = (app: Express) => {
  if (process.env.SWAGGER_ENABLED !== "true") return;
  const specs = swaggerJsdoc(options);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};
