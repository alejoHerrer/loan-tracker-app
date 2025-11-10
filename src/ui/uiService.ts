
// UI Service Layer - Manejo de la interfaz de usuario y renderizado

import { ViewName, Socio, Cliente, Prestamo, Aportante, Pago, DistribucionPago, CalculoInteres, formatCurrency, formatDate, calculateEndDate } from '../config/types';
import * as DataService from '../data/dataService';
import * as BusinessLogic from '../business/businessLogic';

// Variables globales para estado de UI
let aportantesData: Aportante[] = [];

// Función para obtener los datos de aportantes
export function getAportantesData(): Aportante[] {
    return aportantesData;
}

// Utilidades de UI
export function closeModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

export function previewImage(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('image-preview') as HTMLImageElement;
            preview.src = e.target!.result as string;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

export function formatCurrencyInput(input: HTMLInputElement): void {
    // Get the current value and clean it to only allow numbers
    let value = input.value;

    // Remove any non-numeric characters
    const cleanValue = value.replace(/[^\d]/g, '');

    // Store the raw numeric value
    input.dataset.rawValue = cleanValue;

    // Only format if we have a valid number
    if (cleanValue && !isNaN(parseFloat(cleanValue))) {
        const numericValue = parseFloat(cleanValue);

        // Format as Colombian Peso for display
        const formatted = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numericValue);

        // Update display value
        input.value = formatted;
    } else {
        // If empty, just clear the input
        input.value = '';
    }
}

// Renderizado de vistas principales
export function renderDashboard(): string {
    // Calcular total prestado
    const totalPrestado = DataService.getTotalPrestado();

    const totalEnCaja = DataService.getTotalEnCaja();

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const gananciasMes = DataService.getAllPrestamos().reduce((sum, p) => {
        const monthlyPayments = (p.historial_pagos || []).filter(pago => {
            const pagoDate = new Date(pago.fecha);
            return pagoDate.getMonth() === currentMonth && pagoDate.getFullYear() === currentYear;
        });
        return sum + monthlyPayments.reduce((s, pago) => s + (pago.interes_pagado_total || pago.monto_interes || 0), 0);
    }, 0);

    const prestamosActivos = DataService.getPrestamosActivos().length;

    // Mostrar socios únicos activos
    let sociosUnicos = new Set<string>();
    DataService.getPrestamosActivos()
        .filter(p => p.aportantes && p.aportantes.length)
        .forEach(p => {
            p.aportantes!.forEach(a => sociosUnicos.add(a.socio_id));
        });
    const sociosEnPrestamos = sociosUnicos.size;

    return `
        <div class="page-header">
            <h2 class="page-title">Dashboard</h2>
            <p class="page-subtitle">Vista general del sistema de préstamos</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Prestado</div>
                <div class="stat-value currency">${formatCurrency(totalPrestado)}
                ${sociosEnPrestamos > 0 ? `<span class="info-badge">Socios activos: ${sociosEnPrestamos}</span>` : ''}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">En Caja Disponible</div>
                <div class="stat-value success currency">${formatCurrency(totalEnCaja)}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Ganancias Este Mes</div>
                <div class="stat-value success currency">${formatCurrency(gananciasMes)}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">Préstamos Activos</div>
                <div class="stat-value">${prestamosActivos}</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Acceso Rápido</h3>
            </div>
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="renderView('prestamos')">Nuevo Préstamo</button>
                <button class="btn btn-secondary" onclick="renderView('clientes')">Nuevo Cliente</button>
                <button class="btn btn-secondary" onclick="renderView('socios')">Gestionar Socios</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Préstamos Recientes</h3>
            </div>
            ${renderRecentLoans()}
        </div>
    `;
}

