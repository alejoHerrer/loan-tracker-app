// Data Service Layer - Manejo de almacenamiento y persistencia de datos

import { AppData, Socio, Cliente, Prestamo } from '../config/types';
import { db } from '../config/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';

// Almacenamiento de datos en memoria para cache local
let appData: AppData = {
    socios: [],
    clientes: [],
    prestamos: []
};

// Funciones de utilidad
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Gestión de datos
export async function getAppData(): Promise<AppData> {
    await loadData();
    return appData;
}

export async function loadData(): Promise<void> {
    try {
        // Load data from Firestore using loanDev collection
        const [sociosSnapshot, clientesSnapshot, prestamosSnapshot] = await Promise.all([
            getDocs(collection(db, 'socios')),
            getDocs(collection(db, 'clientes')),
            getDocs(collection(db, 'prestamos'))
        ]);

        appData.socios = sociosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Socio));
        appData.clientes = clientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
        appData.prestamos = prestamosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prestamo));

        console.log('Data loaded from Firestore (loanDev collection)');
    } catch (error) {
        console.error('Error loading data from Firestore:', error);
        // Fallback to memory if Firestore fails
        if (!appData.socios.length) {
            appData = {
                socios: [],
                clientes: [],
                prestamos: []
            };
        }
    }
}

export async function saveData(): Promise<void> {
    // Data is automatically saved to Firestore through CRUD operations
    // This function is kept for backward compatibility but doesn't do anything
}

// Inicialización de datos por defecto
export async function initializeDefaultSocios(): Promise<void> {
    if (appData.socios.length === 0) {
        const defaultSocios = [
            {
                nombre: 'Emilcia',
                capital_aportado: 500000,
                dinero_en_caja: 500000,
                ganancia_total: 0,
                historial_aportes: [
                    {
                        fecha: new Date().toISOString(),
                        monto: 500000,
                        descripcion: 'Capital inicial'
                    }
                ]
            },
            {
                nombre: 'Alejo',
                capital_aportado: 1000000,
                dinero_en_caja: 1000000,
                ganancia_total: 0,
                historial_aportes: [
                    {
                        fecha: new Date().toISOString(),
                        monto: 1000000,
                        descripcion: 'Capital inicial'
                    }
                ]
            },
            {
                nombre: 'Carlos',
                capital_aportado: 300000,
                dinero_en_caja: 300000,
                ganancia_total: 0,
                historial_aportes: [
                    {
                        fecha: new Date().toISOString(),
                        monto: 300000,
                        descripcion: 'Capital inicial'
                    }
                ]
            },
            {
                nombre: 'María',
                capital_aportado: 400000,
                dinero_en_caja: 400000,
                ganancia_total: 0,
                historial_aportes: [
                    {
                        fecha: new Date().toISOString(),
                        monto: 400000,
                        descripcion: 'Capital inicial'
                    }
                ]
            }
        ];

        try {
            for (const socioData of defaultSocios) {
                await addDoc(collection(db, 'socios'), socioData);
            }
            await loadData(); // Reload data after adding defaults
        } catch (error) {
            console.error('Error initializing default socios:', error);
        }
    }
}

export async function initializeDefaultCliente(): Promise<void> {
    if (appData.clientes.length === 0) {
        const defaultCliente = {
            nombre: 'Juan Pérez',
            cedula: '1234567890',
            telefono: '3001234567',
            email: 'juan.perez@email.com',
            direccion: 'Calle 123 #45-67',
            persona_recomendacion: 'Pedro García',
            fecha_registro: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, 'clientes'), defaultCliente);
            await loadData(); // Reload data after adding defaults
        } catch (error) {
            console.error('Error initializing default cliente:', error);
        }
    }
}

