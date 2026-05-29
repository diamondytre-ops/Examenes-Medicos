// ==========================================
// Lógica Principal del Sistema Médico
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Manejo de Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usuario = document.getElementById('usuario').value.trim().toLowerCase();
            const pass = document.getElementById('password').value.trim().toLowerCase();

            if (usuario === 'manjarrez' && pass === 'doctora2026') {
                localStorage.setItem('currentUser', 'Doctor');
                localStorage.setItem('userRole', 'doctor');
                window.location.href = 'inicio.html';
            } else if (usuario === 'enfermera' && pass === '12345') {
                localStorage.setItem('currentUser', 'Enfermera');
                localStorage.setItem('userRole', 'enfermera');
                window.location.href = 'inicio.html';
            } else {
                alert('Credenciales incorrectas. Verifica tu usuario y contraseña.');
            }
        });
    }

    // 2. Control de Sesión Global
    checkSession();

    // 3. Menú Lateral Dinámico
    setupSidebar();

    // 4. Lógica de Página: Inicio
    if (document.getElementById('welcomeMessage')) {
        const user = localStorage.getItem('currentUser') || 'Usuario';
        document.getElementById('welcomeMessage').innerText = `Bienvenido(a) ${user}`;
    }

    // 5. Lógica de Página: Doctor (Expedientes)
    const formDr = document.getElementById('formDr');
    if (formDr) {
        formDr.addEventListener('submit', saveExpediente);
        renderExpedientes(); // Mostrar guardados en tabla si existe
    }

    // 6. Lógica de Página: Enfermería (Signos Vitales)
    const formEnf = document.getElementById('formEnf');
    if (formEnf) {
        formEnf.addEventListener('submit', saveSignos);
        renderSignos();
    }

    // 7. Lógica de Página: Agendar Citas
    const formCita = document.getElementById('formCita');
    if (formCita) {
        formCita.addEventListener('submit', saveCita);
        renderCitas();
    }
});

// ==========================================
// Funciones de Autenticación y UI
// ==========================================

function checkSession() {
    // Si no estamos en index.html y no hay rol, redirigir a login
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('scribe/')) {
        if (!localStorage.getItem('userRole')) {
            window.location.href = 'index.html';
        }
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
}

function setupSidebar() {
    const role = localStorage.getItem('userRole');
    const linkDr = document.getElementById('linkDr');
    const linkEnf = document.getElementById('linkEnf');

    if (role === 'doctor') {
        if (linkEnf) linkEnf.style.display = 'none'; // Ocultar panel de enfermera al doctor
    } else if (role === 'enfermera') {
        if (linkDr) linkDr.style.display = 'none'; // Ocultar panel de doctor a la enfermera
    }
}

function toggleSection(sectionId) {
    // Ocultar todas las secciones dinámicas
    document.querySelectorAll('.dynamic-section').forEach(sec => sec.classList.add('hidden'));
    // Mostrar la seleccionada
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
}

// ==========================================
// Funciones del Doctor (Expedientes)
// ==========================================

function saveExpediente(e) {
    e.preventDefault();
    const editId = document.getElementById('editExpId').value;

    const data = {
        id: editId ? parseInt(editId) : Date.now(),
        nombre: document.getElementById('nombrePac').value,
        edad: document.getElementById('edadPac').value,
        sexo: document.getElementById('sexoPac').value,
        diagnostico: document.getElementById('diagPac').value,
        observaciones: document.getElementById('obsPac').value,
        fecha: document.getElementById('fechaPac').value
    };

    let expedientes = JSON.parse(localStorage.getItem('expedientes')) || [];

    if (editId) {
        const index = expedientes.findIndex(exp => exp.id === parseInt(editId));
        if (index !== -1) {
            expedientes[index] = data;
        }
        document.getElementById('editExpId').value = '';
        document.getElementById('tituloFormExp').innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Expediente Clínico';
        alert('Expediente actualizado exitosamente.');
    } else {
        expedientes.push(data);
        alert('Expediente guardado exitosamente.');
    }

    localStorage.setItem('expedientes', JSON.stringify(expedientes));
    document.getElementById('formDr').reset();
    renderExpedientes();
    toggleSection('secHistorial');
}

