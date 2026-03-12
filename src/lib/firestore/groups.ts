import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Group } from "@/types";

const groupsRef = collection(db, "groups");

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function createGroup(
  name: string,
  description: string,
  userId: string
): Promise<string> {
  const group: Omit<Group, "id"> = {
    name,
    description,
    createdBy: userId,
    inviteCode: generateInviteCode(),
    memberIds: [userId],
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(groupsRef, group);

  // Add group to user's groupIds
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { groupIds: arrayUnion(docRef.id) });

  return docRef.id;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const docSnap = await getDoc(doc(db, "groups", groupId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Group;
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const q = query(groupsRef, where("memberIds", "array-contains", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
}

export async function getGroupByInviteCode(
  inviteCode: string
): Promise<Group | null> {
  const q = query(groupsRef, where("inviteCode", "==", inviteCode));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as Group;
}

export async function joinGroup(
  groupId: string,
  userId: string
): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, { memberIds: arrayUnion(userId) });

  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { groupIds: arrayUnion(groupId) });
}
