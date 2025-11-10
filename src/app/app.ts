// Aplicación principal refactorizada con arquitectura por capas

import { ViewName, calculateEndDate } from '../config/types';
import * as DataService from '../data/dataService';
import * as BusinessLogic from '../business/businessLogic';
import * as UiService from '../ui/uiService';
import * as AuthService from '../auth/authService';

// Estado global de la aplicación
let aportantesData: any[] = [];

// Estado de autenticación
let isAuthenticated = false;

// Funciones de UI de autenticación
function showAuthScreen(): void {
    document.getElementById('auth-screen')!.classList.remove('hidden');
    document.getElementById('main-app')!.classList.add('hidden');
    document.getElementById('email-sent')!.classList.add('hidden');
    document.getElementById('login-link-section')!.classList.add('hidden');
}

function showMainApp(email: string): void {
    document.getElementById('auth-screen')!.classList.add('hidden');
    document.getElementById('main-app')!.classList.remove('hidden');
    document.getElementById('user-email')!.textContent = email;
    setupNavigation();
    renderView('dashboard');
}

function showLoginLinkSection(): void {
    document.getElementById('auth-form')!.classList.add('hidden');
    document.getElementById('login-link-section')!.classList.remove('hidden');
}

async function loadAppData(): Promise<void> {
    await DataService.loadData();
    await DataService.initializeDefaultSocios();
    await DataService.initializeDefaultCliente();
}

// Configuración de eventos de autenticación
function setupAuthEvents(): void {
    const emailForm = document.getElementById('email-form') as HTMLFormElement;
    const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email-input') as HTMLInputElement;
        const email = emailInput.value.trim();

        if (!email) {
            alert('Por favor ingresa un email válido');
            return;
        }

        try {
            await AuthService.sendSignInLink(email);
            document.getElementById('auth-form')!.classList.add('hidden');
            document.getElementById('email-sent')!.classList.remove('hidden');
        } catch (error) {
            console.error('Error al enviar enlace:', error);
            alert('Error al enviar el enlace. Por favor intenta de nuevo.');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await AuthService.logout();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    });
}

// Inicialización de la aplicación
async function initApp(): Promise<void> {
    // Configurar listener de autenticación
    AuthService.onAuthStateChange(async (user) => {
        isAuthenticated = !!user;
        if (user) {
            await loadAppData();
            showMainApp(user.email || '');
        } else {
            showAuthScreen();
        }
    });

    // Verificar si hay un enlace de inicio de sesión en la URL
    if (AuthService.isSignInLink(window.location.href)) {
        const email = AuthService.getEmailForSignIn();
        if (email) {
            try {
                showLoginLinkSection();
                const user = await AuthService.signInWithLink(email, window.location.href);
                console.log('Usuario autenticado con enlace:', user);
                // Limpiar la URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('Error al iniciar sesión con enlace:', error);
                alert('Error al verificar el enlace. Por favor, intenta de nuevo.');
                showAuthScreen();
            }
        } else {
            alert('No se encontró el email. Por favor, solicita un nuevo enlace.');
            showAuthScreen();
        }
    } else {
        // Cargar datos si ya está autenticado
        if (AuthService.getCurrentUser()) {
            await loadAppData();
        }
    }

    // Configurar eventos de autenticación
    setupAuthEvents();
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

async function saveSocio(event: Event, socioId: string): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Get the raw numeric value from the data attribute
    const capitalInput = form.querySelector('input[name="capital_aportado"]') as HTMLInputElement;
    const rawCapitalValue = capitalInput.dataset.rawValue || '0';

    const socioData = {
        nombre: formData.get('nombre') as string,
        capital_aportado: parseFloat(rawCapitalValue)
    };

    if (socioId) {
        await DataService.updateSocio(socioId, socioData);
    } else {
        await DataService.createSocio(socioData);
    }

    UiService.closeModal('socio-modal');
    renderView('socios');
}

function openAporteModal(socioId: string): void {
    UiService.openAporteModal(socioId);
}

async function saveAporte(event: Event, socioId: string): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Get the raw numeric value from the data attribute
    const montoInput = form.querySelector('input[name="monto"]') as HTMLInputElement;
    const rawValue = montoInput.dataset.rawValue || '0';
    const monto = parseFloat(rawValue);
    const descripcion = formData.get('descripcion') as string;

    const socio = DataService.getSocioById(socioId);
    if (socio) {
        const updatedSocio = {
            ...socio,
            capital_aportado: socio.capital_aportado + monto,
            dinero_en_caja: socio.dinero_en_caja + monto,
            historial_aportes: [
                ...socio.historial_aportes,
                {
                    fecha: new Date().toISOString(),
                    monto: monto,
                    descripcion: descripcion
                }
            ]
        };

        await DataService.updateSocio(socioId, updatedSocio);
    }

    UiService.closeModal('aporte-modal');
    renderView('socios');
}

function editSocio(socioId: string): void {
    openSocioModal(socioId);
}

