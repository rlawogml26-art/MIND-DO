import { Router } from "express";
import { postGroup } from "./groups.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: 그룹
 *   description: 그룹 생성 및 관리
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: 그룹 생성
 *     tags: [그룹]
 *     security:
 *       - AccessTokenCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGroupRequest'
 *     responses:
 *       201:
 *         description: 그룹 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/GroupResponse'
 *       400:
 *         description: 입력값 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 로그인 또는 유효한 액세스 토큰 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 가입 가능한 그룹 수 초과
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
router.post("/", postGroup);

export default router;
