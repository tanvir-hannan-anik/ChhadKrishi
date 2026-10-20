import "server-only";

import { db } from "@/lib/db";
import { isDueOn, nextDueDate } from "@/lib/dates";

export type CareKind = "water" | "fertilize" | "prune" | "pest" | "other";
export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface CareTask {
  id: string;
  plantId: string | null;
  plantName: string | null;
  title: string;
  kind: CareKind;
  everyDays: number;
  timeOfDay: TimeOfDay;
  startDate: string;
  dueToday: boolean;
  doneToday: boolean;
  nextDue: string;
}

export interface NewCareTask {
  plantId: string | null;
  title: string;
  kind: CareKind;
  everyDays: number;
  timeOfDay: TimeOfDay;
  startDate: string;
}

const TIME_ORDER: Record<TimeOfDay, number> = { morning: 0, afternoon: 1, evening: 2 };

export async function listTasks(userId: string, today: string): Promise<CareTask[]> {
  const [rows, logs] = await Promise.all([
    db
      .selectFrom("care_task")
      .leftJoin("garden_plant", "garden_plant.id", "care_task.plant_id")
      .select([
        "care_task.id",
        "care_task.plant_id",
        "garden_plant.name as plant_name",
        "care_task.title",
        "care_task.kind",
        "care_task.every_days",
        "care_task.time_of_day",
        "care_task.start_date",
      ])
      .where("care_task.user_id", "=", userId)
      .orderBy("care_task.created_at", "asc")
      .execute(),
    db.selectFrom("care_log").select("task_id").where("user_id", "=", userId).where("done_on", "=", today).execute(),
  ]);
  const done = new Set(logs.map((l) => l.task_id));
  return rows
    .map((row) => ({
      id: row.id,
      plantId: row.plant_id,
      plantName: row.plant_name,
      title: row.title,
      kind: row.kind,
      everyDays: row.every_days,
      timeOfDay: row.time_of_day,
      startDate: row.start_date,
      dueToday: isDueOn(row, today),
      doneToday: done.has(row.id),
      nextDue: nextDueDate(row, today),
    }))
    .sort((a, b) => TIME_ORDER[a.timeOfDay] - TIME_ORDER[b.timeOfDay]);
}

export async function createTasks(userId: string, tasks: NewCareTask[]): Promise<number> {
  if (tasks.length === 0) return 0;
  await db
    .insertInto("care_task")
    .values(
      tasks.map((t) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        plant_id: t.plantId,
        title: t.title,
        kind: t.kind,
        every_days: t.everyDays,
        time_of_day: t.timeOfDay,
        start_date: t.startDate,
      })),
    )
    .execute();
  return tasks.length;
}

export async function updateTask(userId: string, id: string, patch: Partial<NewCareTask>): Promise<boolean> {
  const result = await db
    .updateTable("care_task")
    .set({
      ...(patch.plantId !== undefined && { plant_id: patch.plantId }),
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.kind !== undefined && { kind: patch.kind }),
      ...(patch.everyDays !== undefined && { every_days: patch.everyDays }),
      ...(patch.timeOfDay !== undefined && { time_of_day: patch.timeOfDay }),
      ...(patch.startDate !== undefined && { start_date: patch.startDate }),
    })
    .where("id", "=", id)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const result = await db.deleteFrom("care_task").where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
  return Number(result.numDeletedRows) > 0;
}

/** Marks a task done/undone for a date. Returns false if the task is not the user's. */
export async function setTaskDone(userId: string, id: string, date: string, done: boolean): Promise<boolean> {
  const owned = await db.selectFrom("care_task").select("id").where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
  if (!owned) return false;
  if (done) {
    await db.insertInto("care_log").values({ task_id: id, user_id: userId, done_on: date }).onConflict((oc) => oc.columns(["task_id", "done_on"]).doNothing()).execute();
  } else {
    await db.deleteFrom("care_log").where("task_id", "=", id).where("user_id", "=", userId).where("done_on", "=", date).execute();
  }
  return true;
}
