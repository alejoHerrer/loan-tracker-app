// Business Logic Layer - Lógica de negocio y cálculos

import { Socio, Cliente, Prestamo, Aportante, Pago, DistribucionPago, CalculoInteres, DistribucionPagoCalculada } from '../config/types.js';
import * as DataService from '../data/dataService.js';

// Cálculos de préstamos
export function calcularInteresAnticipado(monto: number, tasa: number): number {
    return (monto * tasa) / 100;
}

export function calcularMontoEntregado(montoAportado: number, interesAnticipado: number): number {
    return montoAportado - interesAnticipado;
}

export function calcularInteresAdeudado(saldoPendiente: number, tasaInteres: number): number {
    return (saldoPendiente * tasaInteres) / 100;
}

// Gestión de aportantes
export function crearAportante(socioId: string, montoAportado: number, tasaInteres: number): Aportante {
    const interesAnticipado = calcularInteresAnticipado(montoAportado, tasaInteres);
    return {
        id: `aportante_${Date.now()}_${Math.random()}`,
        socio_id: socioId,
        monto_aportado: montoAportado,
        tasa_interes: tasaInteres,
        interes_anticipado_su_parte: interesAnticipado,
        saldo_pendiente_su_parte: montoAportado
    };
}

export function validarAportantes(aportantes: Aportante[], montoTotal: number): { isValid: boolean; error?: string } {
    if (aportantes.length === 0) {
        return { isValid: false, error: 'Debe haber al menos un socio aportante' };
    }

    const totalAportado = aportantes.reduce((sum, a) => sum + a.monto_aportado, 0);
    const diferencia = Math.abs(montoTotal - totalAportado);

    if (diferencia > 0.01) {
        return { isValid: false, error: `La suma de aportes (${totalAportado}) no coincide con el monto total (${montoTotal})` };
    }

    // Verificar que no haya socios duplicados
    const socioIds = aportantes.map(a => a.socio_id);
    const duplicados = socioIds.filter((id, index) => socioIds.indexOf(id) !== index);
    if (duplicados.length > 0) {
        return { isValid: false, error: 'No puede haber socios duplicados en un préstamo' };
    }

    // Verificar que cada socio tenga suficiente dinero
    for (const aportante of aportantes) {
        const socio = DataService.getSocioById(aportante.socio_id);
        if (!socio || socio.dinero_en_caja < aportante.monto_aportado) {
            return { isValid: false, error: `${socio?.nombre || 'Socio'} no tiene suficiente dinero disponible` };
        }
    }

    return { isValid: true };
}

// Cálculos de pagos
export function calcularDistribucionPago(montoTotal: number, prestamo: Prestamo): {
    interesTotal: number;
    capitalTotal: number;
    distribucion: DistribucionPagoCalculada[];
} {
    let interesesPorSocio: CalculoInteres[] = [];
    let totalInteresAdeudado = 0;

    if (prestamo.aportantes && prestamo.aportantes.length > 0) {
        interesesPorSocio = prestamo.aportantes.map(a => {
            const socio = DataService.getSocioById(a.socio_id);
            const interesMensual = calcularInteresAdeudado(a.saldo_pendiente_su_parte, a.tasa_interes);
            totalInteresAdeudado += interesMensual;
            return {
                socio_id: a.socio_id,
                socio_nombre: socio ? socio.nombre : 'N/A',
                interes: interesMensual,
                tasa: a.tasa_interes,
                saldo: a.saldo_pendiente_su_parte,
                monto_aportado: a.monto_aportado
            };
        });
    } else if (prestamo.tasa_interes) {
        // Legacy support
        const interesMensual = calcularInteresAdeudado(prestamo.saldo_pendiente, prestamo.tasa_interes);
        totalInteresAdeudado = interesMensual;
        const socio = DataService.getSocioById(prestamo.socio_id || '');
        interesesPorSocio = [{
            socio_id: prestamo.socio_id || '',
            socio_nombre: socio ? socio.nombre : 'N/A',
            interes: interesMensual,
            tasa: prestamo.tasa_interes,
            saldo: prestamo.saldo_pendiente,
            monto_aportado: prestamo.monto_solicitado
        }];
    }

    // Distribuir pago
    const montoAInteres = Math.min(montoTotal, totalInteresAdeudado);
    const montoACapital = Math.max(0, montoTotal - totalInteresAdeudado);

    // Calcular total aporte original para proporciones
    const totalAporteOriginal = interesesPorSocio.reduce((sum, det) => sum + det.monto_aportado, 0);

    const distribucion = interesesPorSocio.map(det => {
        // Distribuir interés proporcionalmente
        const proporcionInteres = totalInteresAdeudado > 0 ? det.interes / totalInteresAdeudado : 0;
        const interesRecibe = montoAInteres * proporcionInteres;

        // Distribuir capital proporcionalmente según aporte original
        const proporcionCapital = totalAporteOriginal > 0 ? det.monto_aportado / totalAporteOriginal : 0;
        const capitalRecibe = montoACapital * proporcionCapital;

        return {
            socio_id: det.socio_id,
            socio_nombre: det.socio_nombre,
            interes_adeudado: det.interes,
            interes_recibe: interesRecibe,
            capital_recibe: capitalRecibe,
            saldo_nuevo: det.saldo - capitalRecibe,
            monto_aportado_original: det.monto_aportado
        };
    });

    return {
        interesTotal: montoAInteres,
        capitalTotal: montoACapital,
        distribucion: distribucion
    };
}

