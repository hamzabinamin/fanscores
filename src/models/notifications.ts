import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  const uid = auth().currentUser?.uid;
  if (uid && token) {
    await firestore().collection('Users').doc(uid).set(
      { pushToken: token, notificationsEnabled: true },
      { merge: true }
    );
  }
  return token;
}

export async function setNotificationsEnabled(enabled: boolean) {
  const uid = auth().currentUser?.uid;
  if (!uid) return;
  await firestore().collection('Users').doc(uid).set(
    { notificationsEnabled: enabled },
    { merge: true }
  );
}

// subscribe/unsubscribe the current user to a game
export async function setGameSubscription(gameId: string, subscribe: boolean) {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  const op = subscribe
    ? firestore.FieldValue.arrayUnion(uid)
    : firestore.FieldValue.arrayRemove(uid);

  await firestore().collection('Game').doc(gameId).update({ subscribers: op });
}