import { Router } from "express";
import { getMe } from "./users.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: 사용자
 *   description: 로그인한 사용자 정보
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: 내 정보 조회
 *     tags: [사용자]
 *     security:
 *       - AccessTokenCookie: []
 *     responses:
 *       200:
 *         description: 현재 로그인한 사용자
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CurrentUserResponse'
 *       401:
 *         description: 로그인이 필요하거나 액세스 토큰이 만료됨
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", getMe);

export default router;
