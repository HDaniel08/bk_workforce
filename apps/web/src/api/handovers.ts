import { api } from "../lib/api";

export interface HandoverPerson {
  id: string;
  firstName: string;
  lastName: string;
}

export interface HandoverReply {
  id: string;
  postId: string;
  content: string;
  author: HandoverPerson;
  mentions: HandoverPerson[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HandoverPost {
  id: string;
  handoverDate: string;
  content: string;
  author: HandoverPerson;
  mentions: HandoverPerson[];
  tags: string[];
  replies: HandoverReply[];
  createdAt: string;
  updatedAt: string;
}

export interface HandoverDay {
  handoverDate: string;
  currentHandoverDate: string;
  canCreate: boolean;
  posts: HandoverPost[];
}

export type HandoverContentInput = {
  content: string;
  mentionUserIds?: string[];
};

export async function getHandoverDay(date: string) {
  const response = await api.get<HandoverDay>("/handovers/day", { params: { date } });
  return response.data;
}

export async function searchHandovers(params: Record<string, string>) {
  const response = await api.get<HandoverPost[]>("/handovers/search", { params });
  return response.data;
}

export async function getHandoverManagers() {
  const response = await api.get<HandoverPerson[]>("/handovers/managers");
  return response.data;
}

export async function getHandoverTags() {
  const response = await api.get<string[]>("/handovers/tags");
  return response.data;
}

export async function createHandoverPost(handoverDate: string, input: HandoverContentInput) {
  const response = await api.post<HandoverPost>("/handovers/posts", { handoverDate, ...input });
  return response.data;
}

export async function updateHandoverPost(id: string, input: HandoverContentInput) {
  const response = await api.patch<HandoverPost>(`/handovers/posts/${id}`, input);
  return response.data;
}

export async function deleteHandoverPost(id: string) {
  await api.delete(`/handovers/posts/${id}`);
}

export async function createHandoverReply(postId: string, input: HandoverContentInput) {
  const response = await api.post<HandoverReply>(`/handovers/posts/${postId}/replies`, input);
  return response.data;
}

export async function updateHandoverReply(id: string, input: HandoverContentInput) {
  const response = await api.patch<HandoverReply>(`/handovers/replies/${id}`, input);
  return response.data;
}

export async function deleteHandoverReply(id: string) {
  await api.delete(`/handovers/replies/${id}`);
}

