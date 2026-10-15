import { Express } from "express";
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
    servers: [
      {
        url: "http://localhost:3000",
        description: "로컬 개발 서버",
      },
    ],
  },
  // 주석(JSDoc)이나 라우터 파일을 읽어와서 문서화할 경로 지정
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  // 브라우저에서 /api-docs로 접속하면 스웨거 UI가 뜨도록 설정
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};
