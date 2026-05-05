import { api } from "./api";

const XP_VALUES = {
  attendance: 1,
  race_participation: 15,
  result_standard: 3,
  result_pr: 6,
  coach_excellence: 20,
} as const;

type XpActionType = keyof typeof XP_VALUES;

async function insertXpTransaction(
  athleteId: string,
  actionType: XpActionType,
  amount: number,
  description: string
) {
  const { error } = await api.from("xp_transactions" as any).insert({
    athlete_id: athleteId,
    action_type: actionType,
    amount,
    description,
  });
  if (error) throw error;
}

export async function awardAttendanceXP(athleteId: string, workoutName: string) {
  await insertXpTransaction(
    athleteId,
    "attendance",
    XP_VALUES.attendance,
    `נוכחות: ${workoutName}`
  );
}

export async function awardRaceParticipation(athleteId: string, raceName: string) {
  await insertXpTransaction(
    athleteId,
    "race_participation",
    XP_VALUES.race_participation,
    `השתתפות בתחרות: ${raceName}`
  );
}

export async function awardResultXP(athleteId: string, resultName: string, isPR: boolean) {
  const actionType: XpActionType = isPR ? "result_pr" : "result_standard";
  const amount = isPR ? XP_VALUES.result_pr : XP_VALUES.result_standard;
  const prefix = isPR ? "שיא אישי" : "תוצאה";
  await insertXpTransaction(athleteId, actionType, amount, `${prefix}: ${resultName}`);
}

export async function awardCoachExcellence(athleteId: string, reason: string) {
  await insertXpTransaction(
    athleteId,
    "coach_excellence",
    XP_VALUES.coach_excellence,
    `פרס מצוינות: ${reason}`
  );
}

export async function getAthleteXpHistory(athleteId: string) {
  const { data, error } = await api
    .from("xp_transactions" as any)
    .select("*")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as any[];
}

export async function getAthleteXpProfile(athleteId: string) {
  const { data, error } = await api
    .from("profiles")
    .select("total_xp, level")
    .eq("id", athleteId)
    .single();
  if (error) throw error;
  return data as unknown as { total_xp: number; level: number };
}

export { XP_VALUES };
