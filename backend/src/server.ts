import express from "express";
import type { ErrorRequestHandler } from "express";
import authRouter from "./modules/auth/auth.routes.js";
import groupsRouter from "./modules/groups/groups.routes.js";
import invitesRouter from "./modules/groups/invites.routes.js";
import groupSharedTicketsRouter from "./modules/shared-tickets/group-shared-tickets.routes.js";
import sharedTicketsRouter from "./modules/shared-tickets/shared-tickets.routes.js";
import ticketRouter from "./modules/ticket/ticket.routes.js";
import usersRouter from "./modules/users/users.routes.js";
import { setupSwagger } from "./swagger.js";
import { ErrorCode } from "@mind-do/shared";
import "dotenv/config";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.set("trust proxy", 1);
app.use(express.json());

// Swagger UI 연결
setupSwagger(app);

// ALB와 배포 확인용. DB에 의존하지 않아야 DB가 잠깐 느려도 서버가 "죽은 것"으로 판단되지 않는다.
app.get("/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok" } });
});

app.use("/api/tickets", ticketRouter);
app.use("/api/auth", authRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/groups", groupSharedTicketsRouter);
app.use("/api/invites", invitesRouter);
app.use("/api/shared-tickets", sharedTicketsRouter);
app.use("/api/users", usersRouter);

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
      code: invalidJson
        ? ErrorCode.INVALID_INPUT
        : ErrorCode.INTERNAL_SERVER_ERROR,
      message: invalidJson
        ? "올바른 JSON 형식으로 요청해주세요."
        : "요청 처리 중 오류가 발생했습니다.",
    },
  });
};

app.use(errorHandler);

app.listen(port);
