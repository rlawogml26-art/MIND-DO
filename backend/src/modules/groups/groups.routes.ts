import { Router } from "express";
import { postGroup, postGroupInvite } from "./groups.controller.js";

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
 *           example:
 *             name: 우리의 하루
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
 *         description: 입력값 검증 실패 (INVALID_INPUT)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 로그인이 필요함 (UNAUTHORIZED) 또는 액세스 토큰 만료 (ACCESS_TOKEN_EXPIRED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 참여 가능한 그룹 수 초과 (GROUP_LIMIT_EXCEEDED)
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

/**
 * @swagger
 * /api/groups/{groupId}/invites:
 *   post:
 *     summary: 그룹 초대 링크 발급
 *     description: 해당 그룹의 멤버라면 누구나 초대 링크를 발급할 수 있습니다. 원본 토큰은 응답에만 포함되며 저장소에는 해시만 저장됩니다.
 *     tags: [그룹]
 *     security:
 *       - AccessTokenCookie: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       201:
 *         description: 초대 링크 발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CreateGroupInviteResponse'
 *       400:
 *         description: 잘못된 그룹 ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 로그인이 필요하거나 액세스 토큰이 만료됨
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 기본 1인 그룹에서는 발급할 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 그룹이 없거나 요청자가 멤버가 아님
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 그룹 정원이 가득 참
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류 또는 초대 링크 환경 설정 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:groupId/invites", postGroupInvite);

export default router;
