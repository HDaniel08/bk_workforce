import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EmployeeSubRole, NotificationType, Prisma, UserRole } from "@prisma/client";
import type { AuthUser } from "../auth/types/auth-user.type";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateHandoverPostDto } from "./dto/create-handover-post.dto";
import type { HandoverContentDto } from "./dto/handover-content.dto";
import type { HandoverSearchQueryDto } from "./dto/handover-search-query.dto";
import { getCurrentHandoverDate, parseDateOnly, toDateOnly } from "./handover-date";

const personSelect = {
  id: true,
  firstName: true,
  lastName: true
} as const;

const replyInclude = {
  author: { select: personSelect },
  mentions: { include: { mentionedUser: { select: personSelect } } },
  tags: { include: { tag: { select: { name: true } } } }
} as const;

const postInclude = {
  author: { select: personSelect },
  mentions: { include: { mentionedUser: { select: personSelect } } },
  tags: { include: { tag: { select: { name: true } } } },
  replies: { orderBy: { createdAt: "asc" as const }, include: replyInclude }
} as const;

type HandoverPostWithRelations = Prisma.HandoverPostGetPayload<{
  include: typeof postInclude;
}>;

@Injectable()
export class HandoversService {
  constructor(private readonly prisma: PrismaService) {}

  async getDay(actor: AuthUser, dateValue: string) {
    const tenantId = this.requireTenant(actor);
    const handoverDate = this.readDate(dateValue);
    const currentHandoverDate = getCurrentHandoverDate();
    const posts = await this.prisma.handoverPost.findMany({
      where: { tenantId, handoverDate },
      orderBy: { createdAt: "asc" },
      include: postInclude
    });

    return {
      handoverDate: dateValue,
      currentHandoverDate,
      canCreate: dateValue === currentHandoverDate,
      posts: posts.map((post) => this.toPostResponse(post))
    };
  }

