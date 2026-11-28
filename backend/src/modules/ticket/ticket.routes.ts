import { Router } from "express";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
} from "./ticket.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: 티켓 아카이빙
 *   description: 티켓 관리 API
 */

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: 티켓 저장(생성)
 *     tags: [티켓 아카이빙]
 *     description: 새로운 티켓을 생성합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTicketInput'
 *     responses:
 *       201:
 *         description: 티켓 생성 성공
 *   get:
 *     summary: 저장한 티켓 목록 조회
 *     tags: [티켓 아카이빙]
 *     description: 저장된 모든 티켓 목록을 조회합니다.
 *     responses:
 *       200:
 *         description: 목록 조회 성공
 */
router.post("/", createTicket);
router.get("/", getTickets);

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   get:
 *     summary: 티켓 상세 조회
 *     tags: [티켓 아카이빙]
 *     description: 특정 ID를 가진 티켓의 상세 정보를 조회합니다.
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 티켓 ID
 *     responses:
 *       200:
 *         description: 상세 조회 성공
 *       404:
 *         description: 티켓을 찾을 수 없음
 *   put:
 *     summary: 티켓 수정
 *     tags: [티켓 아카이빙]
 *     description: 특정 ID를 가진 티켓의 정보를 수정합니다.
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 티켓 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTicketInput'
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: 수정할 티켓을 찾을 수 없음
 *   delete:
 *     summary: 개인 티켓 원본 삭제
 *     tags: [티켓 아카이빙]
 *     description: 소유자의 개인 티켓을 소프트 삭제합니다. 공동 티켓과 초대 슬롯은 유지됩니다.
 *     security:
 *       - AccessTokenCookie: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 티켓 ID
 *     responses:
 *       200:
 *         description: 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DeleteTicketResponse'
 *       400:
 *         description: 티켓 ID 검증 실패 (INVALID_INPUT)
 *       401:
 *         description: 인증 실패 (UNAUTHORIZED 또는 ACCESS_TOKEN_EXPIRED)
 *       403:
 *         description: 티켓을 볼 수 있으나 소유자가 아님 (NOT_TICKET_OWNER)
 *       404:
 *         description: 티켓이 없거나, 삭제됐거나, 열람 권한이 없음 (TICKET_NOT_FOUND)
 *       500:
 *         description: 서버 오류 (INTERNAL_SERVER_ERROR)
 */
router.get("/:ticketId", getTicketById);
router.put("/:ticketId", updateTicket);
router.delete("/:ticketId", deleteTicket);

export default router;
