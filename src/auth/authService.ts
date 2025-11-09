// Servicio de autenticación con Firebase Auth
import { getAuth, sendSignInLinkToEmail, signInWithEmailLink, isSignInWithEmailLink, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../config/firebase";

// Configuración para el enlace de inicio de sesión por email
const actionCodeSettings = {
  url: window.location.origin + '/login', // URL donde se redirigirá después del clic en el enlace
  handleCodeInApp: true, // Indica que el enlace se manejará dentro de la app
};

// Estado de autenticación
let currentUser: User | null = null;

// Función para enviar enlace de inicio de sesión por email
export async function sendSignInLink(email: string): Promise<void> {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Guardar el email en localStorage para completar el inicio de sesión
    window.localStorage.setItem('emailForSignIn', email);
    console.log('Enlace de inicio de sesión enviado a:', email);
  } catch (error) {
    console.error('Error al enviar enlace de inicio de sesión:', error);
    throw error;
  }
}

// Función para completar el inicio de sesión con el enlace de email
export async function signInWithLink(email: string, emailLink: string): Promise<User> {
  try {
    const result = await signInWithEmailLink(auth, email, emailLink);
    // Limpiar el email de localStorage
    window.localStorage.removeItem('emailForSignIn');
    console.log('Usuario autenticado:', result.user);
    return result.user;
  } catch (error) {
    console.error('Error al iniciar sesión con enlace:', error);
    throw error;
  }
}

// Función para verificar si la URL actual contiene un enlace de inicio de sesión
export function isSignInLink(url: string): boolean {
  return isSignInWithEmailLink(auth, url);
}

// Función para obtener el email guardado en localStorage
export function getEmailForSignIn(): string | null {
  return window.localStorage.getItem('emailForSignIn');
}

// Función para cerrar sesión
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
    console.log('Usuario cerró sesión');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
}

// Función para obtener el usuario actual
export function getCurrentUser(): User | null {
  return currentUser;
}

// Listener para cambios en el estado de autenticación
export function onAuthStateChange(callback: (user: User | null) => void): void {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

// Función para verificar si el usuario está autenticado
export function isAuthenticated(): boolean {
  return currentUser !== null;
}