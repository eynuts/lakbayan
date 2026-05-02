// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, push, set, get, update, remove } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqM_hhqyLm5655AXCNKOe0oP3S5zsdFyg",
  authDomain: "sidellresort-5e25d.firebaseapp.com",
  projectId: "sidellresort-5e25d",
  storageBucket: "sidellresort-5e25d.firebasestorage.app",
  messagingSenderId: "317807153481",
  appId: "1:317807153481:web:f25e96c308e94d4c868a98",
  measurementId: "G-X0MMFR82J2",
  databaseURL: "https://sidellresort-5e25d-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

// Sign out
export const logOut = () => {
  return signOut(auth);
};

// Monitor auth state
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const createResortApplication = async (applicationData, user) => {
  const applicationsRef = ref(db, "resortApplications");
  const newApplicationRef = push(applicationsRef);
  const ownerId = user?.uid || "guest";
  const record = {
    ...applicationData,
    ownerId,
    ownerName: user?.displayName || "Guest",
    ownerEmail: user?.email || applicationData.email || "",
    status: "pending",
    createdAt: new Date().toISOString()
  };
  await set(newApplicationRef, record);

  if (ownerId && ownerId !== "guest") {
    const notificationRef = push(ref(db, `notifications/${ownerId}`));
    await set(notificationRef, {
      title: "Resort Application Submitted",
      message: `Your resort "${record.resortName || "Unnamed Resort"}" is now pending review.`,
      type: "application",
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  return newApplicationRef.key;
};

// Wallet functions
export const initializeWallet = async (userId) => {
  const walletRef = ref(db, `wallets/${userId}`);
  const initialBalance = 0; // Initial balance for new users
  await set(walletRef, {
    balance: initialBalance,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return initialBalance;
};

export const getWalletBalance = async (userId) => {
  const walletRef = ref(db, `wallets/${userId}`);
  const snapshot = await get(walletRef);
  if (snapshot.exists()) {
    return snapshot.val().balance;
  }
  // If wallet doesn't exist, initialize it
  return await initializeWallet(userId);
};

export const updateWalletBalance = async (userId, amount) => {
  const walletRef = ref(db, `wallets/${userId}`);
  const snapshot = await get(walletRef);
  const currentBalance = snapshot.exists() ? snapshot.val().balance : 0;
  const newBalance = currentBalance + amount;
  
  await update(walletRef, {
    balance: newBalance,
    updatedAt: new Date().toISOString()
  });
  
  return newBalance;
};

export const addWalletTransaction = async (userId, transaction) => {
  const transactionRef = ref(db, `walletTransactions/${userId}`);
  const newTransactionRef = push(transactionRef);
  await set(newTransactionRef, {
    ...transaction,
    createdAt: new Date().toISOString()
  });
  return newTransactionRef.key;
};

export const getWalletTransactions = async (userId) => {
  const transactionRef = ref(db, `walletTransactions/${userId}`);
  const snapshot = await get(transactionRef);
  if (snapshot.exists()) {
    const transactions = snapshot.val();
    return Object.entries(transactions).map(([id, data]) => ({ id, ...data }));
  }
  return [];
};

// Notification functions
export const createNotification = async (userId, notificationData) => {
  const notificationsRef = ref(db, `notifications/${userId}`);
  const newNotificationRef = push(notificationsRef);
  const notification = {
    ...notificationData,
    read: false,
    createdAt: new Date().toISOString()
  };
  await set(newNotificationRef, notification);
  return newNotificationRef.key;
};

export const getUserNotifications = async (userId) => {
  const notificationsRef = ref(db, `notifications/${userId}`);
  const snapshot = await get(notificationsRef);
  if (snapshot.exists()) {
    const notifications = snapshot.val();
    return Object.entries(notifications)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return [];
};

export const markNotificationAsRead = async (userId, notificationId) => {
  const notificationRef = ref(db, `notifications/${userId}/${notificationId}`);
  await update(notificationRef, { read: true });
};

export const markAllNotificationsAsRead = async (userId) => {
  const notificationsRef = ref(db, `notifications/${userId}`);
  const snapshot = await get(notificationsRef);
  if (snapshot.exists()) {
    const updates = {};
    Object.keys(snapshot.val()).forEach(id => {
      updates[`notifications/${userId}/${id}/read`] = true;
    });
    await update(ref(db), updates);
  }
};

export const deleteNotification = async (userId, notificationId) => {
  const notificationRef = ref(db, `notifications/${userId}/${notificationId}`);
  await remove(notificationRef);
};

export const onUserNotifications = (userId, callback) => {
  const notificationsRef = ref(db, `notifications/${userId}`);
  return onValue(notificationsRef, (snapshot) => {
    if (snapshot.exists()) {
      const notifications = snapshot.val();
      const parsed = Object.entries(notifications)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(parsed);
    } else {
      callback([]);
    }
  });
};

// P2P Payment Transfer
export const transferPayment = async (senderData, recipientData, amount) => {
  try {
    // Validate inputs
    if (!senderData.userId || !recipientData.userId) {
      throw new Error('Invalid sender or recipient data');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Check sender's balance
    const senderWalletRef = ref(db, `wallets/${senderData.userId}`);
    const senderSnapshot = await get(senderWalletRef);
    const senderBalance = senderSnapshot.exists() ? senderSnapshot.val().balance : 0;

    if (senderBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Deduct from sender
    await updateWalletBalance(senderData.userId, -amount);

    // Add to recipient
    await updateWalletBalance(recipientData.userId, amount);

    // Create transaction record for sender
    await addWalletTransaction(senderData.userId, {
      type: 'p2p_transfer_out',
      title: `Sent to ${recipientData.email}`,
      amount: -amount,
      recipient: recipientData.email,
      recipientId: recipientData.userId,
      status: 'completed'
    });

    // Create transaction record for recipient
    await addWalletTransaction(recipientData.userId, {
      type: 'p2p_transfer_in',
      title: `Received from ${senderData.email}`,
      amount: amount,
      sender: senderData.email,
      senderId: senderData.userId,
      status: 'completed'
    });

    return {
      success: true,
      message: 'Payment transferred successfully',
      newSenderBalance: senderBalance - amount
    };
  } catch (error) {
    console.error('Payment transfer error:', error);
    throw error;
  }
};

export default app;
