import "server-only";

import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { buildAuctionContactRequestTemplate } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { COLLECTIONS } from "@/types/entities";

export type AuctionContactRequestStatus = {
  auctionId: string;
  sentAt: string | null;
};

export function asIdString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return String(value);
}

export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
  }
  return null;
}

function buildAuctionIdQuery(auctionIds: string[]) {
  const objectIds = auctionIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const clauses: Record<string, unknown>[] = [];
  if (auctionIds.length > 0) clauses.push({ auctionId: { $in: auctionIds } });
  if (objectIds.length > 0) clauses.push({ auctionId: { $in: objectIds } });

  if (clauses.length === 0) return { auctionId: "__never__" };
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
}

export async function getAuctionContactStatuses(
  db: Db,
  params: {
    auctionIds: string[];
    submittedById: string;
  }
) {
  const uniqueAuctionIds = [...new Set(params.auctionIds)];
  if (uniqueAuctionIds.length === 0) {
    return new Map<string, AuctionContactRequestStatus>();
  }

  const docs = await db
    .collection<Record<string, unknown>>(COLLECTIONS.auctionContactRequests)
    .find({
      submittedById: params.submittedById,
      ...buildAuctionIdQuery(uniqueAuctionIds),
    } as never)
    .toArray();

  const map = new Map<string, AuctionContactRequestStatus>();
  for (const doc of docs) {
    map.set(asIdString(doc.auctionId), {
      auctionId: asIdString(doc.auctionId),
      sentAt: toIsoDate(doc.sentAt),
    });
  }
  return map;
}

export async function sendAuctionContactRequestEmails(params: {
  recipientEmail: string;
  recipientName: string;
  senderEmail: string;
  senderName: string;
  auctionTitle: string;
  senderPhone: string;
  meetingLocation: string;
  preferredContactTime?: string | null;
  note?: string | null;
}) {
  const recipientTemplate = buildAuctionContactRequestTemplate({
    recipientName: params.recipientName,
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    senderPhone: params.senderPhone,
    auctionTitle: params.auctionTitle,
    meetingLocation: params.meetingLocation,
    preferredContactTime: params.preferredContactTime,
    note: params.note,
  });

  const confirmationTemplate = buildAuctionContactRequestTemplate({
    recipientName: params.senderName,
    senderName: params.senderName,
    senderEmail: params.senderEmail,
    senderPhone: params.senderPhone,
    auctionTitle: params.auctionTitle,
    meetingLocation: params.meetingLocation,
    preferredContactTime: params.preferredContactTime,
    note: params.note,
    isConfirmation: true,
  });

  await Promise.all([
    sendMail({
      to: params.recipientEmail,
      subject: recipientTemplate.subject,
      text: recipientTemplate.text,
      html: recipientTemplate.html,
      replyTo: params.senderEmail,
    }),
    sendMail({
      to: params.senderEmail,
      subject: confirmationTemplate.subject,
      text: confirmationTemplate.text,
      html: confirmationTemplate.html,
    }),
  ]);
}
