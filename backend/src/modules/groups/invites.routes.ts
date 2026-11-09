import { Router } from "express";
import { postJoinGroup } from "./groups.controller.js";

const router = Router();

/**
 * @swagger
 * /api/invites/{token}/join:
 *   post:
 *     summary: 초대 링크로 그룹 가입
 *     description: 로그인한 사용자가 유효한 초대 링크로 그룹에 가입합니다.
 *     tags: [그룹]
 *     security:
 *       - AccessTokenCookie: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 그룹 가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/JoinGroupResponse'
 *       401:
 *         description: 로그인이 필요하거나 액세스 토큰이 만료됨
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 초대 링크가 없거나 만료·무효됨 (INVITE_INVALID)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 이미 멤버이거나 그룹 정원 또는 참여 그룹 수 제한에 도달함
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
router.post("/:token/join", postJoinGroup);

export default router;