// Operaciones CRUD para Socios
export async function createSocio(socioData: Omit<Socio, 'id' | 'dinero_en_caja' | 'ganancia_total' | 'historial_aportes'>): Promise<Socio> {
    const newSocioData = {
        ...socioData,
        dinero_en_caja: socioData.capital_aportado,
        ganancia_total: 0,
        historial_aportes: [
            {
                fecha: new Date().toISOString(),
                monto: socioData.capital_aportado,
                descripcion: 'Capital inicial'
            }
        ]
    };

    const docRef = await addDoc(collection(db, 'socios'), newSocioData);
    const newSocio: Socio = { id: docRef.id, ...newSocioData };

    // Update local cache
    appData.socios.push(newSocio);
    return newSocio;
}

export async function updateSocio(socioId: string, socioData: Partial<Socio>): Promise<Socio | null> {
    try {
        await updateDoc(doc(db, 'socios', socioId), socioData);

        // Update local cache
        const socio = appData.socios.find(s => s.id === socioId);
        if (socio) {
            Object.assign(socio, socioData);
            return socio;
        }
        return null;
    } catch (error) {
        console.error('Error updating socio:', error);
        return null;
    }
}

export function getSocioById(socioId: string): Socio | undefined {
    return appData.socios.find(s => s.id === socioId);
}

export function getAllSocios(): Socio[] {
    return appData.socios;
}

// Operaciones CRUD para Clientes
export async function createCliente(clienteData: Omit<Cliente, 'id' | 'fecha_registro'>): Promise<Cliente> {
    const newClienteData = {
        ...clienteData,
        fecha_registro: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'clientes'), newClienteData);
    const newCliente: Cliente = { id: docRef.id, ...newClienteData };

    // Update local cache
    appData.clientes.push(newCliente);
    return newCliente;
}

export async function updateCliente(clienteId: string, clienteData: Partial<Cliente>): Promise<Cliente | null> {
    try {
        await updateDoc(doc(db, 'clientes', clienteId), clienteData);

        // Update local cache
        const cliente = appData.clientes.find(c => c.id === clienteId);
        if (cliente) {
            Object.assign(cliente, clienteData);
            return cliente;
        }
        return null;
    } catch (error) {
        console.error('Error updating cliente:', error);
        return null;
    }
}

export function getClienteById(clienteId: string): Cliente | undefined {
    return appData.clientes.find(c => c.id === clienteId);
}

export function getAllClientes(): Cliente[] {
    return appData.clientes;
}

// Operaciones CRUD para Préstamos
export async function createPrestamo(prestamoData: Omit<Prestamo, 'id'>): Promise<Prestamo> {
    const docRef = await addDoc(collection(db, 'prestamos'), prestamoData);
    const newPrestamo: Prestamo = { id: docRef.id, ...prestamoData };

    // Update local cache
    appData.prestamos.push(newPrestamo);
    return newPrestamo;
}

export async function updatePrestamo(prestamoId: string, prestamoData: Partial<Prestamo>): Promise<Prestamo | null> {
    try {
        await updateDoc(doc(db, 'prestamos', prestamoId), prestamoData);

        // Update local cache
        const prestamo = appData.prestamos.find(p => p.id === prestamoId);
        if (prestamo) {
            Object.assign(prestamo, prestamoData);
            return prestamo;
        }
        return null;
    } catch (error) {
        console.error('Error updating prestamo:', error);
        return null;
    }
}

export function getPrestamoById(prestamoId: string): Prestamo | undefined {
    return appData.prestamos.find(p => p.id === prestamoId);
}

export function getAllPrestamos(): Prestamo[] {
    return appData.prestamos;
}

// Funciones de utilidad para cálculos
export function getTotalEnCaja(): number {
    return appData.socios.reduce((sum, s) => sum + s.dinero_en_caja, 0);
}

export function getTotalPrestado(): number {
    return appData.prestamos
        .filter(p => p.estado === 'activo')
        .reduce((sum, p) => {
            if (p.aportantes && p.aportantes.length > 0) {
                return sum + p.aportantes.reduce((aportesSum, a) => aportesSum + a.monto_aportado, 0);
            } else {
                return sum + p.monto_solicitado;
            }
        }, 0);
}

export function getPrestamosActivos(): Prestamo[] {
    return appData.prestamos.filter(p => p.estado === 'activo');
}