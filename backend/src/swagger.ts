import type { Express } from "express";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createTicketSchema, updateTicketSchema } from "@mind-do/shared";
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
      schemas: {
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
      new URL("./modules/ticket/ticket.routes.{ts,js}", import.meta.url),
    ).replaceAll("\\", "/"),
  ],
};

export const setupSwagger = (app: Express) => {
  if (process.env.SWAGGER_ENABLED !== "true") return;
  const specs = swaggerJsdoc(options);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};