export function renderRecentLoans(): string {
    const recentLoans = DataService.getAllPrestamos().slice(-5).reverse();

    if (recentLoans.length === 0) {
        return '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No hay préstamos registrados</p></div>';
    }

    return `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Socios</th>
                        <th>Monto</th>
                        <th>Saldo Pendiente</th>
                        <th>Fecha Inicio</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentLoans.map(loan => {
                        const cliente = DataService.getClienteById(loan.cliente_id);
                        let sociosText = 'N/A';
                        if (loan.aportantes && loan.aportantes!.length > 0) {
                            if (loan.aportantes.length === 1) {
                                const socio = DataService.getSocioById(loan.aportantes[0].socio_id);
                                sociosText = socio ? socio.nombre : 'N/A';
                            } else {
                                sociosText = `${loan.aportantes.length} socios`;
                            }
                        } else if (loan.socio_id) {
                            sociosText = DataService.getSocioById(loan.socio_id)?.nombre || 'N/A';
                        }
                        return `
                            <tr>
                                <td>${cliente ? cliente.nombre : 'N/A'}</td>
                                <td>${sociosText}</td>
                                <td class="currency">${formatCurrency(loan.monto_solicitado)}</td>
                                <td class="currency">${formatCurrency(loan.saldo_pendiente)}</td>
                                <td>${formatDate(loan.fecha_inicio)}</td>
                                <td><span class="badge badge-${loan.estado === 'activo' ? 'success' : loan.estado === 'pagado' ? 'info' : 'error'}">${loan.estado}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Renderizado de Socios
export function renderSocios(): string {
    return `
        <div class="page-header">
            <h2 class="page-title">Socios/Inversores</h2>
            <p class="page-subtitle">Gestión de socios e inversores</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Lista de Socios</h3>
                <button class="btn btn-primary" onclick="openSocioModal()">+ Nuevo Socio</button>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Capital Aportado</th>
                            <th>Dinero en Caja</th>
                            <th>Ganancia Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${DataService.getAllSocios().map(socio => `
                            <tr>
                                <td>${socio.nombre}</td>
                                <td class="currency">${formatCurrency(socio.capital_aportado)}</td>
                                <td class="currency">${formatCurrency(socio.dinero_en_caja)}</td>
                                <td class="currency success">${formatCurrency(socio.ganancia_total)}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn" onclick="openAporteModal('${socio.id}')" title="Agregar aporte">💰</button>
                                        <button class="icon-btn" onclick="editSocio('${socio.id}')" title="Editar">✏️</button>
                                        <button class="icon-btn" onclick="deleteSocio('${socio.id}')" title="Eliminar" style="color: var(--color-error);">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function openSocioModal(socioId: string | null = null): void {
    const socio = socioId ? DataService.getSocioById(socioId) : null;
    const isEdit = !!socio;

    const modalHTML = `
        <div class="modal active" id="socio-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} Socio</h3>
                    <button class="modal-close" onclick="closeModal('socio-modal')">&times;</button>
                </div>
                <form id="socio-form" onsubmit="saveSocio(event, '${socioId || ''}')">
                    <div class="form-group">
                        <label class="form-label">Nombre</label>
                        <input type="text" class="form-control" name="nombre" value="${socio ? socio.nombre : ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Capital Inicial</label>
                        <input type="text" class="form-control" name="capital_aportado" placeholder="Ej: 1000000" value="${socio ? socio.capital_aportado : ''}" required oninput="formatCurrencyInput(this)">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('socio-modal')">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-container')!.innerHTML = modalHTML;
}

export function openAporteModal(socioId: string): void {
    const socio = DataService.getSocioById(socioId);

    const modalHTML = `
        <div class="modal active" id="aporte-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Agregar Aporte - ${socio?.nombre}</h3>
                    <button class="modal-close" onclick="closeModal('aporte-modal')">&times;</button>
                </div>
                <form id="aporte-form" onsubmit="saveAporte(event, '${socioId}')">
                    <div class="form-group">
                        <label class="form-label">Monto del Aporte</label>
                        <input type="text" class="form-control" name="monto" placeholder="Ej: 50000" required oninput="formatCurrencyInput(this)">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <input type="text" class="form-control" name="descripcion" placeholder="Ej: Aporte mensual" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('aporte-modal')">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Agregar Aporte</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-container')!.innerHTML = modalHTML;
}

// Renderizado de Clientes
export function renderClientes(): string {
    const clientes = DataService.getAllClientes();
    return `
        <div class="page-header">
            <h2 class="page-title">Clientes</h2>
            <p class="page-subtitle">Gestión de clientes prestatarios</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Lista de Clientes</h3>
                <button class="btn btn-primary" onclick="openClienteModal()">+ Nuevo Cliente</button>
            </div>
            ${clientes.length === 0 ?
                '<div class="empty-state"><div class="empty-state-icon">👤</div><p>No hay clientes registrados</p></div>' :
                `<div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Cédula</th>
                                <th>Teléfono</th>
                                <th>Email</th>
                                <th>Recomendado por</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clientes.map(cliente => `
                                <tr>
                                    <td>${cliente.nombre}</td>
                                    <td>${cliente.cedula}</td>
                                    <td>${cliente.telefono}</td>
                                    <td>${cliente.email || 'N/A'}</td>
                                    <td>${cliente.persona_recomendacion || 'N/A'}</td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="icon-btn" onclick="editCliente('${cliente.id}')" title="Editar">✏️</button>
                                            <button class="icon-btn" onclick="viewClienteLoans('${cliente.id}')" title="Ver préstamos">📋</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`
            }
        </div>
    `;
}

export function openClienteModal(clienteId: string | null = null): void {
    const cliente = clienteId ? DataService.getClienteById(clienteId) : null;
    const isEdit = !!cliente;

    const modalHTML = `
        <div class="modal active" id="cliente-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? 'Editar' : 'Nuevo'} Cliente</h3>
                    <button class="modal-close" onclick="closeModal('cliente-modal')">&times;</button>
                </div>
                <form id="cliente-form" onsubmit="saveCliente(event, '${clienteId || ''}')">
                    <div class="form-group">
                        <label class="form-label">Nombre Completo</label>
                        <input type="text" class="form-control" name="nombre" value="${cliente ? cliente.nombre : ''}" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Cédula</label>
                            <input type="text" class="form-control" name="cedula" value="${cliente ? cliente.cedula : ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Teléfono</label>
                            <input type="tel" class="form-control" name="telefono" value="${cliente ? cliente.telefono : ''}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" name="email" value="${cliente ? cliente.email : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dirección</label>
                        <input type="text" class="form-control" name="direccion" value="${cliente ? cliente.direccion : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Persona que lo Recomendó</label>
                        <input type="text" class="form-control" name="persona_recomendacion" value="${cliente ? cliente.persona_recomendacion : ''}">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('cliente-modal')">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-container')!.innerHTML = modalHTML;
}

export function viewClienteLoans(clienteId: string): void {
    const cliente = DataService.getClienteById(clienteId);
    const loans = DataService.getAllPrestamos().filter(p => p.cliente_id === clienteId);

    const modalHTML = `
        <div class="modal active" id="cliente-loans-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Préstamos de ${cliente?.nombre}</h3>
                    <button class="modal-close" onclick="closeModal('cliente-loans-modal')">&times;</button>
                </div>
                ${loans.length === 0 ?
                    '<div class="empty-state"><p>Este cliente no tiene préstamos registrados</p></div>' :
                    `<div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Monto</th>
                                    <th>Saldo</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${loans.map(loan => `
                                    <tr>
                                        <td class="currency">${formatCurrency(loan.monto_solicitado)}</td>
                                        <td class="currency">${formatCurrency(loan.saldo_pendiente)}</td>
                                        <td>${formatDate(loan.fecha_inicio)}</td>
                                        <td><span class="badge badge-${loan.estado === 'activo' ? 'success' : 'info'}">${loan.estado}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
            </div>
        </div>
    `;

    document.getElementById('modal-container')!.innerHTML = modalHTML;
}

// Renderizado de Préstamos
export function renderPrestamos(): string {
    const clientes = DataService.getAllClientes();
    const socios = DataService.getAllSocios();

    if (clientes.length === 0 || socios.length === 0) {
        return `
            <div class="page-header">
                <h2 class="page-title">Préstamos</h2>
                <p class="page-subtitle">Gestión de préstamos y pagos</p>
            </div>
            <div class="card">
                <div class="empty-state">
                    <p>Necesitas al menos un cliente y un socio para crear un préstamo</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="page-header">
            <h2 class="page-title">Préstamos</h2>
            <p class="page-subtitle">Gestión de préstamos y pagos</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Crear Nuevo Préstamo</h3>
            </div>
            ${renderPrestamoForm()}
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Lista de Préstamos</h3>
            </div>
            <div class="filter-bar">
                <div class="form-group">
                    <select class="form-control" id="filter-estado" onchange="filterPrestamos()">
                        <option value="">Todos los estados</option>
                        <option value="activo">Activo</option>
                        <option value="pagado">Pagado</option>
                        <option value="vencido">Vencido</option>
                    </select>
                </div>
                <div class="form-group">
                    <select class="form-control" id="filter-socio" onchange="filterPrestamos()">
                        <option value="">Todos los socios</option>
                        ${socios.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="prestamos-list">
                ${renderPrestamosList()}
            </div>
        </div>
    `;
}

export function renderPrestamoForm(): string {
    const clientes = DataService.getAllClientes();
    const socios = DataService.getAllSocios();

    return `
        <form id="prestamo-form" onsubmit="savePrestamo(event)">
            <div class="form-group">
                <label class="form-label">Cliente</label>
                <select class="form-control" name="cliente_id" required>
                    <option value="">Seleccionar cliente</option>
                    ${clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Monto Total Solicitado</label>
                <input type="text" class="form-control" id="monto_total_solicitado" name="monto_solicitado" placeholder="Ej: 5000000" required oninput="formatCurrencyInput(this); updateAportantesValidation()">
            </div>

            <div style="background-color: var(--color-bg-2); padding: var(--space-16); border-radius: var(--radius-base); margin-bottom: var(--space-16);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-12);">
                    <h4 style="margin: 0; font-size: var(--font-size-lg);">Socios Aportantes</h4>
                    <button type="button" class="btn btn-sm btn-primary" onclick="addAportante()">+ Agregar Socio</button>
                </div>
                <p style="margin: 0 0 var(--space-12) 0; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    Puedes agregar todos los socios que necesites. La suma de sus aportes debe ser igual al monto total.
                </p>
                <div id="aportantes-container"></div>
                <div id="aportantes-summary" class="hidden" style="margin-top: var(--space-12); padding: var(--space-12); background-color: var(--color-surface); border-radius: var(--radius-sm);"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Plazo</label>
                    <input type="number" class="form-control" name="plazo_valor" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Unidad</label>
                    <select class="form-control" name="plazo_unidad" required>
                        <option value="dias">Días</option>
                        <option value="meses">Meses</option>
                        <option value="años">Años</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Fecha de Inicio</label>
                <input type="date" class="form-control" name="fecha_inicio" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Foto del Pagaré (opcional)</label>
                <div class="file-input-wrapper">
                    <input type="file" class="form-control" name="foto_pagare" accept="image/*" onchange="previewImage(event)">
                </div>
                <img id="image-preview" class="image-preview hidden" />
            </div>
            <div id="loan-calculation" class="calculation-summary hidden"></div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Crear Préstamo</button>
            </div>
        </form>
    `;
}

export function addAportante(): void {
    const input = document.getElementById('monto_total_solicitado') as HTMLInputElement;
    const montoTotal = parseFloat(input.dataset.rawValue || '0') || 0;
    if (montoTotal <= 0) {
        alert('Primero ingresa el monto total del préstamo');
        return;
    }

    // Calculate remaining amount to allocate
    const totalAportado = aportantesData.reduce((sum, a) => sum + a.monto_aportado, 0);
    const remaining = montoTotal - totalAportado;

    if (remaining <= 0) {
        alert('Ya has asignado el monto total del préstamo. Ajusta los montos existentes si necesitas agregar más socios.');
        return;
    }

    const index = aportantesData.length;
    const aportante: Aportante = {
        id: `aportante_${Date.now()}_${index}`,
        socio_id: '',
        monto_aportado: 0,
        tasa_interes: 0,
        interes_anticipado_su_parte: 0,
        saldo_pendiente_su_parte: 0
    };

    aportantesData.push(aportante);
    renderAportantes();
}

export function removeAportante(index: number): void {
    if (aportantesData.length === 1) {
        alert('Debe haber al menos un socio aportante en el préstamo');
        return;
    }

    const aportante = aportantesData[index];
    const socio = DataService.getSocioById(aportante.socio_id);
    const socioNombre = socio ? socio.nombre : 'este socio';

    if (confirm(`¿Estás seguro de eliminar a ${socioNombre} de este préstamo?`)) {
        aportantesData.splice(index, 1);
        renderAportantes();
    }
}

export function renderAportantes(): void {
    const container = document.getElementById('aportantes-container') as HTMLElement;
    const socios = DataService.getAllSocios();

    if (aportantesData.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-secondary); text-align: center; margin: var(--space-12) 0; padding: var(--space-20); border: 2px dashed var(--color-border); border-radius: var(--radius-base);">👥 Haz clic en "+ Agregar Socio" para comenzar<br><small style="font-size: var(--font-size-xs);">Puedes agregar la cantidad de socios que necesites</small></p>';
        updateAportantesValidation();
        return;
    }

    const sociosUsados = aportantesData.filter(a => a.socio_id).map(a => a.socio_id);

    container.innerHTML = aportantesData.map((aportante, index) => `
        <div style="border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-12); margin-bottom: var(--space-12); background-color: var(--color-surface);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-8);">
                <strong style="font-size: var(--font-size-base);">Aportante #${index + 1}</strong>
                <button type="button" class="icon-btn" onclick="removeAportante(${index})" title="Eliminar" ${aportantesData.length === 1 ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>🗑️</button>
            </div>
            <div class="form-group" style="margin-bottom: var(--space-8);">
                <label class="form-label" style="margin-bottom: var(--space-4);">Socio</label>
                <select class="form-control" onchange="updateAportante(${index}, 'socio_id', this.value)" required>
                    <option value="">Seleccionar socio</option>
                    ${socios.map(s => {
                        const yaUsado = sociosUsados.includes(s.id) && s.id !== aportante.socio_id;
                        return `<option value="${s.id}" ${aportante.socio_id === s.id ? 'selected' : ''} ${yaUsado ? 'disabled' : ''}>${s.nombre} (Disponible: ${formatCurrency(s.dinero_en_caja)}) ${yaUsado ? '- Ya agregado' : ''}</option>`;
                    }).join('')}
                </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8);">
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="margin-bottom: var(--space-4);">Monto Aportado</label>
                    <input type="text" class="form-control" placeholder="Ej: 1000000" value="${aportante.monto_aportado}" oninput="formatCurrencyInput(this); updateAportante(${index}, 'monto_aportado', this.dataset.rawValue || this.value)" required>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="margin-bottom: var(--space-4);">Tasa de Interés (%)</label>
                    <input type="number" class="form-control" value="${aportante.tasa_interes}" step="0.01" oninput="updateAportante(${index}, 'tasa_interes', this.value)" required>
                </div>
            </div>
        </div>
    `).join('');

    updateAportantesValidation();
}

export function updateAportante(index: number, field: keyof Aportante, value: string): void {
    if (field === 'monto_aportado' || field === 'tasa_interes') {
        (aportantesData[index] as any)[field] = parseFloat(value) || 0;
    } else {
        (aportantesData[index] as any)[field] = value;
    }
    updateAportantesValidation();
}

export function updateAportantesValidation(): void {
    const input = document.getElementById('monto_total_solicitado') as HTMLInputElement;
    const montoTotal = parseFloat(input.dataset.rawValue || '0') || 0;
    const summaryContainer = document.getElementById('aportantes-summary') as HTMLElement;
    const calculationContainer = document.getElementById('loan-calculation') as HTMLElement;

    if (aportantesData.length === 0 || montoTotal === 0) {
        summaryContainer.classList.add('hidden');
        calculationContainer.classList.add('hidden');
        return;
    }

    const totalAportado = aportantesData.reduce((sum, a) => sum + a.monto_aportado, 0);
    const diferencia = montoTotal - totalAportado;
    const isValid = Math.abs(diferencia) < 0.01;

    let summaryHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-8);">
            <span>Monto Total del Préstamo:</span>
            <span class="currency" style="font-weight: var(--font-weight-semibold);">${formatCurrency(montoTotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-8);">
            <span>Total Aportado:</span>
            <span class="currency" style="font-weight: var(--font-weight-semibold); color: ${isValid ? 'var(--color-success)' : 'var(--color-error)'};">${formatCurrency(totalAportado)}</span>
        </div>
    `;

    if (!isValid) {
        summaryHTML += `
            <div style="padding: var(--space-8); background-color: rgba(var(--color-error-rgb), 0.1); border-radius: var(--radius-sm); color: var(--color-error); font-size: var(--font-size-sm);">
                ⚠️ ${diferencia > 0 ? `Faltan ${formatCurrency(diferencia)} por asignar` : `Excede por ${formatCurrency(Math.abs(diferencia))}`}
                <br><small>No podrás crear el préstamo hasta que la suma de aportes sea igual al monto total</small>
            </div>
        `;
    } else {
        summaryHTML += `
            <div style="padding: var(--space-8); background-color: rgba(var(--color-success-rgb), 0.1); border-radius: var(--radius-sm); color: var(--color-success); font-size: var(--font-size-sm);">
                ✓ Los montos cuadran correctamente con ${aportantesData.length} socio${aportantesData.length > 1 ? 's' : ''}
            </div>
        `;
    }

    summaryContainer.innerHTML = summaryHTML;
    summaryContainer.classList.remove('hidden');

    // Show detailed calculation
    if (isValid && aportantesData.every(a => a.socio_id && a.monto_aportado > 0 && a.tasa_interes > 0)) {
        let calcHTML = '<h4 style="margin-bottom: var(--space-12); font-size: var(--font-size-base);">Resumen de Intereses Anticipados</h4>';
        let totalInteresAnticipado = 0;
        let totalEntregado = 0;

        aportantesData.forEach(a => {
            const socio = DataService.getSocioById(a.socio_id);
            const interesAnticipado = BusinessLogic.calcularInteresAnticipado(a.monto_aportado, a.tasa_interes);
            const entrega = BusinessLogic.calcularMontoEntregado(a.monto_aportado, interesAnticipado);
            totalInteresAnticipado += interesAnticipado;
            totalEntregado += entrega;

            calcHTML += `
                <div style="margin-bottom: var(--space-12); padding: var(--space-12); background-color: var(--color-bg-1); border-radius: var(--radius-sm);">
                    <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-4);">${socio ? socio.nombre : 'N/A'}</div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                        Aporta ${formatCurrency(a.monto_aportado)} al ${a.tasa_interes}%<br>
                        Interés Anticipado: ${formatCurrency(interesAnticipado)}<br>
                        Entrega: <strong>${formatCurrency(entrega)}</strong>
                    </div>
                </div>
            `;
        });

        calcHTML += `
            <div style="border-top: 2px solid var(--color-border); padding-top: var(--space-12); margin-top: var(--space-8);">
                <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-4);">
                    <span style="font-weight: var(--font-weight-semibold);">Total Interés Anticipado:</span>
                    <span class="currency" style="font-weight: var(--font-weight-bold); color: var(--color-success);">${formatCurrency(totalInteresAnticipado)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: var(--font-weight-semibold);">Total a Entregar al Cliente:</span>
                    <span class="currency" style="font-weight: var(--font-weight-bold);">${formatCurrency(totalEntregado)}</span>
                </div>
            </div>
        `;

        calculationContainer.innerHTML = calcHTML;
        calculationContainer.classList.remove('hidden');
    } else {
        calculationContainer.classList.add('hidden');
    }
}

export function renderPrestamosList(filteredPrestamos: Prestamo[] | null = null): string {
    const prestamos = filteredPrestamos || DataService.getAllPrestamos();

    if (prestamos.length === 0) {
        return '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No hay préstamos registrados</p></div>';
    }

    return `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Socios</th>
                        <th>Monto</th>
                        <th>Saldo Pendiente</th>
                        <th>Fecha Inicio</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${prestamos.map(prestamo => {
                        const cliente = DataService.getClienteById(prestamo.cliente_id);
                        let sociosInfo = 'N/A';

                        if (prestamo.aportantes && prestamo.aportantes!.length > 0) {
                            if (prestamo.aportantes.length <= 2) {
                                sociosInfo = prestamo.aportantes.map(a => {
                                    const socio = DataService.getSocioById(a.socio_id);
                                    return socio ? socio.nombre : 'N/A';
                                }).join(', ');
                            } else {
                                const primerSocio = DataService.getSocioById(prestamo.aportantes[0].socio_id);
                                sociosInfo = `${primerSocio ? primerSocio.nombre : 'N/A'} +${prestamo.aportantes.length - 1} más`;
                            }
                        } else if (prestamo.socio_id) {
                            // Legacy support
                            const socio = DataService.getSocioById(prestamo.socio_id);
                            sociosInfo = socio ? socio.nombre : 'N/A';
                        }

                        return `
                            <tr>
                                <td>${cliente ? cliente.nombre : 'N/A'}</td>
                                <td>${sociosInfo}</td>
                                <td class="currency">${formatCurrency(prestamo.monto_solicitado)}</td>
                                <td class="currency">${formatCurrency(prestamo.saldo_pendiente)}</td>
                                <td>${formatDate(prestamo.fecha_inicio)}</td>
                                <td>${formatDate(prestamo.fecha_vencimiento)}</td>
                                <td><span class="badge badge-${prestamo.estado === 'activo' ? 'success' : prestamo.estado === 'pagado' ? 'info' : 'error'}">${prestamo.estado}</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn" onclick="viewPrestamoDetail('${prestamo.id}')" title="Ver detalle">👁️</button>
                                        ${prestamo.estado === 'activo' ? `<button class="icon-btn" onclick="openPagoModal('${prestamo.id}')" title="Registrar pago">💳</button>` : ''}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function filterPrestamos(): void {
    const estadoFilter = (document.getElementById('filter-estado') as HTMLSelectElement).value;
    const socioFilter = (document.getElementById('filter-socio') as HTMLSelectElement).value;

    let filtered = DataService.getAllPrestamos();

    if (estadoFilter) {
        filtered = filtered.filter(p => p.estado === estadoFilter);
    }

    if (socioFilter) {
        filtered = filtered.filter(p => {
            // Check both new and legacy structures
            if (p.aportantes && p.aportantes.length > 0) {
                return p.aportantes.some(a => a.socio_id === socioFilter);
            } else {
                return p.socio_id === socioFilter;
            }
        });
    }

    const prestamosList = document.getElementById('prestamos-list') as HTMLElement;
    prestamosList.innerHTML = renderPrestamosList(filtered);
}

export function viewPrestamoDetail(prestamoId: string): void {
    const prestamo = DataService.getPrestamoById(prestamoId);
    if (!prestamo) return;

    const cliente = DataService.getClienteById(prestamo.cliente_id);
    if (!cliente) return;

    let aportantesHTML = '';
    if (prestamo.aportantes && prestamo.aportantes.length > 0) {
        aportantesHTML = `
            <h4 style="margin-bottom: 12px; margin-top: 24px;">Socios Aportantes</h4>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Socio</th>
                            <th>Monto Aportado</th>
                            <th>Tasa Interés</th>
                            <th>Interés Anticipado</th>
                            <th>Saldo Pendiente</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${prestamo.aportantes.map(a => {
                            const socio = DataService.getSocioById(a.socio_id);
                            return `
                                <tr>
                                    <td>${socio ? socio.nombre : 'N/A'}</td>
                                    <td class="currency">${formatCurrency(a.monto_aportado)}</td>
                                    <td>${a.tasa_interes}%</td>
                                    <td class="currency">${formatCurrency(a.interes_anticipado_su_parte)}</td>
                                    <td class="currency">${formatCurrency(a.saldo_pendiente_su_parte)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (prestamo.socio_id) {
        // Legacy support
        const socio = DataService.getSocioById(prestamo.socio_id);
        aportantesHTML = `
            <h4 style="margin-bottom: 12px; margin-top: 24px;">Información del Socio</h4>
            <div>
                <strong>Socio:</strong> ${socio ? socio.nombre : 'N/A'}<br>
                <strong>Tasa de Interés:</strong> ${prestamo.tasa_interes}%<br>
                <strong>Interés Anticipado:</strong> ${formatCurrency(prestamo.interes_anticipado_total || 0)}
            </div>
        `;
    }

    const modalHTML = `
        <div class="modal active" id="prestamo-detail-modal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">Detalle del Préstamo</h3>
                    <button class="modal-close" onclick="closeModal('prestamo-detail-modal')">&times;</button>
                </div>
                <div>
                    <h4 style="margin-bottom: 16px;">Información General</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
                        <div>
                            <strong>Cliente:</strong> ${cliente.nombre}<br>
                            <strong>Monto Solicitado:</strong> ${formatCurrency(prestamo.monto_solicitado)}<br>
                            <strong>Monto Entregado:</strong> ${formatCurrency(prestamo.monto_entregado)}<br>
                        </div>
                        <div>
                            <strong>Saldo Pendiente:</strong> ${formatCurrency(prestamo.saldo_pendiente)}<br>
                            <strong>Estado:</strong> <span class="badge badge-${prestamo.estado === 'activo' ? 'success' : 'info'}">${prestamo.estado}</span><br>
                            <strong>Fecha Inicio:</strong> ${formatDate(prestamo.fecha_inicio)}
                        </div>
                    </div>

                    ${aportantesHTML}

                    ${prestamo.foto_pagare ? `
                        <div style="margin-bottom: 24px; margin-top: 24px;">
                            <h4 style="margin-bottom: 12px;">Pagaré</h4>
                            <img src="${prestamo.foto_pagare}" class="image-preview" style="max-height: 300px;" />
                        </div>
                    ` : ''}

                    <h4 style="margin-bottom: 12px; margin-top: 24px;">Historial de Pagos</h4>
                    ${prestamo.historial_pagos.length === 0 ?
                        '<p style="color: var(--color-text-secondary);">No hay pagos registrados</p>' :
                        `<div class="payment-history">
                            ${prestamo.historial_pagos.map(pago => {
                                let pagoHTML = `
                                    <div class="payment-item">
                                        <div class="payment-item-header">
                                            <span>📅 ${formatDate(pago.fecha)}</span>
                                            <span class="currency" style="color: var(--color-success);">${formatCurrency(pago.monto_total_pagado || pago.total_pagado || 0)}</span>
                                        </div>
                                `;

                                if (pago.distribucion_por_socio && pago.distribucion_por_socio.length > 0) {
                                    pagoHTML += `
                                        <div style="margin-top: var(--space-8); font-size: var(--font-size-sm);">
                                            <strong style="display: block; margin-bottom: var(--space-8);">Distribución por Socio:</strong>
                                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-8);">
                                                ${pago.distribucion_por_socio.map(dist => {
                                                    const socio = DataService.getSocioById(dist.socio_id);
                                                    return `
                                                        <div style="padding: var(--space-8); background-color: var(--color-bg-1); border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                                                            <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-4); color: var(--color-text);">${socio ? socio.nombre : 'N/A'}</div>
                                                            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
                                                                Interés: <span class="currency" style="color: var(--color-success);">${formatCurrency(dist.interes_su_parte)}</span><br>
                                                                Capital: <span class="currency">${formatCurrency(dist.capital_su_parte)}</span>
                                                            </div>
                                                        </div>
                                                    `;
                                                }).join('')}
                                            </div>
                                        </div>
                                    `;
                                } else {
                                    pagoHTML += `
                                        <div class="payment-item-details">
                                            <div>
                                                <strong>Interés:</strong><br>
                                                <span class="currency">${formatCurrency(pago.interes_pagado_total || pago.monto_interes || 0)}</span>
                                            </div>
                                            <div>
                                                <strong>Capital:</strong><br>
                                                <span class="currency">${formatCurrency(pago.capital_pagado_total || pago.monto_capital || 0)}</span>
                                            </div>
                                            <div>
                                                <strong>Saldo Restante:</strong><br>
                                                <span class="currency">${formatCurrency(pago.saldo_restante_actualizado || 0)}</span>
                                            </div>
                                        </div>
                                    `;
                                }

                                pagoHTML += `</div>`;
                                return pagoHTML;
                            }).join('')}
                        </div>`
                    }
                </div>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modal-container') as HTMLElement;
    modalContainer.innerHTML = modalHTML;
}

export function openPagoModal(prestamoId: string): void {
    const prestamo = DataService.getPrestamoById(prestamoId);
    if (!prestamo) return;

    const cliente = DataService.getClienteById(prestamo.cliente_id);
    if (!cliente) return;

    // Calcular interés adeudado por cada socio
    let interesesDetalle: CalculoInteres[] = [];
    let interesAdeudado = 0;

    if (prestamo.aportantes && prestamo.aportantes.length > 0) {
        interesesDetalle = prestamo.aportantes.map(a => {
            const socio = DataService.getSocioById(a.socio_id);
            const interesMensual = BusinessLogic.calcularInteresAdeudado(a.saldo_pendiente_su_parte, a.tasa_interes);
            interesAdeudado += interesMensual;
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
        interesAdeudado = BusinessLogic.calcularInteresAdeudado(prestamo.saldo_pendiente, prestamo.tasa_interes);
        const socio = DataService.getSocioById(prestamo.socio_id || '');
        interesesDetalle = [{
            socio_id: prestamo.socio_id || '',
            socio_nombre: socio ? socio.nombre : 'N/A',
            interes: interesAdeudado,
            tasa: prestamo.tasa_interes,
            saldo: prestamo.saldo_pendiente,
            monto_aportado: prestamo.monto_solicitado
        }];
    }

    const interesesDetalleHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Socio</th>
                        <th>Saldo Pendiente</th>
                        <th>Tasa</th>
                        <th>Interés Adeudado</th>
                    </tr>
                </thead>
                <tbody>
                    ${interesesDetalle.map(det => `
                        <tr>
                            <td><strong>${det.socio_nombre}</strong></td>
                            <td class="currency">${formatCurrency(det.saldo)}</td>
                            <td>${det.tasa}%</td>
                            <td class="currency" style="color: var(--color-warning);">${formatCurrency(det.interes)}</td>
                        </tr>
                    `).join('')}
                    <tr style="border-top: 2px solid var(--color-border); font-weight: var(--font-weight-bold);">
                        <td>TOTAL</td>
                        <td class="currency">${formatCurrency(prestamo.saldo_pendiente)}</td>
                        <td>-</td>
                        <td class="currency" style="color: var(--color-warning);">${formatCurrency(interesAdeudado)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    const modalHTML = `
        <div class="modal active" id="pago-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Registrar Pago - ${cliente.nombre}</h3>
                    <button class="modal-close" onclick="closeModal('pago-modal')">&times;</button>
                </div>
                <div style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: var(--space-12); font-size: var(--font-size-base);">Estado Actual del Préstamo</h4>
                    ${interesesDetalleHTML}
                </div>
                <form id="pago-form" onsubmit="savePago(event, '${prestamoId}')">
                    <div class="form-group">
                        <label class="form-label">Monto Total Pagado</label>
                        <input type="text" class="form-control" name="monto_total" placeholder="Ej: 500000" required oninput="formatCurrencyInput(this); calculatePaymentDistribution(this.dataset.rawValue || this.value, '${prestamoId}')">
                    </div>
                    <div id="payment-distribution" class="calculation-summary hidden"></div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('pago-modal')">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Registrar Pago</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const modalContainer = document.getElementById('modal-container') as HTMLElement;
    modalContainer.innerHTML = modalHTML;
}

export function calculatePaymentDistribution(montoTotal: string, prestamoId: string): void {
    const monto = parseFloat(montoTotal) || 0;
    const prestamo = DataService.getPrestamoById(prestamoId);
    if (!prestamo) return;

    const paymentDistribution = document.getElementById('payment-distribution') as HTMLElement;
    if (monto <= 0) {
        paymentDistribution.classList.add('hidden');
        return;
    }

    const calculo = BusinessLogic.calcularDistribucionPago(monto, prestamo);

    // Generar HTML
    let html = `
        <h4 style="margin-bottom: var(--space-12); font-size: var(--font-size-base);">Distribución del Pago</h4>
        <div style="margin-bottom: var(--space-12); padding: var(--space-12); background-color: var(--color-bg-3); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-4);">
                <span>Monto a Intereses:</span>
                <span class="currency" style="font-weight: var(--font-weight-semibold);">${formatCurrency(calculo.interesTotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Monto a Capital:</span>
                <span class="currency" style="font-weight: var(--font-weight-semibold);">${formatCurrency(calculo.capitalTotal)}</span>
            </div>
        </div>
    `;

    if (calculo.distribucion.length > 0) {
        html += '<h4 style="margin-bottom: var(--space-12); font-size: var(--font-size-base);">Distribución por Socio:</h4>';
        html += `
            <div class="table-container">
                <table class="table" style="font-size: var(--font-size-sm);">
                    <thead>
                        <tr>
                            <th>Socio</th>
                            <th>Interés</th>
                            <th>Capital</th>
                            <th>Nuevo Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${calculo.distribucion.map(dist => `
                            <tr>
                                <td><strong>${dist.socio_nombre}</strong></td>
                                <td class="currency" style="color: var(--color-success);">${formatCurrency(dist.interes_recibe)}</td>
                                <td class="currency">${formatCurrency(dist.capital_recibe)}</td>
                                <td class="currency">${formatCurrency(dist.saldo_nuevo)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    const nuevoSaldoTotal = prestamo.saldo_pendiente - calculo.capitalTotal;
    html += `
        <div style="border-top: 2px solid var(--color-border); padding-top: var(--space-12); margin-top: var(--space-8);">
            <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: var(--font-weight-semibold);">Nuevo Saldo Total:</span>
                <span class="currency" style="font-weight: var(--font-weight-bold);">${formatCurrency(nuevoSaldoTotal)}</span>
            </div>
        </div>
    `;

    paymentDistribution.innerHTML = html;
    paymentDistribution.classList.remove('hidden');
}

// Renderizado de Reportes
export function renderReportes(): string {
    return `
        <div class="page-header">
            <h2 class="page-title">Reportes por Socio</h2>
            <p class="page-subtitle">Análisis financiero mensual</p>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Generar Reporte</h3>
            </div>
            <form id="reporte-form" onsubmit="generateReport(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Socio</label>
                        <select class="form-control" name="socio_id" required>
                            <option value="">Seleccionar socio</option>
                            ${DataService.getAllSocios().map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Mes</label>
                        <input type="month" class="form-control" name="mes" value="${new Date().toISOString().slice(0, 7)}" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Generar Reporte</button>
                </div>
            </form>
        </div>

        <div id="reporte-result"></div>
    `;
}

export function generateReport(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const socioId = formData.get('socio_id') as string;
    const mes = formData.get('mes') as string;
    const [year, month] = mes.split('-').map(Number);

    const socio = DataService.getSocioById(socioId);
    if (!socio) return;

    // Calcular préstamos donde el socio es aportante
    const prestamosConAporte: { prestamo: Prestamo; monto_aportado: number; saldo_pendiente: number }[] = [];
    let totalPrestado = 0;

    DataService.getAllPrestamos().forEach(p => {
        if (p.estado === 'activo') {
            if (p.aportantes && p.aportantes.length > 0) {
                // Nueva estructura
                const aportante = p.aportantes.find(a => a.socio_id === socioId);
                if (aportante) {
                    prestamosConAporte.push({
                        prestamo: p,
                        monto_aportado: aportante.monto_aportado,
                        saldo_pendiente: aportante.saldo_pendiente_su_parte
                    });
                    totalPrestado += aportante.monto_aportado;
                }
            } else if (p.socio_id === socioId) {
                // Legacy: un solo socio
                prestamosConAporte.push({
                    prestamo: p,
                    monto_aportado: p.monto_solicitado,
                    saldo_pendiente: p.saldo_pendiente
                });
                totalPrestado += p.monto_solicitado;
            }
        }
    });

    // Calcular ganancias del mes
    const gananciasMes = BusinessLogic.calcularGananciasMensuales(socioId, year, month);

    // Calcular aportes del mes
    const aportesMes = BusinessLogic.calcularAportesMensuales(socioId, year, month);

    const totalGeneral = socio.capital_aportado + socio.dinero_en_caja + socio.ganancia_total;

    const reportHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Reporte de ${socio.nombre} - ${new Date(year, month - 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</h3>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Plata Prestada</div>
                    <div class="stat-value currency">${formatCurrency(totalPrestado)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">En Caja para Prestar</div>
                    <div class="stat-value success currency">${formatCurrency(socio.dinero_en_caja)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Ganancias del Mes</div>
                    <div class="stat-value success currency">${formatCurrency(gananciasMes)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Capital Aumentado (Mes)</div>
                    <div class="stat-value currency">${formatCurrency(aportesMes)}</div>
                </div>
            </div>
            <div style="margin-top: 24px; padding: 24px; background-color: var(--color-bg-3); border-radius: var(--radius-lg);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: var(--font-size-2xl); margin: 0;">Total General</h3>
                    <div style="font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); color: var(--color-success);" class="currency">
                        ${formatCurrency(totalGeneral)}
                    </div>
                </div>
                <div style="margin-top: 16px; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                    Capital Aportado: ${formatCurrency(socio.capital_aportado)} |
                    En Caja: ${formatCurrency(socio.dinero_en_caja)} |
                    Ganancias Totales: ${formatCurrency(socio.ganancia_total)}
                </div>
            </div>

            <div style="margin-top: 24px;">
                <h4 style="margin-bottom: 16px;">Préstamos Activos (Mi Participación)</h4>
                ${prestamosConAporte.length === 0 ?
                    '<p style="color: var(--color-text-secondary);">No tienes participación en préstamos activos</p>' :
                    `<div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Mi Aporte</th>
                                    <th>Mi Saldo Pendiente</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${prestamosConAporte.map(item => {
                                    const cliente = DataService.getClienteById(item.prestamo.cliente_id);
                                    return `
                                        <tr>
                                            <td>${cliente ? cliente.nombre : 'N/A'}</td>
                                            <td class="currency">${formatCurrency(item.monto_aportado)}</td>
                                            <td class="currency">${formatCurrency(item.saldo_pendiente)}</td>
                                            <td>${formatDate(item.prestamo.fecha_inicio)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
            </div>
        </div>
    `;

    const reporteResult = document.getElementById('reporte-result') as HTMLElement;
    reporteResult.innerHTML = reportHTML;
}