// Procesar pago
export function procesarPago(prestamo: Prestamo, montoTotal: number): {
    prestamoActualizado: Prestamo;
    distribucionPago: DistribucionPago[];
} {
    const calculo = calcularDistribucionPago(montoTotal, prestamo);

    // Actualizar saldos de aportantes
    if (prestamo.aportantes) {
        prestamo.aportantes.forEach((aportante, index) => {
            const dist = calculo.distribucion[index];
            aportante.saldo_pendiente_su_parte -= dist.capital_recibe;

            // Actualizar dinero en caja y ganancias del socio
            const socio = DataService.getSocioById(aportante.socio_id);
            if (socio) {
                socio.dinero_en_caja += (dist.interes_recibe + dist.capital_recibe);
                socio.ganancia_total += dist.interes_recibe;
            }
        });
    }

    // Actualizar saldo pendiente total
    prestamo.saldo_pendiente -= calculo.capitalTotal;

    // Crear registro de distribución
    const distribucionPago: DistribucionPago[] = calculo.distribucion.map(dist => ({
        socio_id: dist.socio_id,
        interes_su_parte: dist.interes_recibe,
        capital_su_parte: dist.capital_recibe,
        saldo_pendiente_actualizado: dist.saldo_nuevo
    }));

    // Registrar pago en historial
    const pago: Pago = {
        fecha: new Date().toISOString(),
        monto_total_pagado: montoTotal,
        interes_pagado_total: calculo.interesTotal,
        capital_pagado_total: calculo.capitalTotal,
        distribucion_por_socio: distribucionPago
    };

    prestamo.historial_pagos.push(pago);

    // Verificar si el préstamo está pagado
    if (prestamo.saldo_pendiente <= 0.01) {
        prestamo.estado = 'pagado';
        prestamo.saldo_pendiente = 0;
        if (prestamo.aportantes) {
            prestamo.aportantes.forEach(a => a.saldo_pendiente_su_parte = 0);
        }
    }

    return {
        prestamoActualizado: prestamo,
        distribucionPago: distribucionPago
    };
}

// Cálculos de reportes
export function calcularGananciasMensuales(socioId: string, year: number, month: number): number {
    const prestamos = DataService.getAllPrestamos();
    let gananciasMes = 0;

    prestamos.forEach(p => {
        const monthlyPayments = (p.historial_pagos || []).filter(pago => {
            const pagoDate = new Date(pago.fecha);
            return pagoDate.getMonth() === (month - 1) && pagoDate.getFullYear() === year;
        });

        monthlyPayments.forEach(pago => {
            if (pago.distribucion_por_socio) {
                // Nueva estructura
                const dist = pago.distribucion_por_socio.find(d => d.socio_id === socioId);
                if (dist) {
                    gananciasMes += dist.interes_su_parte;
                }
            } else if (p.socio_id === socioId) {
                // Legacy
                gananciasMes += (pago.monto_interes || 0);
            }
        });
    });

    return gananciasMes;
}

export function calcularAportesMensuales(socioId: string, year: number, month: number): number {
    const socio = DataService.getSocioById(socioId);
    if (!socio) return 0;

    return socio.historial_aportes
        .filter(aporte => {
            const aporteDate = new Date(aporte.fecha);
            return aporteDate.getMonth() === (month - 1) && aporteDate.getFullYear() === year;
        })
        .reduce((sum, a) => sum + a.monto, 0);
}

export function calcularTotalPrestadoPorSocio(socioId: string): number {
    const prestamos = DataService.getAllPrestamos();
    let totalPrestado = 0;

    prestamos.forEach(p => {
        if (p.estado === 'activo') {
            if (p.aportantes && p.aportantes.length > 0) {
                // Nueva estructura
                const aportante = p.aportantes.find(a => a.socio_id === socioId);
                if (aportante) {
                    totalPrestado += aportante.monto_aportado;
                }
            } else if (p.socio_id === socioId) {
                // Legacy
                totalPrestado += p.monto_solicitado;
            }
        }
    });

    return totalPrestado;
}

// Validaciones
export function validarMontoAporte(socioId: string, monto: number): { isValid: boolean; error?: string } {
    const socio = DataService.getSocioById(socioId);
    if (!socio) {
        return { isValid: false, error: 'Socio no encontrado' };
    }

    if (monto <= 0) {
        return { isValid: false, error: 'El monto debe ser mayor a cero' };
    }

    if (socio.dinero_en_caja < monto) {
        return { isValid: false, error: 'El socio no tiene suficiente dinero disponible' };
    }

    return { isValid: true };
}

export function validarTasaInteres(tasa: number): { isValid: boolean; error?: string } {
    if (tasa < 0) {
        return { isValid: false, error: 'La tasa de interés no puede ser negativa' };
    }

    if (tasa > 100) {
        return { isValid: false, error: 'La tasa de interés no puede ser mayor al 100%' };
    }

    return { isValid: true };
}