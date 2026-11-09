import type { Request, Response } from "express";
import {
  createGroupInviteResponseSchema,
  createGroupRequestSchema,
  ErrorCode,
  groupIdParamsSchema,
  groupResponseSchema,
  joinGroupInviteParamsSchema,
  joinGroupResponseSchema,
  USER_GROUP_MAX,
} from "@mind-do/shared";
import {
  AccessTokenExpiredError,
  UnauthorizedError,
} from "../auth/auth.service.js";
import {
  createGroup,
  createGroupInvite,
  AlreadyGroupMemberError,
  DefaultGroupNotAllowedError,
  GroupFullError,
  GroupLimitExceededError,
  GroupNotFoundError,
  InviteInvalidError,
  joinGroupByInvite,
} from "./groups.service.js";

export const postGroup = async (req: Request, res: Response) => {
  const parsed = createGroupRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: "입력값을 확인해주세요.",
      },
    });
  }

  try {
    const group = await createGroup(req.headers.cookie, parsed.data);
    return res.status(201).json({ data: groupResponseSchema.parse(group) });
  } catch (error: unknown) {
    if (error instanceof AccessTokenExpiredError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.ACCESS_TOKEN_EXPIRED,
          message: "로그인 정보가 만료되었습니다.",
        },
      });
    }
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: "로그인이 필요합니다.",
        },
      });
    }
    if (error instanceof GroupLimitExceededError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.GROUP_LIMIT_EXCEEDED,
          message: `참여 중인 그룹은 최대 ${USER_GROUP_MAX}개까지 가능합니다.`,
        },
      });
    }
    throw error;
  }
};

export const postGroupInvite = async (req: Request, res: Response) => {
  const parsedParams = groupIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: "입력값을 확인해주세요.",
      },
    });
  }

  try {
    const invite = await createGroupInvite(
      req.headers.cookie,
      parsedParams.data.groupId,
    );
    return res
      .status(201)
      .json({ data: createGroupInviteResponseSchema.parse(invite) });
  } catch (error: unknown) {
    if (error instanceof AccessTokenExpiredError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.ACCESS_TOKEN_EXPIRED,
          message: "로그인 정보가 만료되었습니다.",
        },
      });
    }
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: "로그인이 필요합니다.",
        },
      });
    }
    if (error instanceof GroupNotFoundError) {
      return res.status(404).json({
        error: {
          code: ErrorCode.GROUP_NOT_FOUND,
          message: "그룹을 찾을 수 없습니다.",
        },
      });
    }
    if (error instanceof DefaultGroupNotAllowedError) {
      return res.status(403).json({
        error: {
          code: ErrorCode.DEFAULT_GROUP_NOT_ALLOWED,
          message: "기본 1인 그룹에서는 초대 링크를 만들 수 없습니다.",
        },
      });
    }
    if (error instanceof GroupFullError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.GROUP_FULL,
          message: "그룹 정원이 가득 찼습니다.",
        },
      });
    }
    throw error;
  }
};

export const postJoinGroup = async (req: Request, res: Response) => {
  const parsedParams = joinGroupInviteParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(404).json({
      error: {
        code: ErrorCode.INVITE_INVALID,
        message: "초대 링크가 유효하지 않거나 만료되었습니다.",
      },
    });
  }

  try {
    const group = await joinGroupByInvite(
      req.headers.cookie,
      parsedParams.data.token,
    );
    return res.status(200).json({ data: joinGroupResponseSchema.parse(group) });
  } catch (error: unknown) {
    if (error instanceof AccessTokenExpiredError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.ACCESS_TOKEN_EXPIRED,
          message: "로그인 정보가 만료되었습니다.",
        },
      });
    }
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: "로그인이 필요합니다.",
        },
      });
    }
    if (error instanceof InviteInvalidError) {
      return res.status(404).json({
        error: {
          code: ErrorCode.INVITE_INVALID,
          message: "초대 링크가 유효하지 않거나 만료되었습니다.",
        },
      });
    }
    if (error instanceof AlreadyGroupMemberError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.ALREADY_GROUP_MEMBER,
          message: "이미 그룹 멤버입니다.",
        },
      });
    }
    if (error instanceof GroupFullError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.GROUP_FULL,
          message: "그룹 정원이 가득 찼습니다.",
        },
      });
    }
    if (error instanceof GroupLimitExceededError) {
      return res.status(409).json({
        error: {
          code: ErrorCode.GROUP_LIMIT_EXCEEDED,
          message: `참여 중인 그룹은 최대 ${USER_GROUP_MAX}개까지 가능합니다.`,
        },
      });
    }
    throw error;
  }
};