function renderExpedientes() {
    const tbody = document.getElementById('tablaExpedientes');
    if (!tbody) return;

    let expedientes = JSON.parse(localStorage.getItem('expedientes')) || [];
    tbody.innerHTML = '';

    expedientes.forEach(exp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${exp.fecha}</td>
            <td>${exp.nombre}</td>
            <td>${exp.edad}</td>
            <td>${exp.diagnostico}</td>
            <td>
                <button onclick="editarExpediente(${exp.id})" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem; background: #6c757d; color: white;">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="generarPDFExpediente(${exp.id})" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirEspontaneo() {
    document.getElementById('formDr').reset();
    document.getElementById('editExpId').value = '';
    document.getElementById('tituloFormExp').innerHTML = '<i class="fas fa-notes-medical"></i> Consulta Espontánea';

    // Autocompletar la fecha de hoy
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaPac').value = hoy;

    toggleSection('secNuevoExp');
}

function editarExpediente(id) {
    let expedientes = JSON.parse(localStorage.getItem('expedientes')) || [];
    const exp = expedientes.find(e => e.id === id);
    if (exp) {
        document.getElementById('editExpId').value = exp.id;
        document.getElementById('nombrePac').value = exp.nombre;
        document.getElementById('edadPac').value = exp.edad;
        document.getElementById('sexoPac').value = exp.sexo;
        document.getElementById('diagPac').value = exp.diagnostico;
        document.getElementById('obsPac').value = exp.observaciones;
        document.getElementById('fechaPac').value = exp.fecha;

        document.getElementById('tituloFormExp').innerHTML = '<i class="fas fa-edit"></i> Editar Expediente Clínico';
        toggleSection('secNuevoExp');
    }
}

function generarPDFExpediente(id) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let expedientes = JSON.parse(localStorage.getItem('expedientes')) || [];
    const exp = expedientes.find(e => e.id === id);

    if (exp) {
        doc.setFontSize(22);
        doc.setTextColor(0, 86, 179);
        doc.text("Expediente Médico", 20, 20);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Fecha: ${exp.fecha}`, 20, 35);
        doc.text(`Paciente: ${exp.nombre}`, 20, 45);
        doc.text(`Edad: ${exp.edad} | Sexo: ${exp.sexo}`, 20, 55);
        doc.text(`Diagnóstico:`, 20, 70);
        doc.text(doc.splitTextToSize(exp.diagnostico, 170), 20, 80);
        doc.text(`Observaciones:`, 20, 110);
        doc.text(doc.splitTextToSize(exp.observaciones, 170), 20, 120);

        doc.save(`Expediente_${exp.nombre.replace(/\s+/g, '_')}.pdf`);
    }
}

// ==========================================
// Funciones de Enfermería (Signos)
// ==========================================

function saveSignos(e) {
    e.preventDefault();
    const data = {
        id: Date.now(),
        nombre: document.getElementById('nombreEnf').value,
        presion: document.getElementById('presionEnf').value,
        temp: document.getElementById('tempEnf').value,
        peso: document.getElementById('pesoEnf').value,
        obs: document.getElementById('obsEnf').value,
        fecha: new Date().toLocaleDateString()
    };

    let signos = JSON.parse(localStorage.getItem('signos')) || [];
    signos.push(data);
    localStorage.setItem('signos', JSON.stringify(signos));

    alert('Registro guardado exitosamente.');
    document.getElementById('formEnf').reset();
    renderSignos();
}

function renderSignos() {
    const tbody = document.getElementById('tablaSignos');
    if (!tbody) return;

    let signos = JSON.parse(localStorage.getItem('signos')) || [];
    tbody.innerHTML = '';

    signos.forEach(sig => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sig.fecha}</td>
            <td>${sig.nombre}</td>
            <td>${sig.presion}</td>
            <td>${sig.temp} °C</td>
            <td>
                <button onclick="generarPDFSignos(${sig.id})" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function generarPDFSignos(id) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let signos = JSON.parse(localStorage.getItem('signos')) || [];
    const sig = signos.find(e => e.id === id);

    if (sig) {
        doc.setFontSize(22);
        doc.setTextColor(40, 167, 69);
        doc.text("Registro de Enfermería", 20, 20);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Fecha: ${sig.fecha}`, 20, 35);
        doc.text(`Paciente: ${sig.nombre}`, 20, 45);
        doc.text(`Presión Arterial: ${sig.presion}`, 20, 55);
        doc.text(`Temperatura: ${sig.temp} °C`, 20, 65);
        doc.text(`Peso: ${sig.peso} kg`, 20, 75);
        doc.text(`Observaciones:`, 20, 90);
        doc.text(doc.splitTextToSize(sig.obs, 170), 20, 100);

        doc.save(`Signos_${sig.nombre.replace(/\s+/g, '_')}.pdf`);
    }
}

