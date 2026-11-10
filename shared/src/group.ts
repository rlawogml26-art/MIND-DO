import { z } from "zod";

export const GROUP_NAME_MAX = 8;
export const GROUP_CAPACITY = 6;
export const GROUP_MEMBERSHIP_MAX = 4;
export const JOINT_TITLE_MAX = 12;

export const groupNameSchema = z.string().trim().min(1).max(GROUP_NAME_MAX);
export const jointTitleSchema = z.string().trim().max(JOINT_TITLE_MAX);
