// Aplicación principal refactorizada con arquitectura por capas

import { ViewName, calculateEndDate } from '../config/types.js';
import * as DataService from '../data/dataService.js';
import * as BusinessLogic from '../business/businessLogic.js';
import * as UiService from '../ui/uiService.js';

// Estado global de la aplicación
let aportantesData: any[] = [];

// Inicialización de la aplicación
function initApp(): void {
    DataService.loadData();
    DataService.initializeDefaultSocios();
    DataService.initializeDefaultCliente();
    setupNavigation();
    renderView('dashboard');
}

// Configuración de navegación
function setupNavigation(): void {
    const navLinks = document.querySelectorAll('.nav-link') as NodeListOf<HTMLElement>;
    navLinks.forEach(link => {
        link.addEventListener('click', (e: Event) => {
            e.preventDefault();
            const view = link.getAttribute('data-view') as ViewName;

            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            renderView(view);
        });
    });
}

// Renderizado de vistas
function renderView(viewName: ViewName): void {
    const content = document.getElementById('app-content') as HTMLElement;

    switch(viewName) {
        case 'dashboard':
            content.innerHTML = UiService.renderDashboard();
            break;
        case 'socios':
            content.innerHTML = UiService.renderSocios();
            attachSociosEvents();
            break;
        case 'clientes':
            content.innerHTML = UiService.renderClientes();
            attachClientesEvents();
            break;
        case 'prestamos':
            content.innerHTML = UiService.renderPrestamos();
            attachPrestamosEvents();
            break;
        case 'reportes':
            content.innerHTML = UiService.renderReportes();
            attachReportesEvents();
            break;
    }
}

// Eventos de Socios
function attachSociosEvents(): void {
    // Eventos ya manejados por UiService
}

function openSocioModal(socioId: string | null = null): void {
    UiService.openSocioModal(socioId);
}

function saveSocio(event: Event, socioId: string): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const socioData = {
        nombre: formData.get('nombre') as string,
        capital_aportado: parseFloat(formData.get('capital_aportado') as string)
    };

    if (socioId) {
        DataService.updateSocio(socioId, socioData);
    } else {
        DataService.createSocio(socioData);
    }

    UiService.closeModal('socio-modal');
    renderView('socios');
}

function openAporteModal(socioId: string): void {
    UiService.openAporteModal(socioId);
}

function saveAporte(event: Event, socioId: string): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const monto = parseFloat(formData.get('monto') as string);
    const descripcion = formData.get('descripcion') as string;

    const socio = DataService.getSocioById(socioId);
    if (socio) {
        socio.capital_aportado += monto;
        socio.dinero_en_caja += monto;
        socio.historial_aportes.push({
            fecha: new Date().toISOString(),
            monto: monto,
            descripcion: descripcion
        });
        DataService.saveData();
    }

    UiService.closeModal('aporte-modal');
    renderView('socios');
}

function editSocio(socioId: string): void {
    openSocioModal(socioId);
}

// Eventos de Clientes
function attachClientesEvents(): void {
    // Eventos ya manejados por UiService
}

function openClienteModal(clienteId: string | null = null): void {
    UiService.openClienteModal(clienteId);
}

function saveCliente(event: Event, clienteId: string): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const clienteData = {
        nombre: formData.get('nombre') as string,
        cedula: formData.get('cedula') as string,
        telefono: formData.get('telefono') as string,
        email: formData.get('email') as string,
        direccion: formData.get('direccion') as string,
        persona_recomendacion: formData.get('persona_recomendacion') as string
    };

    if (clienteId) {
        DataService.updateCliente(clienteId, clienteData);
    } else {
        DataService.createCliente(clienteData);
    }

    UiService.closeModal('cliente-modal');
    renderView('clientes');
}

function editCliente(clienteId: string): void {
    openClienteModal(clienteId);
}

function viewClienteLoans(clienteId: string): void {
    UiService.viewClienteLoans(clienteId);
}

// Eventos de Préstamos
function attachPrestamosEvents(): void {
    // Reset aportantes data
    aportantesData = [];
}

function addAportante(): void {
    UiService.addAportante();
    // Actualizar referencia local
    aportantesData = (window as any).aportantesData || [];
}

function removeAportante(index: number): void {
    UiService.removeAportante(index);
    // Actualizar referencia local
    aportantesData = (window as any).aportantesData || [];
}

function updateAportante(index: number, field: string, value: string): void {
    UiService.updateAportante(index, field as any, value);
    // Actualizar referencia local
    aportantesData = (window as any).aportantesData || [];
}

