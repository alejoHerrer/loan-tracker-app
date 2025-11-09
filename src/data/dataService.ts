// Data Service Layer - Manejo de almacenamiento y persistencia de datos

import { AppData, Socio, Cliente, Prestamo } from '../config/types';

// Almacenamiento de datos en memoria (simula base de datos)
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
export function getAppData(): AppData {
    return appData;
}

export function loadData(): void {
    // Data is stored in memory only (no localStorage due to sandbox restrictions)
    if (!appData.socios.length) {
        appData = {
            socios: [],
            clientes: [],
            prestamos: []
        };
    }
}

export function saveData(): void {
    // Data persists in memory during session
    console.log('Data saved in memory');
}

// Inicialización de datos por defecto
export function initializeDefaultSocios(): void {
    if (appData.socios.length === 0) {
        appData.socios = [
            {
                id: generateId(),
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
                id: generateId(),
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
                id: generateId(),
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
                id: generateId(),
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
        saveData();
    }
}

export function initializeDefaultCliente(): void {
    if (appData.clientes.length === 0) {
        appData.clientes = [
            {
                id: generateId(),
                nombre: 'Juan Pérez',
                cedula: '1234567890',
                telefono: '3001234567',
                email: 'juan.perez@email.com',
                direccion: 'Calle 123 #45-67',
                persona_recomendacion: 'Pedro García',
                fecha_registro: new Date().toISOString()
            }
        ];
        saveData();
    }
}

// Operaciones CRUD para Socios
export function createSocio(socioData: Omit<Socio, 'id' | 'dinero_en_caja' | 'ganancia_total' | 'historial_aportes'>): Socio {
    const newSocio: Socio = {
        id: generateId(),
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
    appData.socios.push(newSocio);
    saveData();
    return newSocio;
}

export function updateSocio(socioId: string, socioData: Partial<Socio>): Socio | null {
    const socio = appData.socios.find(s => s.id === socioId);
    if (socio) {
        Object.assign(socio, socioData);
        saveData();
        return socio;
    }
    return null;
}

export function getSocioById(socioId: string): Socio | undefined {
    return appData.socios.find(s => s.id === socioId);
}

export function getAllSocios(): Socio[] {
    return appData.socios;
}

// Operaciones CRUD para Clientes
export function createCliente(clienteData: Omit<Cliente, 'id' | 'fecha_registro'>): Cliente {
    const newCliente: Cliente = {
        id: generateId(),
        ...clienteData,
        fecha_registro: new Date().toISOString()
    };
    appData.clientes.push(newCliente);
    saveData();
    return newCliente;
}

export function updateCliente(clienteId: string, clienteData: Partial<Cliente>): Cliente | null {
    const cliente = appData.clientes.find(c => c.id === clienteId);
    if (cliente) {
        Object.assign(cliente, clienteData);
        saveData();
        return cliente;
    }
    return null;
}

export function getClienteById(clienteId: string): Cliente | undefined {
    return appData.clientes.find(c => c.id === clienteId);
}

export function getAllClientes(): Cliente[] {
    return appData.clientes;
}

// Operaciones CRUD para Préstamos
export function createPrestamo(prestamoData: Omit<Prestamo, 'id'>): Prestamo {
    const newPrestamo: Prestamo = {
        id: generateId(),
        ...prestamoData
    };
    appData.prestamos.push(newPrestamo);
    saveData();
    return newPrestamo;
}

export function updatePrestamo(prestamoId: string, prestamoData: Partial<Prestamo>): Prestamo | null {
    const prestamo = appData.prestamos.find(p => p.id === prestamoId);
    if (prestamo) {
        Object.assign(prestamo, prestamoData);
        saveData();
        return prestamo;
    }
    return null;
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