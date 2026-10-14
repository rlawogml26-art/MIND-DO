import { Router } from 'express';
import { createTicket, getTickets } from '../controllers/ticket.controller.js';

const router = Router();

// 티켓 생성 API
router.post('/', createTicket);

// 저장한 티켓 목록 조회 API
router.get('/', getTickets);

export default router;