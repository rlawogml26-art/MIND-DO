import express from "express";
import ticketRouter from "./routes/ticket.routes.js";
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

app.listen(port);
