import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser } from "../auth/types/auth-user.type";
import { PrismaService } from "../prisma/prisma.service";

const BUDAPEST_TIME_ZONE = "Europe/Budapest";
const UNREAD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function getZonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUDAPEST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second")
  };
}

function getTimeZoneOffset(date: Date) {
  const parts = getZonedParts(date);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function getBudapestDayStart(now: Date) {
  const parts = getZonedParts(now);
  const desiredAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const firstGuess = new Date(desiredAsUtc);
  const secondGuess = new Date(desiredAsUtc - getTimeZoneOffset(firstGuess));
  return new Date(desiredAsUtc - getTimeZoneOffset(secondGuess));
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthUser) {
    await this.cleanupExpired();
    const notifications = await this.prisma.notification.findMany({
      where: { recipientUserId: actor.id },
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true } },
        handoverPost: {
          select: { id: true, handoverDate: true, content: true }
        },
        handoverReply: {
          select: {
            id: true,
            content: true,
            post: { select: { id: true, handoverDate: true, content: true } }
          }
        }
      }
    });

    return {
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
      items: notifications.map((notification) => {
        const post = notification.handoverPost ?? notification.handoverReply?.post;
        return {
          id: notification.id,
          type: notification.type,
          actor: notification.actor,
          readAt: notification.readAt,
          createdAt: notification.createdAt,
          handoverDate: post?.handoverDate.toISOString().slice(0, 10) ?? null,
          handoverPostId: post?.id ?? null,
          handoverReplyId: notification.handoverReply?.id ?? null,
          snippet: notification.handoverReply?.content ?? post?.content ?? ""
        };
      })
    };
  }

  async markRead(actor: AuthUser, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientUserId: actor.id },
      data: { readAt: new Date() }
    });
    if (result.count === 0) throw new NotFoundException("NOTIFICATION_NOT_FOUND");
    return { id, readAt: new Date() };
  }

  async markAllRead(actor: AuthUser) {
    const readAt = new Date();
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId: actor.id, readAt: null },
      data: { readAt }
    });
    return { count: result.count, readAt };
  }

  private cleanupExpired() {
    const now = new Date();
    const unreadCutoff = new Date(now.getTime() - UNREAD_RETENTION_MS);
    const todayStart = getBudapestDayStart(now);
    return this.prisma.notification.deleteMany({
      where: {
        OR: [
          { readAt: { not: null, lt: todayStart } },
          { readAt: null, createdAt: { lt: unreadCutoff } }
        ]
      }
    });
  }
}