// ==========================================
// Funciones de Citas (Agendar)
// ==========================================

function saveCita(e) {
    e.preventDefault();
    const data = {
        id: Date.now(),
        nombre: document.getElementById('nombreCita').value,
        fecha: document.getElementById('fechaCita').value,
        hora: document.getElementById('horaCita').value,
        motivo: document.getElementById('motivoCita').value,
        estado: 'Pendiente'
    };

    let citas = JSON.parse(localStorage.getItem('citas')) || [];
    citas.push(data);
    // Ordenar por fecha y hora
    citas.sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora));
    localStorage.setItem('citas', JSON.stringify(citas));

    alert('Cita agendada exitosamente.');
    document.getElementById('formCita').reset();
    renderCitas();
}

function renderCitas() {
    const tbodys = [document.getElementById('tablaCitas'), document.getElementById('tablaCitasEnf')];
    let citas = JSON.parse(localStorage.getItem('citas')) || [];

    tbodys.forEach(tbody => {
        if (!tbody) return;
        tbody.innerHTML = '';

        citas.forEach(cita => {
            const tr = document.createElement('tr');
            const colorEstado = cita.estado === 'Atendido' ? 'green' : (cita.estado === 'No Asistió' ? 'red' : '#ff9800');
            tr.innerHTML = `
                <td>${cita.fecha}</td>
                <td>${cita.hora}</td>
                <td>${cita.nombre}</td>
                <td>${cita.motivo}</td>
                <td><strong style="color: ${colorEstado};">${cita.estado || 'Pendiente'}</strong></td>
                <td>
                    <button onclick="marcarCita(${cita.id}, 'Atendido')" class="btn" style="padding: 0.4rem; font-size: 0.9rem; background: #28a745; color: white;" title="Marcar Atendido">
                        <i class="fas fa-check"></i>
                    </button>
                    <button onclick="marcarCita(${cita.id}, 'No Asistió')" class="btn" style="padding: 0.4rem; font-size: 0.9rem; background: #dc3545; color: white;" title="No Asistió">
                        <i class="fas fa-times"></i>
                    </button>
                    <button onclick="eliminarCita(${cita.id})" class="btn" style="padding: 0.4rem; font-size: 0.9rem; background: #6c757d; color: white;" title="Borrar Cita">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function marcarCita(id, estado) {
    let citas = JSON.parse(localStorage.getItem('citas')) || [];
    const index = citas.findIndex(c => c.id === id);
    if (index !== -1) {
        citas[index].estado = estado;
        localStorage.setItem('citas', JSON.stringify(citas));
        renderCitas();
    }
}

function eliminarCita(id) {
    if (confirm('¿Seguro que deseas eliminar esta cita?')) {
        let citas = JSON.parse(localStorage.getItem('citas')) || [];
        citas = citas.filter(c => c.id !== id);
        localStorage.setItem('citas', JSON.stringify(citas));
        renderCitas();
    }
}

function generarPDFCitasGlobal() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(0, 86, 179);
    doc.text("Reporte de Citas Programadas", 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    let citas = JSON.parse(localStorage.getItem('citas')) || [];
    if (citas.length === 0) {
        doc.text("No hay citas agendadas.", 20, 35);
    } else {
        let y = 35;
        citas.forEach((cita, index) => {
            doc.text(`${index + 1}. ${cita.fecha} ${cita.hora} - ${cita.nombre} (${cita.motivo})`, 20, y);
            y += 10;
            if (y > 280) { // Si llega al final de la página, agregar otra
                doc.addPage();
                y = 20;
            }
        });
    }

    doc.save(`Reporte_Citas.pdf`);
}