function savePrestamo(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const monto_solicitado = parseFloat(formData.get('monto_solicitado') as string);

    // Usar la lógica de negocio para validar y crear el préstamo
    const validation = BusinessLogic.validarAportantes(aportantesData, monto_solicitado);
    if (!validation.isValid) {
        alert(validation.error);
        return;
    }

    // Calcular intereses anticipados y crear aportantes
    const aportantes = aportantesData.map(a => BusinessLogic.crearAportante(a.socio_id, a.monto_aportado, a.tasa_interes));

    // Calcular totales
    let totalInteresAnticipado = 0;
    let totalMontoEntregado = 0;
    const aportantesFinal = aportantes.map(a => {
        const interesAnticipado = BusinessLogic.calcularInteresAnticipado(a.monto_aportado, a.tasa_interes);
        totalInteresAnticipado += interesAnticipado;
        totalMontoEntregado += BusinessLogic.calcularMontoEntregado(a.monto_aportado, interesAnticipado);

        return {
            socio_id: a.socio_id,
            monto_aportado: a.monto_aportado,
            tasa_interes: a.tasa_interes,
            interes_anticipado_su_parte: interesAnticipado,
            saldo_pendiente_su_parte: a.monto_aportado,
            interes_adeudado_mes_su_parte: 0
        };
    });

    const fecha_inicio = formData.get('fecha_inicio') as string;
    const plazo_valor = parseInt(formData.get('plazo_valor') as string);
    const plazo_unidad = formData.get('plazo_unidad') as string;
    const fecha_vencimiento = calculateEndDate(fecha_inicio, plazo_valor, plazo_unidad);

    // Handle image
    let foto_pagare = '';
    const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
    if (imagePreview && !imagePreview.classList.contains('hidden')) {
        foto_pagare = imagePreview.src;
    }

    const prestamoData = {
        cliente_id: formData.get('cliente_id') as string,
        aportantes: aportantesFinal,
        monto_solicitado: monto_solicitado,
        plazo_valor: plazo_valor,
        plazo_unidad: plazo_unidad as 'dias' | 'meses' | 'años',
        fecha_inicio: fecha_inicio,
        fecha_vencimiento: fecha_vencimiento,
        monto_entregado: totalMontoEntregado,
        interes_anticipado_total: totalInteresAnticipado,
        saldo_pendiente: monto_solicitado,
        estado: 'activo' as const,
        foto_pagare: foto_pagare,
        historial_pagos: []
    };

    const newPrestamo = DataService.createPrestamo(prestamoData);

    // Descontar del dinero en caja y agregar ganancias de cada socio
    aportantesFinal.forEach(a => {
        const socio = DataService.getSocioById(a.socio_id);
        if (socio) {
            socio.dinero_en_caja -= a.monto_aportado;
            socio.ganancia_total += a.interes_anticipado_su_parte;
            socio.capital_aportado += a.monto_aportado;
        }
    });

    // Reset form and aportantes
    (form as HTMLFormElement).reset();
    aportantesData = [];
    const aportantesContainer = document.getElementById('aportantes-container') as HTMLElement;
    aportantesContainer.innerHTML = '';
    const imagePreviewReset = document.getElementById('image-preview') as HTMLImageElement;
    imagePreviewReset.classList.add('hidden');
    const loanCalculation = document.getElementById('loan-calculation') as HTMLElement;
    loanCalculation.classList.add('hidden');
    const aportantesSummary = document.getElementById('aportantes-summary') as HTMLElement;
    aportantesSummary.classList.add('hidden');

    renderView('prestamos');
    alert('Préstamo creado exitosamente');
}

function renderPrestamosList(filteredPrestamos: any[] | null = null): string {
    return UiService.renderPrestamosList(filteredPrestamos);
}

function filterPrestamos(): void {
    UiService.filterPrestamos();
}

function viewPrestamoDetail(prestamoId: string): void {
    UiService.viewPrestamoDetail(prestamoId);
}

function openPagoModal(prestamoId: string): void {
    UiService.openPagoModal(prestamoId);
}

function calculatePaymentDistribution(montoTotal: string, prestamoId: string): void {
    UiService.calculatePaymentDistribution(montoTotal, prestamoId);
}

function savePago(event: Event, prestamoId: string): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const montoTotal = parseFloat(formData.get('monto_total') as string);
    const prestamo = DataService.getPrestamoById(prestamoId);
    if (!prestamo) return;

    // Usar lógica de negocio para procesar el pago
    const resultado = BusinessLogic.procesarPago(prestamo, montoTotal);

    // Actualizar el préstamo en la base de datos
    DataService.updatePrestamo(prestamoId, resultado.prestamoActualizado);

    UiService.closeModal('pago-modal');
    renderView('prestamos');
    alert('Pago registrado exitosamente');
}

// Eventos de Reportes
function attachReportesEvents(): void {
    // Eventos ya manejados por UiService
}

function generateReport(event: Event): void {
    event.preventDefault();
    UiService.generateReport(event);
}

// Utilidades globales
function closeModal(modalId: string): void {
    UiService.closeModal(modalId);
}

function previewImage(event: Event): void {
    UiService.previewImage(event);
}

// Exponer funciones globales para uso en HTML
(window as any).renderView = renderView;
(window as any).openSocioModal = openSocioModal;
(window as any).saveSocio = saveSocio;
(window as any).openAporteModal = openAporteModal;
(window as any).saveAporte = saveAporte;
(window as any).editSocio = editSocio;
(window as any).openClienteModal = openClienteModal;
(window as any).saveCliente = saveCliente;
(window as any).editCliente = editCliente;
(window as any).viewClienteLoans = viewClienteLoans;
(window as any).addAportante = addAportante;
(window as any).removeAportante = removeAportante;
(window as any).updateAportante = updateAportante;
(window as any).savePrestamo = savePrestamo;
(window as any).renderPrestamosList = renderPrestamosList;
(window as any).filterPrestamos = filterPrestamos;
(window as any).viewPrestamoDetail = viewPrestamoDetail;
(window as any).openPagoModal = openPagoModal;
(window as any).calculatePaymentDistribution = calculatePaymentDistribution;
(window as any).savePago = savePago;
(window as any).generateReport = generateReport;
(window as any).closeModal = closeModal;
(window as any).previewImage = previewImage;

// Inicializar aplicación cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', initApp);