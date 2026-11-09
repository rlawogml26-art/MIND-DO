import { Router } from "express";
import { signup } from "./auth.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: 인증
 *   description: 회원가입
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 회원가입
 *     tags: [인증]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *           example:
 *             email: user@example.com
 *             password: password123
 *             name: 홍길동
 *     responses:
 *       201:
 *         description: 회원가입 성공. accessToken과 refreshToken은 HttpOnly 쿠키로 설정됩니다.
 *         headers:
 *           Set-Cookie:
 *             description: accessToken, refreshToken HttpOnly 쿠키
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SignupResponse'
 *       400:
 *         description: 입력값 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: 이미 가입된 이메일
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
router.post("/signup", signup);

export default router;
