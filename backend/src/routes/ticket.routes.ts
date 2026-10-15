import { Router } from "express";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
} from "../controllers/ticket.controller.js";

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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               visitDate:
 *                 type: string
 *               location:
 *                 type: string
 *               memo:
 *                 type: string
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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               visitDate:
 *                 type: string
 *               location:
 *                 type: string
 *               memo:
 *                 type: string
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: 수정할 티켓을 찾을 수 없음
 *   delete:
 *     summary: 티켓 삭제
 *     tags: [티켓 아카이빙]
 *     description: 특정 ID를 가진 티켓을 삭제합니다.
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
 *       404:
 *         description: 삭제할 티켓을 찾을 수 없음
 */
router.get("/:ticketId", getTicketById);
router.put("/:ticketId", updateTicket);
router.delete("/:ticketId", deleteTicket);

export default router;
