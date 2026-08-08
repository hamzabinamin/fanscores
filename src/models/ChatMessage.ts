import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { gamesCollection } from './Game';

export interface ChatMessage {
  id: string;
  text: string;
  authorName: string;
  authorId: string | null;   // null = guest
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
}

export const messagesCollection = (gameId: string) =>
  gamesCollection().doc(gameId).collection('messages');

export function messageFromDoc(doc: FirebaseFirestoreTypes.DocumentSnapshot): ChatMessage {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    text: d.text ?? '',
    authorName: d.authorName ?? 'Anonymous',
    authorId: d.authorId ?? null,
    createdAt: d.createdAt ?? null,
  };
}

export async function sendMessage(gameId: string, text: string, authorName: string, authorId: string | null) {
  await messagesCollection(gameId).add({
    text: text.trim(),
    authorName: authorName.trim() || 'Anonymous',
    authorId,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function reportMessage(gameId: string, message: ChatMessage, reporterId: string | null) {
  await firestore().collection('Reports').add({
    gameId,
    messageId: message.id,
    messageText: message.text,
    messageAuthor: message.authorName,
    reportedBy: reporterId,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}