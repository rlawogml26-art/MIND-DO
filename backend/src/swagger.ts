import type { Express } from "express";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  aiDraftsRequestSchema,
  aiDraftsResponseSchema,
  createTicketSchema,
  createGroupRequestSchema,
  createSharedTicketRequestSchema,
  createGroupInviteResponseSchema,
  currentUserResponseSchema,
  groupResponseSchema,
  issuedTicketResponseSchema,
  issueTicketRequestSchema,
  loginRequestSchema,
  loginResponseSchema,
  joinGroupResponseSchema,
  groupListResponseSchema,
  groupDetailResponseSchema,
  inviteInfoResponseSchema,
  signupRequestSchema,
  signupResponseSchema,
  sharedTicketDetailResponseSchema,
  sharedTicketListResponseSchema,
  sharedTicketPhotoUploadRequestSchema,
  sharedTicketPhotoUploadUrlsResponseSchema,
  updateTicketSchema,
} from "@mind-do/shared";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MIND-DO Ticket API",
      version: "1.0.0",
      description: "티켓 관리 서비스 MVP 백엔드 API 문서입니다.",
    },
    components: {
      securitySchemes: {
        AccessTokenCookie: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
      schemas: {
        AiDraftsRequest: z.toJSONSchema(aiDraftsRequestSchema, {
          target: "openapi-3.0",
          io: "input",
        }),
        AiDraftsResponse: z.toJSONSchema(aiDraftsResponseSchema, {
          target: "openapi-3.0",
        }),
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
        GroupListResponse: z.toJSONSchema(groupListResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
        GroupDetailResponse: z.toJSONSchema(groupDetailResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
        InviteInfoResponse: z.toJSONSchema(inviteInfoResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
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
        CreateSharedTicketRequest: z.toJSONSchema(
          createSharedTicketRequestSchema,
          { target: "openapi-3.0", io: "input" },
        ),
        SharedTicketListResponse: z.toJSONSchema(
          sharedTicketListResponseSchema,
          { target: "openapi-3.0", io: "output" },
        ),
        SharedTicketDetailResponse: z.toJSONSchema(
          sharedTicketDetailResponseSchema,
          { target: "openapi-3.0", io: "output" },
        ),
        IssueTicketRequest: z.toJSONSchema(issueTicketRequestSchema, {
          target: "openapi-3.0",
          io: "input",
        }),
        IssuedTicketResponse: z.toJSONSchema(issuedTicketResponseSchema, {
          target: "openapi-3.0",
          io: "output",
        }),
        ErrorResponse: z.toJSONSchema(
          z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
          { target: "openapi-3.0" },
        ),
        CreateTicketInput: z.toJSONSchema(createTicketSchema, {
          target: "openapi-3.0",
          io: "input",
        }),
        UpdateTicketInput: z.toJSONSchema(updateTicketSchema, {
          target: "openapi-3.0",
          io: "input",
        }),
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
        "./modules/{ai-drafts,auth,groups,shared-tickets,ticket,users}/*.routes.{ts,js}",
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