  async search(actor: AuthUser, query: HandoverSearchQueryDto) {
    const tenantId = this.requireTenant(actor);
    const filters: Prisma.HandoverPostWhereInput[] = [];
    const search = query.search?.trim();
    const tag = query.tag?.trim().replace(/^#/, "").toLocaleLowerCase("hu-HU");

    if (search) {
      filters.push({
        OR: [
          { content: { contains: search, mode: "insensitive" } },
          { replies: { some: { content: { contains: search, mode: "insensitive" } } } },
          { tags: { some: { tag: { name: { contains: search.replace(/^#/, ""), mode: "insensitive" } } } } },
          { replies: { some: { tags: { some: { tag: { name: { contains: search.replace(/^#/, ""), mode: "insensitive" } } } } } } }
        ]
      });
    }
    if (tag) {
      filters.push({
        OR: [
          { tags: { some: { tag: { name: tag } } } },
          { replies: { some: { tags: { some: { tag: { name: tag } } } } } }
        ]
      });
    }
    if (query.authorUserId) {
      filters.push({
        OR: [
          { authorUserId: query.authorUserId },
          { replies: { some: { authorUserId: query.authorUserId } } }
        ]
      });
    }
    if (query.mentionedUserId) {
      filters.push({
        OR: [
          { mentions: { some: { mentionedUserId: query.mentionedUserId } } },
          { replies: { some: { mentions: { some: { mentionedUserId: query.mentionedUserId } } } } }
        ]
      });
    }
    if (query.from || query.to) {
      const from = query.from ? this.readDate(query.from) : undefined;
      const to = query.to ? this.readDate(query.to) : undefined;
      if (from && to && from > to) {
        throw new BadRequestException("HANDOVER_INVALID_DATE_RANGE");
      }
      filters.push({ handoverDate: { gte: from, lte: to } });
    }

    const posts = await this.prisma.handoverPost.findMany({
      where: { tenantId, AND: filters },
      orderBy: [{ handoverDate: "desc" }, { createdAt: "asc" }],
      include: postInclude
    });

    return posts.map((post) => this.toPostResponse(post));
  }

  async getManagers(actor: AuthUser) {
    const tenantId = this.requireTenant(actor);
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.EMPLOYEE,
        OR: [{ employeeSubRole: EmployeeSubRole.MANAGER }, { employeeSubRole: EmployeeSubRole.WORKER, isStandInManager: true }],
        isActive: true,
        isDeleted: false
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: personSelect
    });
  }

  async getTags(actor: AuthUser) {
    const tenantId = this.requireTenant(actor);
    const tags = await this.prisma.handoverTag.findMany({
      where: { tenantId, OR: [{ posts: { some: {} } }, { replies: { some: {} } }] },
      orderBy: { name: "asc" },
      select: { name: true }
    });
    return tags.map((tag) => tag.name);
  }

  async createPost(actor: AuthUser, dto: CreateHandoverPostDto) {
    const tenantId = this.requireTenant(actor);
    const handoverDate = this.readDate(dto.handoverDate);
    if (dto.handoverDate !== getCurrentHandoverDate()) {
      throw new BadRequestException("HANDOVER_POST_ONLY_CURRENT_DAY");
    }
    const content = this.cleanContent(dto.content);
    const mentionUserIds = await this.validateMentions(tenantId, dto.mentionUserIds);
    const tagNames = this.extractTags(content);

    const post = await this.prisma.$transaction(async (transaction) => {
      const tagIds = await this.ensureTags(transaction, tenantId, tagNames);
      const created = await transaction.handoverPost.create({
        data: {
          tenantId,
          authorUserId: actor.id,
          handoverDate,
          content,
          mentions: { create: mentionUserIds.map((mentionedUserId) => ({ mentionedUserId })) },
          tags: { create: tagIds.map((tagId) => ({ tagId })) }
        },
        include: postInclude
      });
      await this.createHandoverNotifications(transaction, {
        tenantId,
        actorUserId: actor.id,
        recipientUserIds: mentionUserIds,
        postId: created.id,
        postAuthorUserId: actor.id
      });
      return created;
    });
    await this.audit(actor, "HANDOVER_POST_CREATED", "HandoverPost", post.id);
    return this.toPostResponse(post);
  }

  async updatePost(actor: AuthUser, id: string, dto: HandoverContentDto) {
    const tenantId = this.requireTenant(actor);
    const existing = await this.getPost(tenantId, id);
    this.assertOwner(existing.authorUserId, actor.id);
    if (toDateOnly(existing.handoverDate) !== getCurrentHandoverDate()) {
      throw new BadRequestException("PAST_HANDOVER_POST_READ_ONLY");
    }
    const content = this.cleanContent(dto.content);
    const mentionUserIds = await this.validateMentions(tenantId, dto.mentionUserIds);
    const tagNames = this.extractTags(content);
    const previousMentionIds = new Set(existing.mentions.map((mention) => mention.mentionedUserId));
    const addedMentionIds = mentionUserIds.filter((mentionedUserId) => !previousMentionIds.has(mentionedUserId));
    const post = await this.prisma.$transaction(async (transaction) => {
      const tagIds = await this.ensureTags(transaction, tenantId, tagNames);
      await transaction.handoverPostMention.deleteMany({ where: { postId: id } });
      await transaction.handoverPostTag.deleteMany({ where: { postId: id } });
      const updated = await transaction.handoverPost.update({
        where: { id },
        data: {
          content,
          mentions: { create: mentionUserIds.map((mentionedUserId) => ({ mentionedUserId })) },
          tags: { create: tagIds.map((tagId) => ({ tagId })) }
        },
        include: postInclude
      });
      await this.createHandoverNotifications(transaction, {
        tenantId,
        actorUserId: actor.id,
        recipientUserIds: addedMentionIds,
        postId: id,
        postAuthorUserId: existing.authorUserId,
        eventToken: updated.updatedAt.getTime().toString()
      });
      return updated;
    });
    await this.audit(actor, "HANDOVER_POST_UPDATED", "HandoverPost", id);
    return this.toPostResponse(post);
  }

  async deletePost(actor: AuthUser, id: string) {
    const tenantId = this.requireTenant(actor);
    const existing = await this.getPost(tenantId, id);
    this.assertOwner(existing.authorUserId, actor.id);
    if (toDateOnly(existing.handoverDate) !== getCurrentHandoverDate()) {
      throw new BadRequestException("PAST_HANDOVER_POST_READ_ONLY");
    }
    await this.prisma.handoverPost.delete({ where: { id } });
    await this.cleanupTags(tenantId);
    await this.audit(actor, "HANDOVER_POST_DELETED", "HandoverPost", id);
    return { id };
  }

  async createReply(actor: AuthUser, postId: string, dto: HandoverContentDto) {
    const tenantId = this.requireTenant(actor);
    const parentPost = await this.getPost(tenantId, postId);
    const content = this.cleanContent(dto.content);
    const mentionUserIds = await this.validateMentions(tenantId, dto.mentionUserIds);
    const tagNames = this.extractTags(content);
    const reply = await this.prisma.$transaction(async (transaction) => {
      const tagIds = await this.ensureTags(transaction, tenantId, tagNames);
      const created = await transaction.handoverReply.create({
        data: {
          postId,
          authorUserId: actor.id,
          content,
          mentions: { create: mentionUserIds.map((mentionedUserId) => ({ mentionedUserId })) },
          tags: { create: tagIds.map((tagId) => ({ tagId })) }
        },
        include: replyInclude
      });
      await this.createHandoverNotifications(transaction, {
        tenantId,
        actorUserId: actor.id,
        recipientUserIds: [...new Set([parentPost.authorUserId, ...mentionUserIds])],
        postId,
        replyId: created.id,
        postAuthorUserId: parentPost.authorUserId
      });
      return created;
    });
    await this.audit(actor, "HANDOVER_REPLY_CREATED", "HandoverReply", reply.id);
    return this.toReplyResponse(reply);
  }

  async updateReply(actor: AuthUser, id: string, dto: HandoverContentDto) {
    const tenantId = this.requireTenant(actor);
    const existing = await this.getReply(tenantId, id);
    this.assertOwner(existing.authorUserId, actor.id);
    const content = this.cleanContent(dto.content);
    const mentionUserIds = await this.validateMentions(tenantId, dto.mentionUserIds);
    const tagNames = this.extractTags(content);
    const previousMentionIds = new Set(existing.mentions.map((mention) => mention.mentionedUserId));
    const addedMentionIds = mentionUserIds.filter((mentionedUserId) => !previousMentionIds.has(mentionedUserId));
    const reply = await this.prisma.$transaction(async (transaction) => {
      const tagIds = await this.ensureTags(transaction, tenantId, tagNames);
      await transaction.handoverReplyMention.deleteMany({ where: { replyId: id } });
      await transaction.handoverReplyTag.deleteMany({ where: { replyId: id } });
      const updated = await transaction.handoverReply.update({
        where: { id },
        data: {
          content,
          mentions: { create: mentionUserIds.map((mentionedUserId) => ({ mentionedUserId })) },
          tags: { create: tagIds.map((tagId) => ({ tagId })) }
        },
        include: replyInclude
      });
      await this.createHandoverNotifications(transaction, {
        tenantId,
        actorUserId: actor.id,
        recipientUserIds: addedMentionIds,
        postId: existing.post.id,
        replyId: id,
        postAuthorUserId: existing.post.authorUserId,
        eventToken: updated.updatedAt.getTime().toString()
      });
      return updated;
    });
    await this.audit(actor, "HANDOVER_REPLY_UPDATED", "HandoverReply", id);
    return this.toReplyResponse(reply);
  }

  async deleteReply(actor: AuthUser, id: string) {
    const tenantId = this.requireTenant(actor);
    const existing = await this.getReply(tenantId, id);
    this.assertOwner(existing.authorUserId, actor.id);
    await this.prisma.handoverReply.delete({ where: { id } });
    await this.cleanupTags(tenantId);
    await this.audit(actor, "HANDOVER_REPLY_DELETED", "HandoverReply", id);
    return { id };
  }

  private requireTenant(actor: AuthUser) {
    if (!actor.tenantId) throw new ForbiddenException("TENANT_REQUIRED");
    return actor.tenantId;
  }

  private readDate(value: string) {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException("INVALID_HANDOVER_DATE");
    }
  }

  private cleanContent(content: string) {
    const cleaned = content.trim();
    if (!cleaned) throw new BadRequestException("HANDOVER_CONTENT_REQUIRED");
    return cleaned;
  }

  private extractTags(content: string) {
    const names = new Set<string>();
    const expression = /(^|\s)#([\p{L}\p{N}_-]{1,50})/gu;
    for (const match of content.matchAll(expression)) {
      const name = match[2];
      if (name) names.add(name.toLocaleLowerCase("hu-HU"));
    }
    return [...names];
  }

  private async validateMentions(tenantId: string, values: string[] = []) {
    const ids = [...new Set(values)];
    if (ids.length === 0) return ids;
    const count = await this.prisma.user.count({
      where: {
        id: { in: ids },
        tenantId,
        role: UserRole.EMPLOYEE,
        OR: [{ employeeSubRole: EmployeeSubRole.MANAGER }, { employeeSubRole: EmployeeSubRole.WORKER, isStandInManager: true }],
        isActive: true,
        isDeleted: false
      }
    });
    if (count !== ids.length) throw new BadRequestException("INVALID_HANDOVER_MENTION");
    return ids;
  }

  private async ensureTags(transaction: Prisma.TransactionClient, tenantId: string, names: string[]) {
    const tags = await Promise.all(
      names.map((name) =>
        transaction.handoverTag.upsert({
          where: { tenantId_name: { tenantId, name } },
          create: { tenantId, name },
          update: {},
          select: { id: true }
        })
      )
    );
    return tags.map((tag) => tag.id);
  }

  private getPost(tenantId: string, id: string) {
    return this.prisma.handoverPost.findFirstOrThrow({
      where: { id, tenantId },
      include: { mentions: { select: { mentionedUserId: true } } }
    }).catch(() => { throw new NotFoundException("HANDOVER_POST_NOT_FOUND"); });
  }

  private getReply(tenantId: string, id: string) {
    return this.prisma.handoverReply.findFirstOrThrow({
      where: { id, post: { tenantId } },
      include: {
        mentions: { select: { mentionedUserId: true } },
        post: { select: { id: true, authorUserId: true } }
      }
    }).catch(() => { throw new NotFoundException("HANDOVER_REPLY_NOT_FOUND"); });
  }

  private assertOwner(authorUserId: string, actorUserId: string) {
    if (authorUserId !== actorUserId) throw new ForbiddenException("HANDOVER_AUTHOR_ONLY");
  }

  private cleanupTags(tenantId: string) {
    return this.prisma.handoverTag.deleteMany({
      where: { tenantId, posts: { none: {} }, replies: { none: {} } }
    });
  }

  private createHandoverNotifications(
    transaction: Prisma.TransactionClient,
    input: {
      tenantId: string;
      actorUserId: string;
      recipientUserIds: string[];
      postId: string;
      replyId?: string;
      postAuthorUserId: string;
      eventToken?: string;
    }
  ) {
    const recipients = [...new Set(input.recipientUserIds)].filter(
      (recipientUserId) => recipientUserId !== input.actorUserId
    );
    if (recipients.length === 0) return Promise.resolve({ count: 0 });

    return transaction.notification.createMany({
      data: recipients.map((recipientUserId) => ({
        tenantId: input.tenantId,
        recipientUserId,
        actorUserId: input.actorUserId,
        type:
          input.replyId && recipientUserId === input.postAuthorUserId
            ? NotificationType.HANDOVER_REPLY
            : NotificationType.HANDOVER_MENTION,
        deduplicationKey: `handover:${input.replyId ? "reply" : "post"}:${input.replyId ?? input.postId}:${recipientUserId}:${input.eventToken ?? "created"}`,
        handoverPostId: input.postId,
        handoverReplyId: input.replyId
      })),
      skipDuplicates: true
    });
  }

  private audit(actor: AuthUser, action: string, entityType: string, entityId: string) {
    return this.prisma.auditLog.create({
      data: { tenantId: actor.tenantId, actorUserId: actor.id, action, entityType, entityId }
    });
  }

  private toPostResponse(post: HandoverPostWithRelations) {
    return {
      id: post.id,
      handoverDate: toDateOnly(post.handoverDate),
      content: post.content,
      author: post.author,
      mentions: post.mentions.map((mention) => mention.mentionedUser),
      tags: post.tags.map((item) => item.tag.name).sort(),
      replies: post.replies.map((reply) => this.toReplyResponse(reply)),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    };
  }

  private toReplyResponse(reply: Prisma.HandoverReplyGetPayload<{ include: typeof replyInclude }>) {
    return {
      id: reply.id,
      postId: reply.postId,
      content: reply.content,
      author: reply.author,
      mentions: reply.mentions.map((mention) => mention.mentionedUser),
      tags: reply.tags.map((item) => item.tag.name).sort(),
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt
    };
  }
}
