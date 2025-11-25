// import admin from "firebase-admin";
// import dotenv from "dotenv";

// dotenv.config();

// const {
//   FIREBASE_PROJECT_ID,
//   FIREBASE_PRIVATE_KEY,
//   FIREBASE_CLIENT_EMAIL,
// } = process.env;

// const hasFirebaseConfig =
//   typeof FIREBASE_PROJECT_ID === "string" && FIREBASE_PROJECT_ID.trim() !== "" &&
//   typeof FIREBASE_PRIVATE_KEY === "string" && FIREBASE_PRIVATE_KEY.trim() !== "" &&
//   typeof FIREBASE_CLIENT_EMAIL === "string" && FIREBASE_CLIENT_EMAIL.trim() !== "";

// if (hasFirebaseConfig) {
//   const serviceAccount = {
//     type: "service_account",
//     project_id: FIREBASE_PROJECT_ID,
//     private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
//     client_email: FIREBASE_CLIENT_EMAIL,
//   };

//   if (!admin.apps.length) {
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),
//     });
//   }
// } else {
//   console.warn(
//     "Firebase admin not initialized: missing FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL env vars. Push notifications will be disabled until these are set."
//   );
// }

// export default admin;

