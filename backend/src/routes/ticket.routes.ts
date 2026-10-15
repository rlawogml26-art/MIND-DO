import { Router } from "express";
import {
  createTicket,
  getTickets,
  getTicketById,
} from "../controllers/ticket.controller.js";

const router = Router();

// 티켓 생성 API
router.post("/", createTicket);

// 저장한 티켓 목록 조회 API
router.get("/", getTickets);

// 티켓 상세 조회 API
router.get("/:ticketId", getTicketById);

export default router;
