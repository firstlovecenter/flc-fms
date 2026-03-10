"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { sendEventPublishedEmail } from "@/lib/notifications/email";
import { notifyEventPublished } from "@/lib/notifications/sms";

const EventSchema = z.object({
  facilityId:  z.string().min(1, "Please select a facility"),
  title:       z.string().min(2).max(200),
  description: z.string().optional(),
  startTime:   z.coerce.date(),
  endTime:     z.coerce.date(),
  maxAttendees: z.coerce.number().int().positive().optional(),
  isPublic:    z.boolean().default(true),
  isRecurring: z.boolean().default(false)}).refine((d) => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"]});

export async function createEvent(data: z.infer<typeof EventSchema>) {
  const session  = await requirePermission("canCreateEvents");  const validated = EventSchema.parse(data);

  // Check facility belongs to campus
  await prisma.facility.findFirstOrThrow({
    where: { id: validated.facilityId, isActive: true }});

  const event = await prisma.event.create({
    data: { createdById: session.sub, ...validated }});

  auditLog({ userId: session.sub,
    action: "CREATE_EVENT", entity: "Event", entityId: event.id,
    after: event});

  // Notify all campus patrons if event is public
  if (validated.isPublic) {
    const [patrons, facility] = await Promise.all([
      prisma.patron.findMany({
        where: { isVerified: true },
        select: { email: true, name: true, phone: true }}),
      prisma.facility.findUnique({
        where: { id: validated.facilityId },
        select: { name: true }}),
    ]);
    for (const patron of patrons) {
      if (patron.phone) {
        await notifyEventPublished({
          phone:      patron.phone,
          eventTitle: validated.title,
          eventDate:  validated.startTime,
          venue:      facility?.name ?? "TBD",
        });
      }
      await sendEventPublishedEmail({
        to:           patron.email,
        patronName:   patron.name,
        eventTitle:   validated.title,
        facilityName: facility?.name ?? "TBD",
        startTime:    validated.startTime,
        endTime:      validated.endTime});
    }
  }

  revalidatePath("/events");
  return { success: true, event };
}

export async function updateEvent(id: string, data: Partial<z.infer<typeof EventSchema>>) {
  const session  = await requirePermission("canCreateEvents");  const event = await prisma.event.update({
    where: { id },
    data});

  auditLog({ userId: session.sub, action: "UPDATE_EVENT", entity: "Event", entityId: id });
  revalidatePath(`/events/${id}`);
  return { success: true, event };
}

export async function deleteEvent(id: string) {
  const session  = await requireStaff("FACILITY_MANAGER");  await prisma.event.delete({ where: { id } });

  auditLog({ userId: session.sub, action: "DELETE_EVENT", entity: "Event", entityId: id });
  revalidatePath("/events");
  return { success: true };
}

export async function getEvents(upcoming = true) {  return prisma.event.findMany({
    where: {
      ...(upcoming ? { startTime: { gte: new Date() } } : {})},
    include: {
      facility:  { select: { name: true } },
      createdBy: { select: { name: true } },
      _count:    { select: { bookings: true } }},
    orderBy: { startTime: "asc" }});
}
