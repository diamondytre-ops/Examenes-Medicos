// pdf.js - Motor centralizado de generación de PDFs y Alertas

// Sistema de alertas personalizadas
const showAlert = (mensaje, tipo = 'success') => {
    // Remover alerta anterior si existe
    const existingAlert = document.getElementById('custom-alert');
    if (existingAlert) existingAlert.remove();

    const alertBox = document.createElement('div');
    alertBox.id = 'custom-alert';
    alertBox.className = `custom-alert alert-${tipo}`;
    
    let icon = 'fa-check-circle';
    if (tipo === 'error') icon = 'fa-exclamation-circle';
    if (tipo === 'info') icon = 'fa-info-circle';

    alertBox.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${mensaje}</span>
    `;

    document.body.appendChild(alertBox);

    // Animación de entrada
    setTimeout(() => {
        alertBox.classList.add('show');
    }, 10);

    // Remover después de 3.5 segundos
    setTimeout(() => {
        alertBox.classList.remove('show');
        setTimeout(() => alertBox.remove(), 400);
    }, 3500);
};

/**
 * Función central para generar PDF, descargarlo y guardarlo en IndexedDB.
 * @param {string} containerId - ID del contenedor principal del documento.
 * @param {string} tipoFormulario - Nombre del formulario (ej. 'Examen Médico').
 * @param {Object} pacienteData - Datos clave del paciente {nombre, edad, sexo, diagnostico}.
 * @param {string} fileName - Nombre con el que se descargará el PDF.
 */
const generarYGuardarPDF = async (containerId, tipoFormulario, pacienteData, fileName) => {
    // 1. Validaciones básicas
    if (!pacienteData.nombre || pacienteData.nombre.trim() === '') {
        showAlert('El nombre del paciente es obligatorio', 'error');
        return;
    }

    const btnContainer = document.querySelector('.pdf-btn-container');
    if (btnContainer) btnContainer.style.display = 'none';

    showAlert('Generando PDF, por favor espere...', 'info');

    const container = document.getElementById(containerId);

    // 2. Preparar el HTML para captura (Convertir inputs a texto)
    document.querySelectorAll(`#${containerId} input[type="text"], #${containerId} input[type="date"], #${containerId} input[type="number"]`).forEach(input => {
        const span = document.createElement('span');
        span.textContent = input.value || ' ';
        span.className = input.className;
        span.style.display = 'inline-block';
        if (input.style.width) span.style.width = input.style.width;
        span.style.borderBottom = '1px dashed #ccc';
        span.style.whiteSpace = 'pre-wrap';
        span.style.wordBreak = 'break-word';
        span.style.verticalAlign = 'bottom';
        span.style.paddingBottom = '2px';
        span.style.minHeight = '14px';
        input.parentNode.replaceChild(span, input);
    });

    document.querySelectorAll(`#${containerId} textarea`).forEach(ta => {
        const div = document.createElement('div');
        div.textContent = ta.value || ' ';
        div.className = ta.className;
        div.style.width = '100%';
        div.style.minHeight = Math.max(ta.offsetHeight, 40) + 'px';
        div.style.borderBottom = '1px dashed #ccc';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordBreak = 'break-word';
        div.style.paddingBottom = '2px';
        div.style.textAlign = ta.style.textAlign || 'left';
        ta.parentNode.replaceChild(div, ta);
    });

    // 3. Organizar páginas para html2canvas
    const originalChildren = Array.from(container.childNodes);
    const pages = [];
    let currentPage = document.createElement('div');
    currentPage.className = 'pdf-page';
    currentPage.style.backgroundColor = 'white';
    pages.push(currentPage);

    for (let i = 0; i < originalChildren.length; i++) {
        const node = originalChildren[i];
        if (node.nodeType === 1 && node.classList.contains('page-break')) {
            currentPage = document.createElement('div');
            currentPage.className = 'pdf-page';
            currentPage.style.backgroundColor = 'white';
            pages.push(currentPage);
        } else {
            currentPage.appendChild(node);
        }
    }

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    container.style.padding = '0';
    container.style.boxShadow = 'none';
    container.style.backgroundColor = 'transparent';

    pages.forEach(page => {
        page.style.width = '900px';
        page.style.maxWidth = '900px';
        page.style.margin = '0 auto';
        page.style.padding = '40px';
        page.style.boxSizing = 'border-box';
        container.appendChild(page);
    });

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();

        // Renderizar cada página
        for (let i = 0; i < pages.length; i++) {
            const canvas = await html2canvas(pages[i], {
                scale: 2,
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = pdfWidth / imgWidth;
            const totalPdfHeight = imgHeight * ratio;

            if (i > 0) doc.addPage();
            doc.addImage(imgData, 'JPEG', 0, 5, pdfWidth, totalPdfHeight);
        }

        // 4. Extraer Base64
        const pdfBase64 = doc.output('datauristring');

        // 5. Guardar en IndexedDB
        const nuevoHistorial = {
            id: Date.now().toString(),
            nombre: pacienteData.nombre,
            edad: pacienteData.edad || 'N/A',
            sexo: pacienteData.sexo || 'N/A',
            fecha: pacienteData.fecha || new Date().toISOString().split('T')[0],
            diagnostico: pacienteData.diagnostico || 'Revisión general',
            tipoFormulario: tipoFormulario,
            pdfBase64: pdfBase64,
            datosFormulario: pacienteData, // Para uso futuro
            fechaRegistro: new Date().toISOString()
        };

        await saveRecord('historiales', nuevoHistorial);

        // 6. Descargar el archivo
        const finalFileName = fileName ? `${fileName}_${pacienteData.nombre.replace(/\s+/g, '_')}.pdf` : `Documento_${pacienteData.nombre.replace(/\s+/g, '_')}.pdf`;
        doc.save(finalFileName);

        showAlert('¡Guardado y exportado exitosamente!', 'success');

        // Recargar después de un momento para limpiar el formulario
        setTimeout(() => {
            window.location.reload();
        }, 2500);

    } catch (err) {
        console.error('Error generando PDF o guardando en DB:', err);
        showAlert('Ocurrió un error en el proceso', 'error');
        if (btnContainer) btnContainer.style.display = 'block';
    }
};
