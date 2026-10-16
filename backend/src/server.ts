import express from "express";
import type { ErrorRequestHandler } from "express";
import ticketRouter from "./modules/ticket/ticket.routes.js";
import { setupSwagger } from "./swagger.js"; // 방금 만든 설정 불러오기

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

// Swagger UI 연결
setupSwagger(app);

app.get("/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok" } });
});

app.use("/api/tickets", ticketRouter);

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const invalidJson =
    error instanceof SyntaxError &&
    "type" in error &&
    error.type === "entity.parse.failed";
  res.status(invalidJson ? 400 : 500).json({
    error: {
      code: invalidJson ? "INVALID_INPUT" : "INTERNAL_SERVER_ERROR",
      message: invalidJson
        ? "올바른 JSON 형식으로 요청해주세요."
        : "요청 처리 중 오류가 발생했습니다.",
    },
  });
};

app.use(errorHandler);

app.listen(port);
