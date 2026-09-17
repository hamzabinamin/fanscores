import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export async function deactivateAccount() {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('No signed-in user.');

  // mark the profile inactive (kept for possible reactivation)
  await firestore().collection('Users').doc(uid).set(
    {
      active: false,
      deactivatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // sign out — RootStack redirects to login automatically
  await auth().signOut();
}