// Interfaces para el sistema de gestión de préstamos

export interface Socio {
  id: string;
  nombre: string;
  capital_aportado: number;
  dinero_en_caja: number;
  ganancia_total: number;
  historial_aportes: Aporte[];
}

export interface Aporte {
  fecha: string;
  monto: number;
  descripcion: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  email?: string;
  direccion?: string;
  persona_recomendacion?: string;
  fecha_registro: string;
}

export interface Aportante {
  id?: string;
  socio_id: string;
  monto_aportado: number;
  tasa_interes: number;
  interes_anticipado_su_parte: number;
  saldo_pendiente_su_parte: number;
  interes_adeudado_mes_su_parte?: number;
}

export interface Prestamo {
  id: string;
  cliente_id: string;
  aportantes?: Aportante[];
  socio_id?: string; // Para compatibilidad con versiones anteriores
  tasa_interes?: number; // Para compatibilidad con versiones anteriores
  interes_anticipado?: number; // Para compatibilidad con versiones anteriores
  monto_solicitado: number;
  plazo_valor: number;
  plazo_unidad: 'dias' | 'meses' | 'años';
  fecha_inicio: string;
  fecha_vencimiento: string;
  monto_entregado: number;
  interes_anticipado_total: number;
  saldo_pendiente: number;
  estado: 'activo' | 'pagado' | 'vencido';
  foto_pagare?: string;
  historial_pagos: Pago[];
}

export interface Pago {
  fecha: string;
  monto_total_pagado?: number;
  total_pagado?: number; // Para compatibilidad
  interes_pagado_total?: number;
  capital_pagado_total?: number;
  monto_interes?: number; // Para compatibilidad
  monto_capital?: number; // Para compatibilidad
  saldo_restante_actualizado?: number; // Para compatibilidad
  distribucion_por_socio?: DistribucionPago[];
}

export interface DistribucionPago {
  socio_id: string;
  interes_su_parte: number;
  capital_su_parte: number;
  saldo_pendiente_actualizado?: number;
}

export interface AppData {
  socios: Socio[];
  clientes: Cliente[];
  prestamos: Prestamo[];
}

// Tipos para formularios
export interface SocioFormData {
  nombre: string;
  capital_aportado: number;
}

export interface ClienteFormData {
  nombre: string;
  cedula: string;
  telefono: string;
  email?: string;
  direccion?: string;
  persona_recomendacion?: string;
}

export interface PrestamoFormData {
  cliente_id: string;
  monto_solicitado: number;
  plazo_valor: number;
  plazo_unidad: string;
  fecha_inicio: string;
}

export interface PagoFormData {
  monto_total: number;
}

export interface ReporteFormData {
  socio_id: string;
  mes: string;
}

// Tipos para cálculos
export interface CalculoInteres {
  socio_id: string;
  socio_nombre: string;
  interes: number;
  tasa: number;
  saldo: number;
  monto_aportado: number;
}

export interface DistribucionPagoCalculada {
  socio_id: string;
  socio_nombre: string;
  interes_adeudado: number;
  interes_recibe: number;
  capital_recibe: number;
  saldo_nuevo: number;
  monto_aportado_original: number;
}

// Tipos para filtros
export interface FiltrosPrestamo {
  estado?: string;
  socio?: string;
}

// Tipos para vistas
export type ViewName = 'dashboard' | 'socios' | 'clientes' | 'prestamos' | 'reportes';

// Funciones de utilidad
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function calculateEndDate(startDate: string, plazo_valor: number, plazo_unidad: string): string {
  const date = new Date(startDate);
  switch(plazo_unidad) {
    case 'dias':
      date.setDate(date.getDate() + parseInt(plazo_valor.toString()));
      break;
    case 'meses':
      date.setMonth(date.getMonth() + parseInt(plazo_valor.toString()));
      break;
    case 'años':
      date.setFullYear(date.getFullYear() + parseInt(plazo_valor.toString()));
      break;
  }
  return date.toISOString().split('T')[0];
}
