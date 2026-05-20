// historial.js - Lógica para la gestión del Historial Clínico Integral

let allHistoriales = [];
let currentRole = '';

document.addEventListener('DOMContentLoaded', async () => {
    checkSession();
    setupSidebar();
    
    // Detectar rol del usuario
    currentRole = localStorage.getItem('userRole') || '';
    
    // Actualizar título y subtítulo según rol
    const user = localStorage.getItem('currentUser') || 'Usuario';
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) welcomeEl.innerText = user;

    // Si es enfermera, ocultar botones de admin (Exportar CSV, Limpiar DB)
    if (currentRole === 'enfermera') {
        const adminBtns = document.getElementById('adminButtons');
        if (adminBtns) adminBtns.style.display = 'none';

        // Cambiar título de la página
        const titulo = document.querySelector('.main-content .top-bar h1');
        if (titulo) titulo.innerText = 'Registros de Signos Vitales';
        const subtitulo = document.querySelector('.main-content .top-bar p');
        if (subtitulo) subtitulo.innerText = 'Vista de Enfermería — Solo lectura';

        // Ocultar el filtro de tipo (no aplica para enfermería)
        const filterTipo = document.getElementById('filterTipo');
        if (filterTipo) filterTipo.style.display = 'none';
    }

    // Cargar datos iniciales
    await loadHistoriales();

    // Listeners de filtros
    document.getElementById('searchNombre').addEventListener('input', filterData);
    document.getElementById('filterFecha').addEventListener('change', filterData);
    const filterTipoEl = document.getElementById('filterTipo');
    if (filterTipoEl) filterTipoEl.addEventListener('change', filterData);
});

async function loadHistoriales() {
    try {
        let data = await getAllRecords('historiales');
        // Ordenar por fechaRegistro descendente
        data.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
        
        // Si es enfermera, filtrar solo registros de Signos Vitales
        if (currentRole === 'enfermera') {
            data = data.filter(h => h.tipoFormulario === 'Signos Vitales');
        }

        allHistoriales = data;
        updateStats(allHistoriales);
        renderTable(allHistoriales);
    } catch (error) {
        console.error("Error cargando historiales:", error);
    }
}

function updateStats(data) {
    const totalHistoriales = data.length;
    
    // Contar pacientes únicos por nombre (ignorando mayúsculas/minúsculas)
    const uniquePatients = new Set(data.map(h => h.nombre.trim().toLowerCase())).size;
    
    // Asumimos que todos los guardados tienen PDF generado
    const totalPdfs = data.filter(h => h.pdfBase64).length;

    document.getElementById('statPacientes').innerText = uniquePatients;
    document.getElementById('statHistoriales').innerText = totalHistoriales;
    document.getElementById('statPdfs').innerText = totalPdfs;
}

function renderTable(data) {
    const tbody = document.getElementById('tablaHistorial');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay registros en la base de datos local.</td></tr>`;
        return;
    }

    data.forEach(h => {
        const tr = document.createElement('tr');
        const deleteBtn = currentRole === 'doctor' 
            ? `<button onclick="borrarHistorial('${h.id}')" class="btn btn-danger btn-sm" title="Eliminar Registro">
                    <i class="fas fa-trash"></i>
                </button>` 
            : '';
        tr.innerHTML = `
            <td>${h.fecha}</td>
            <td style="font-weight: bold;">${h.nombre}</td>
            <td>${h.edad}</td>
            <td><span style="background: var(--accent-color); padding: 5px 10px; border-radius: 5px; font-size: 0.85rem;">${h.tipoFormulario}</span></td>
            <td>${h.diagnostico}</td>
            <td style="text-align: center;">
                <button onclick="descargarPdfBase64('${h.id}')" class="btn btn-primary btn-sm" title="Descargar PDF">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
                ${deleteBtn}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterData() {
    const search = document.getElementById('searchNombre').value.toLowerCase();
    const fecha = document.getElementById('filterFecha').value;
    const tipo = document.getElementById('filterTipo').value;

    const filtered = allHistoriales.filter(h => {
        const matchNombre = h.nombre.toLowerCase().includes(search);
        const matchFecha = fecha === '' || h.fecha === fecha;
        const matchTipo = tipo === '' || h.tipoFormulario === tipo;
        return matchNombre && matchFecha && matchTipo;
    });

    renderTable(filtered);
}

function descargarPdfBase64(id) {
    const historial = allHistoriales.find(h => h.id === id);
    if (!historial || !historial.pdfBase64) {
        alert("El PDF no está disponible.");
        return;
    }

    // Convertir Base64 a Blob y descargar
    fetch(historial.pdfBase64)
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Historial_${historial.tipoFormulario.replace(/\s+/g, '_')}_${historial.nombre.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(err => {
            console.error("Error al descargar PDF:", err);
            alert("No se pudo descargar el archivo PDF.");
        });
}

async function borrarHistorial(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este registro histórico? Esta acción no se puede deshacer.")) {
        try {
            await deleteRecord('historiales', id);
            await loadHistoriales();
            if(typeof showAlert !== 'undefined') showAlert('Registro eliminado exitosamente.', 'success');
            else alert('Registro eliminado exitosamente.');
        } catch (error) {
            console.error("Error al borrar:", error);
            if(typeof showAlert !== 'undefined') showAlert('Error al eliminar.', 'error');
        }
    }
}

async function limpiarBaseDatos() {
    const pass = prompt("Atención: Esto borrará TODOS los expedientes permanentemente. Escribe 'CONFIRMAR' para continuar:");
    if (pass === 'CONFIRMAR') {
        try {
            await clearStore('historiales');
            await clearStore('pacientes');
            await clearStore('pdfs');
            await loadHistoriales();
            alert("Base de datos borrada exitosamente.");
        } catch (error) {
            console.error(error);
            alert("Error al limpiar base de datos.");
        }
    } else if (pass !== null) {
        alert("Operación cancelada. La palabra clave no coincide.");
    }
}

function exportarCSVTodos() {
    if (allHistoriales.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Fecha Registro,Fecha Formulario,Paciente,Edad,Sexo,Tipo,Diagnóstico\n";

    allHistoriales.forEach(h => {
        const row = [
            h.id,
            h.fechaRegistro,
            h.fecha,
            `"${h.nombre}"`,
            h.edad,
            h.sexo,
            `"${h.tipoFormulario}"`,
            `"${h.diagnostico}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Exportacion_Historial_MediSys.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
