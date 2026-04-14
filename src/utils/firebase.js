// ============================================
// FIREBASE — Phone Auth Configuration
// ============================================
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB3FABckQq7I2dyZCqDxbjMwWEUAM-1AzQ",
  authDomain: "eptomart-a4cd6.firebaseapp.com",
  projectId: "eptomart-a4cd6",
  appId: "80046580596:web:4833c7e7c7b8ee17b30221",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
