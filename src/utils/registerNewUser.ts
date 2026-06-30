// src/utils/registerNewUser.ts
// TypeScript (Firebase v9 modular)
// Adds an Auth user and a linked Firestore profile document.
// Adjust import path to firebase-config if you place this file elsewhere.

import { createUserWithEmailAndPassword, deleteUser, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase-config"; // path: src/firebase-config.ts

export async function registerNewUser(
  email: string,
  password: string,
  fullName: string,
  phoneNumber?: string
): Promise<User> {
  try {
    // 1. Create the Auth account (this signs in the new user)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Create the Firestore Profile Document (linked by UID)
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: fullName,
        email,
        phoneNumber: phoneNumber ?? "",
        role: "customer", // default role
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        status: "active"
      });
    } catch (profileError) {
      // If profile creation fails, attempt to delete the auth user to avoid orphaned accounts
      try {
        await deleteUser(user);
        console.warn("Auth user deleted after profile creation failure:", user.uid);
      } catch (deleteErr) {
        console.error("Failed to delete auth user after profile error:", deleteErr);
      }
      throw profileError;
    }

    console.log("✅ User registered and profile created:", user.uid);
    return user;
  } catch (error: any) {
    console.error("❌ Registration Error:", error?.message ?? error);
    throw error;
  }
}

/*
Usage example:
import { registerNewUser } from 'src/utils/registerNewUser';

try {
  const user = await registerNewUser('jane@example.com', 'secret123!', 'Jane Doe', '+1234567890');
  // navigate or show success UI
} catch (err) {
  // show friendly error to user
}
*/
