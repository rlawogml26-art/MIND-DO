import { z } from "zod";

export const JOINT_TITLE_MAX = 12;

export const jointTitleSchema = z.string().trim().max(JOINT_TITLE_MAX);