async function deleteSocio(socioId: string): Promise<void> {
    const socio = DataService.getSocioById(socioId);
    if (!socio) return;

    // Check if socio has active loans
    const hasActiveLoans = DataService.getAllPrestamos().some(p =>
        p.estado === 'activo' && (
            (p.aportantes && p.aportantes.some(a => a.socio_id === socioId)) ||
            p.socio_id === socioId
        )
    );

    if (hasActiveLoans) {
        alert('No se puede eliminar este socio porque tiene préstamos activos.');
        return;
    }

    if (confirm(`¿Estás seguro de eliminar a ${socio.nombre}? Esta acción no se puede deshacer.`)) {
        const success = await DataService.deleteSocio(socioId);
        if (success) {
            renderView('socios');
            alert('Socio eliminado exitosamente');
        } else {
            alert('Error al eliminar el socio');
        }
    }
}

// Eventos de Clientes
function attachClientesEvents(): void {
    // Eventos ya manejados por UiService
}

function openClienteModal(clienteId: string | null = null): void {
    UiService.openClienteModal(clienteId);
}

async function saveCliente(event: Event, clienteId: string): Promise<void> {
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
        await DataService.updateCliente(clienteId, clienteData);
    } else {
        await DataService.createCliente(clienteData);
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
    // Also reset in UiService
    (window as any).aportantesData = [];
}

function addAportante(): void {
    UiService.addAportante();
    // Actualizar referencia local
    aportantesData = UiService.getAportantesData();
}

function removeAportante(index: number): void {
    UiService.removeAportante(index);
    // Actualizar referencia local
    aportantesData = UiService.getAportantesData();
}

function updateAportante(index: number, field: string, value: string): void {
    UiService.updateAportante(index, field as any, value);
    // Actualizar referencia local
    aportantesData = UiService.getAportantesData();
}

async function savePrestamo(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Get the raw numeric value from the data attribute
    const montoInput = form.querySelector('#monto_total_solicitado') as HTMLInputElement;
    const rawValue = montoInput.dataset.rawValue || '0';
    const monto_solicitado = parseFloat(rawValue);

    // Usar la lógica de negocio para validar y crear el préstamo
    const currentAportantesData = UiService.getAportantesData();
    const validation = BusinessLogic.validarAportantes(currentAportantesData, monto_solicitado);
    if (!validation.isValid) {
        alert(validation.error);
        return;
    }

    // Calcular intereses anticipados y crear aportantes
    const aportantes = currentAportantesData.map(a => BusinessLogic.crearAportante(a.socio_id, a.monto_aportado, a.tasa_interes));

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

    const newPrestamo = await DataService.createPrestamo(prestamoData);

    // Descontar del dinero en caja y agregar ganancias de cada socio
    for (const a of aportantesFinal) {
        const socio = DataService.getSocioById(a.socio_id);
        if (socio) {
            const updatedSocio = {
                ...socio,
                dinero_en_caja: socio.dinero_en_caja - a.monto_aportado,
                ganancia_total: socio.ganancia_total + a.interes_anticipado_su_parte,
                capital_aportado: socio.capital_aportado + a.monto_aportado
            };
            await DataService.updateSocio(a.socio_id, updatedSocio);
        }
    }

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

async function savePago(event: Event, prestamoId: string): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Get the raw numeric value from the data attribute
    const montoInput = form.querySelector('input[name="monto_total"]') as HTMLInputElement;
    const rawMontoValue = montoInput.dataset.rawValue || '0';
    const montoTotal = parseFloat(rawMontoValue);
    const prestamo = DataService.getPrestamoById(prestamoId);
    if (!prestamo) return;

    // Usar lógica de negocio para procesar el pago
    const resultado = BusinessLogic.procesarPago(prestamo, montoTotal);

    // Actualizar el préstamo en la base de datos
    await DataService.updatePrestamo(prestamoId, resultado.prestamoActualizado);

    // Actualizar saldos de los socios
    for (const dist of resultado.distribucionPago) {
        const socio = DataService.getSocioById(dist.socio_id);
        if (socio) {
            const updatedSocio = {
                ...socio,
                dinero_en_caja: socio.dinero_en_caja + dist.interes_su_parte + dist.capital_su_parte,
                ganancia_total: socio.ganancia_total + dist.interes_su_parte
            };
            await DataService.updateSocio(dist.socio_id, updatedSocio);
        }
    }

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
(window as any).deleteSocio = deleteSocio;
(window as any).openClienteModal = openClienteModal;
(window as any).saveCliente = saveCliente;
(window as any).editCliente = editCliente;
(window as any).viewClienteLoans = viewClienteLoans;
(window as any).addAportante = addAportante;
(window as any).removeAportante = removeAportante;
(window as any).updateAportante = updateAportante;
(window as any).updateAportantesValidation = UiService.updateAportantesValidation;
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
(window as any).formatCurrencyInput = UiService.formatCurrencyInput;

// Inicializar aplicación cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
    initApp().catch(console.error);
});