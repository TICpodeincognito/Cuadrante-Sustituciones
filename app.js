document.addEventListener('DOMContentLoaded', () => {
    const app = {
        periodosLectivos: {
             'oct-may': {
                nombre: 'Octubre - Mayo',
                horas: [
                    { nombre: '1ª', horario: '9:00 - 9:45', esLectiva: true, mapToMasterIndex: 0 },
                    { nombre: '2ª', horario: '9:45 - 10:30', esLectiva: true, mapToMasterIndex: 1 },
                    { nombre: 'Recreo', horario: '10:30 - 11:00', esLectiva: true, mapToMasterIndex: 2, esRecreoGuardia: true },
                    { nombre: '3ª', horario: '11:00 - 11:45', esLectiva: true, mapToMasterIndex: 3 },
                    { nombre: '4ª', horario: '11:45 - 12:30', esLectiva: true, mapToMasterIndex: 4 },
                    { nombre: 'Exclusiva', horario: '12:30 - 14:30', esLectiva: false, mapToMasterIndex: 5, esExclusiva: true },
                    { nombre: '5ª', horario: '14:30 - 15:15', esLectiva: true, mapToMasterIndex: 6 },
                    { nombre: '6ª', horario: '15:15 - 16:00', esLectiva: true, mapToMasterIndex: 7 }
                ]
            },
            'septiembre': {
                nombre: 'Septiembre',
                horas: [
                    { nombre: '1ª', horario: '9:00 - 9:40', esLectiva: true, mapToMasterIndex: 0 },
                    { nombre: '2ª', horario: '9:40 - 10:20', esLectiva: true, mapToMasterIndex: 1 },
                    { nombre: '3ª', horario: '10:20 - 11:00', esLectiva: true, mapToMasterIndex: 3 },
                    { nombre: 'Recreo', horario: '11:00 - 11:30', esLectiva: true, mapToMasterIndex: 2, esRecreoGuardia: true },
                    { nombre: '4ª', horario: '11:30 - 12:15', esLectiva: true, mapToMasterIndex: 4 },
                    { nombre: '5ª', horario: '12:15 - 13:00', esLectiva: true, mapToMasterIndex: 6 }
                ]
            },
            'junio': {
                nombre: 'Junio',
                horas: [
                    { nombre: '1ª', horario: '9:00 - 9:40', esLectiva: true, mapToMasterIndex: 0 },
                    { nombre: '2ª', horario: '9:40 - 10:20', esLectiva: true, mapToMasterIndex: 1 },
                    { nombre: '3ª', horario: '10:20 - 11:00', esLectiva: true, mapToMasterIndex: 3 },
                    { nombre: 'Recreo', horario: '11:00 - 11:30', esLectiva: true, mapToMasterIndex: 2, esRecreoGuardia: true },
                    { nombre: '4ª', horario: '11:30 - 12:15', esLectiva: true, mapToMasterIndex: 4 },
                    { nombre: '5ª', horario: '12:15 - 13:00', esLectiva: true, mapToMasterIndex: 7 }
                ]
            }
        },
        periodoActivo: 'oct-may',
        dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
        estadosCelda: ["Libre", "Clase", "Apoyo", "No disponible"],
        datos: { docentes: [], log: [], historialTablas: {} },
        resultadosSustitucionActuales: [],
        numAusenciaDefs: 0,
        celdasSeleccionadas: new Set(),
        modoSeleccionMultiple: false,
        docenteSeleccionMultipleActual: null,
        numExcursionDefs: 0,
        excursionesDefinidasHoy: [], // Almacenará las excursiones procesadas para el día

        async init() {
            console.log("app.init() comenzando...");
            try {
                await this.loadData();
                console.log("app.init(): Datos cargados y procesados.");

                this.renderPeriodoSelector();
                this.renderDiaSelector();
                this.bindEvents();
                
                this.initCalendar();
                this.render();
                
                if (document.querySelectorAll('#contenedorDefinicionesAusencia .ausencia-definicion-bloque').length === 0) {
                    this.anadirBloqueAusencia();
                }
                if (document.querySelectorAll('#contenedorDefinicionesExcursion .excursion-definicion-bloque').length === 0) {
                    this.anadirBloqueExcursion();
                }

            } catch (error) {
                console.error("Error durante la inicialización o carga de datos:", error);
            }
            
            console.log("app.init() finalizado.");
            this.datos.historialTablas = this.datos.historialTablas || {};
        },

        determinarPeriodoActivo() {
            this.periodoActivo = 'oct-may';
        },

        saveData() {
            localStorage.setItem('datosSustituciones_v51M9_corr2', JSON.stringify(this.datos));
        },

        loadData() {
            return new Promise((resolve, reject) => {
                const clavesPosibles = ['datosSustituciones_v51M9_corr2'];
                let datosGuardados = null;
                for (const clave of clavesPosibles) {
                    datosGuardados = localStorage.getItem(clave);
                    if (datosGuardados) break;
                }

                if (datosGuardados) {
                    console.log("Datos cargados desde localStorage.");
                    try {
                        this.datos = JSON.parse(datosGuardados);
                        this.procesarDatosCargados();
                        resolve();
                    } catch (error) {
                        console.error("Error al parsear datos de localStorage:", error);
                        this.cargarDesdeJSON(resolve, reject);
                    }
                } else {
                    console.log("No se encontraron datos en localStorage. Intentando cargar desde archivo JSON por defecto...");
                    this.cargarDesdeJSON(resolve, reject);
                }
            });
        },

        cargarDesdeJSON(resolve, reject) {
            fetch('horario_maestros_2425.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('No se pudo cargar el archivo JSON de datos iniciales. Estado: ' + response.status);
                    }
                    return response.json();
                })
                .then(datosDesdeJSON => {
                    this.datos = datosDesdeJSON;
                    console.log("Datos cargados desde el archivo JSON por defecto.");
                    console.log("Primer docente del JSON:", this.datos.docentes && this.datos.docentes.length > 0 ? this.datos.docentes[0].nombre : "No hay docentes en el JSON");
                    this.procesarDatosCargados();
                    this.saveData();
                    resolve();
                })
                .catch(error => {
                    console.error('Error al cargar datos iniciales desde JSON:', error);
                    this.datos = { docentes: [], log: [], historialTablas: {} };
                    this.procesarDatosCargados();
                    resolve();
                });
        },

        procesarDatosCargados() {
            if (!this.datos.docentes) this.datos.docentes = [];
            
            this.datos.docentes.forEach(docente => {
                docente.sustitucionesHechas = docente.sustitucionesHechas || 0;
                docente.cargo = docente.cargo || "";
                docente.etapaDocente = docente.etapaDocente || "Primaria";
                docente.especialidadDocente = docente.especialidadDocente || "";
                
                const masterHorasDef = this.periodosLectivos['oct-may'].horas;
                let horarioNecesitaArreglo = !docente.horario;

                if (!horarioNecesitaArreglo) {
                    for (const dia of this.dias) {
                        if (!docente.horario[dia] || Object.keys(docente.horario[dia]).length !== masterHorasDef.length) {
                            horarioNecesitaArreglo = true;
                            break;
                        }
                        for (const horaMaster of masterHorasDef) {
                            const masterIdx = horaMaster.mapToMasterIndex;
                            if (!docente.horario[dia].hasOwnProperty(masterIdx) ||
                                typeof docente.horario[dia][masterIdx] !== 'object' ||
                                !docente.horario[dia][masterIdx].hasOwnProperty('estado')) {
                                horarioNecesitaArreglo = true;
                                break;
                            }

                            const estadoActual = docente.horario[dia][masterIdx].estado;
                            if (!this.estadosCelda.includes(estadoActual)) {
                                docente.horario[dia][masterIdx].estado = "Libre";
                                docente.horario[dia][masterIdx].asignatura = "";
                            }
                        }
                        if (horarioNecesitaArreglo) break;
                    }
                }

                if (horarioNecesitaArreglo) {
                    console.warn("Arreglando horario para docente:", docente.nombre);
                    docente.horario = {};
                    this.dias.forEach(dia => {
                        docente.horario[dia] = {};
                        masterHorasDef.forEach(horaMaster => {
                            docente.horario[dia][horaMaster.mapToMasterIndex] = {
                                estado: "Libre",
                                asignatura: ""
                            };
                        });
                    });
                }
            });

            if (!this.datos.log) this.datos.log = [];
            this.datos.log.forEach(entry => {
                if(entry.sustitucion && !entry.profesorSustituto) {
                    const partes = entry.sustitucion.split('→');
                    entry.profesorSustituto = partes[0] ? partes[0].trim() : "N/D";
                    entry.asignaturaSustituida = partes[1] ? partes[1].trim() : "N/D";
                    delete entry.sustitucion;
                }
                entry.observaciones = entry.observaciones || "";
            });

            if (!this.datos.historialTablas) this.datos.historialTablas = {};

            // Renderizar la interfaz después de procesar los datos
            this.render();
            document.getElementById('contenedorDefinicionesAusencia').innerHTML = '';
            this.numAusenciaDefs = 0;
            this.anadirBloqueAusencia();
        },

        resetData() {
            if (confirm("¿Estás seguro? Se borrarán todos los datos.")) {
                this.datos = { docentes: [], log: [] };
                this.resultadosSustitucionActuales = [];
                this.saveData();
                this.render();
                document.getElementById('resultadoSustitucion').innerHTML = '';
                this.renderTablaSustitucionesAsignadasHoy();
                alert("Datos eliminados.");
            }
        },

        bindEvents() {
            console.log("bindEvents() llamado.");

            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    tabContents.forEach(content => content.classList.remove('active'));
                    const targetTab = document.getElementById(button.dataset.tab);
                    if (targetTab) {
                        targetTab.classList.add('active');
                    }
                     if (button.dataset.tab === 'historialTab') {
                        this.renderHistorialTablas();
                    }
                });
            });

            const activeTabButton = document.querySelector('.tab-button.active') || document.querySelector('.tab-button[data-tab="sustitucionesTab"]');
            if (activeTabButton) {
                activeTabButton.click();
            } else {
                console.warn("No se encontró un botón de pestaña activo por defecto.");
            }

            // Botones principales
            const addDocenteBtn = document.getElementById('addDocenteBtn');
            if (addDocenteBtn) {
                addDocenteBtn.addEventListener('click', () => this.openDocenteModal());
            }

            const procesarBtn = document.getElementById('procesarTodasAusenciasBtn');
            if (procesarBtn) {
                procesarBtn.addEventListener('click', () => {
                console.log("Botón Procesar Ausencias clickeado");
                this.findAndAssignSustituto();
            });
            }

            const resetBtn = document.getElementById('resetAppBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => this.resetData());
            }

            const limpiarBtn = document.getElementById('limpiarResultadosBtn');
            if (limpiarBtn) {
                limpiarBtn.addEventListener('click', () => {
                document.getElementById('resultadoSustitucion').innerHTML = '';
                this.resultadosSustitucionActuales = [];
                this.renderTablaSustitucionesAsignadasHoy();
            });
            }

            // Lista de docentes
            const listaDocentes = document.getElementById('listaDocentes');
            if (listaDocentes) {
                listaDocentes.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-eliminar')) this.removeDocente(e.target.dataset.index);
                else if (e.target.classList.contains('btn-editar')) this.openDocenteModal(parseInt(e.target.dataset.index));
                else if (e.target.classList.contains('btn-mover-arriba')) this.moverDocente(e.target.dataset.index, -1);
                else if (e.target.classList.contains('btn-mover-abajo')) this.moverDocente(e.target.dataset.index, 1);
            });
            }

            // Contenedor de horarios
            const horariosContainer = document.getElementById('horariosContainer');
            if (horariosContainer) {
                horariosContainer.addEventListener('click', (e) => {
                const celda = e.target.closest('.horario-celda');
                if (celda && celda.dataset.horaIndexVisual !== undefined) {
                    if (this.modoSeleccionMultiple) {
                        this.toggleSeleccionCelda(celda);
                    } else {
                        const docenteIndex = celda.dataset.docenteIndex;
                        this.updateCell(docenteIndex, celda.dataset.dia, celda.dataset.horaIndexVisual);
                    }
                }
            });
            }

            // Botón de aplicar selección múltiple
            const btnAplicarMultiple = document.getElementById('btnAplicarMultiple');
            if (btnAplicarMultiple) {
                btnAplicarMultiple.addEventListener('click', () => this.aplicarASeleccionadas());
            }

            // Selector de periodo
            const periodoSelect = document.getElementById('periodoActivoSelect');
            if (periodoSelect) {
                periodoSelect.addEventListener('change', (e) => {
                    this.periodoActivo = e.target.value;
                    document.getElementById('contenedorDefinicionesAusencia').innerHTML = '';
                    this.numAusenciaDefs = 0;
                    this.anadirBloqueAusencia();
                    this.render();
                });
            } else {
                 console.error("CRITICAL: periodoActivoSelect no encontrado en bindEvents.");
            }

            // Botones de exportar/importar
            const exportBtn = document.getElementById('exportBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportData());
            }

            const importLabel = document.querySelector('label[for="importFile"]');
            const importFile = document.getElementById('importFile');
            if (importLabel && importFile) {
                importLabel.addEventListener('click', () => importFile.click());
                importFile.addEventListener('change', (e) => this.importData(e));
            }

            // Resultados de sustitución
            const resultadoSustitucion = document.getElementById('resultadoSustitucion');
            if (resultadoSustitucion) {
                resultadoSustitucion.addEventListener('change', (e) => {
                if (e.target.tagName === 'SELECT' && e.target.dataset.type === 'overrideSustituto') {
                    this.handleManualSustitutoOverride(e.target);
                }
            });
            }

            // Botón de copiar tabla
            const copiarTablaBtn = document.getElementById('copiarTablaSustitucionesBtn');
            if (copiarTablaBtn) {
                copiarTablaBtn.addEventListener('click', () => this.copiarTablaComoImagen('tablaSustitucionesAsignadas'));
            }

            // Botón de añadir ausencia
            const btnAnadirAusencia = document.getElementById('btnAnadirAusencia');
            if (btnAnadirAusencia) {
                btnAnadirAusencia.addEventListener('click', () => this.anadirBloqueAusencia());
            }

            // Contenedor de definiciones de ausencia
            const contenedorDefinicionesAusencia = document.getElementById('contenedorDefinicionesAusencia');
            if (contenedorDefinicionesAusencia) {
                contenedorDefinicionesAusencia.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-quitar-ausencia')) {
                    e.target.closest('.ausencia-definicion-bloque').remove();
                }
                if (e.target.type === 'checkbox' && e.target.classList.contains('todo-el-dia-checkbox')) {
                    const bloque = e.target.closest('.ausencia-definicion-bloque');
                    if (bloque) {
                        const horasCheckboxesEnBloque = bloque.querySelectorAll('.checkbox-container input[type="checkbox"][name^="horas-"]');
                        horasCheckboxesEnBloque.forEach(cb => cb.checked = e.target.checked);
                    }
                }
            });
            }

            // LISTENERS PARA EL MODAL DE GESTIÓN DE DOCENTES
            const modalGestionDocente = document.getElementById('modalGestionDocente');
            if (modalGestionDocente) {
                const modalDocenteClose = document.getElementById('modalDocenteClose');
                const btnCancelarDocenteModal = document.getElementById('btnCancelarDocenteModal');
                const btnGuardarDocenteModal = document.getElementById('btnGuardarDocenteModal');
                const docenteEspecialidadSelect = document.getElementById('docenteEspecialidadComunSelectModal');

                if (modalDocenteClose) modalDocenteClose.addEventListener('click', () => this.closeDocenteModal());
                if (btnCancelarDocenteModal) btnCancelarDocenteModal.addEventListener('click', () => this.closeDocenteModal());
                if (btnGuardarDocenteModal) btnGuardarDocenteModal.addEventListener('click', () => this.saveDocenteDesdeModal());
                if (docenteEspecialidadSelect) docenteEspecialidadSelect.addEventListener('change', () => this.updateDocenteModalCamposVisibles());

                modalGestionDocente.querySelectorAll('input[name="docenteEtapaModal"]').forEach(radio => {
                    radio.addEventListener('change', () => this.updateDocenteModalCamposVisibles());
                });
            }

            // Botón de añadir excursión
            const btnAnadirExcursion = document.getElementById('btnAnadirExcursion');
            if (btnAnadirExcursion) {
                btnAnadirExcursion.addEventListener('click', () => this.anadirBloqueExcursion());
            }

            // Contenedor de definiciones de excursión
            const contenedorDefinicionesExcursion = document.getElementById('contenedorDefinicionesExcursion');
            if (contenedorDefinicionesExcursion) {
                contenedorDefinicionesExcursion.addEventListener('click', (e) => {
                    if (e.target.classList.contains('btn-quitar-excursion')) {
                        e.target.closest('.excursion-definicion-bloque').remove();
                    }
                    if (e.target.type === 'checkbox' && e.target.classList.contains('todo-el-dia-excursion-checkbox')) {
                        const bloque = e.target.closest('.excursion-definicion-bloque');
                        if (bloque) {
                            const horasCheckboxesEnBloque = bloque.querySelectorAll('.checkbox-container input[type="checkbox"][name^="horas-excursion-"]');
                            horasCheckboxesEnBloque.forEach(cb => cb.checked = e.target.checked);
                        }
                    }
                });
            }

            const limpiarRegistroBtn = document.getElementById('limpiarRegistroBtn');
            if (limpiarRegistroBtn) {
                limpiarRegistroBtn.addEventListener('click', () => this.limpiarRegistro());
            }

            const resetSustitucionesDocentesBtn = document.getElementById('resetSustitucionesDocentesBtn');
            if (resetSustitucionesDocentesBtn) {
                resetSustitucionesDocentesBtn.addEventListener('click', () => this.resetContadoresSustitucionesDocentes());
            }
        },

        render() {
            console.log("app.render() llamado. Periodo activo:", this.periodoActivo);
            this.renderListaDocentes();
            this.renderTablaHorarios();
            this.renderLogSustituciones();
            this.renderTablaSustitucionesAsignadasHoy();
        },

        renderPeriodoSelector() {
            console.log("renderPeriodoSelector() llamado.");
            const select = document.getElementById('periodoActivoSelect');
            if (!select) {
                console.error("CRITICAL ERROR en renderPeriodoSelector: El elemento <select id='periodoActivoSelect'> NO FUE ENCONTRADO EN EL DOM.");
                return;
            }
            const currentValue = this.periodoActivo;
            select.innerHTML = '';
            for(const key in this.periodosLectivos) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = this.periodosLectivos[key].nombre;
                select.appendChild(option);
            }
            select.value = currentValue;
            console.log("renderPeriodoSelector() finalizado. Valor seleccionado:", select.value);
        },
        renderDiaSelector() {
            const diaSelect = document.getElementById('diaSelect');
            if (!diaSelect) { console.error("Selector de día no encontrado"); return; }
            const diaVal = diaSelect.value;
            diaSelect.innerHTML = '<option value="">Selecciona día...</option>';
            this.dias.forEach(dia => { diaSelect.innerHTML += `<option value="${dia}">${dia}</option>`; });
            if (diaVal) diaSelect.value = diaVal;
        },

        anadirBloqueAusencia() {
            this.numAusenciaDefs++;
            const idSuffix = this.numAusenciaDefs;
            const contenedor = document.getElementById('contenedorDefinicionesAusencia');
            if (!contenedor) {
                console.error("Contenedor para definiciones de ausencia no encontrado.");
                return;
            }

            const bloqueDiv = document.createElement('div');
            bloqueDiv.className = 'ausencia-definicion-bloque';
            bloqueDiv.id = `ausenciaBloque-${idSuffix}`;

            let htmlInterno = `<div class="input-group">
                                <label for="docenteAusenteSelect-${idSuffix}">Docente Ausente:</label>
                                <select id="docenteAusenteSelect-${idSuffix}" class="docente-ausente-selector">
                                    <option value="">Selecciona docente...</option>`;
            
            this.datos.docentes.forEach((docente, index) => {
                htmlInterno += `<option value="${index}">${docente.nombre}</option>`;
            });
            
            htmlInterno += `</select>
                            <button type="button" class="btn-quitar-ausencia" title="Quitar esta definición de ausencia">X</button>
                           </div>`;

            const periodoActual = this.periodosLectivos[this.periodoActivo];
            htmlInterno += `<div class="input-group">
                                <label for="horasCheckboxContainer-${idSuffix}">Horas de Ausencia (Periodo: ${periodoActual.nombre}):</label>
                                <div id="horasCheckboxContainer-${idSuffix}" class="checkbox-container">`;
            
            htmlInterno += `<label class="todo-el-dia-label">
                            <input type="checkbox" class="todo-el-dia-checkbox" name="todoElDia-${idSuffix}">
                            <strong>Todo el día</strong>
                           </label>`;

            // Mostrar las horas según el periodo activo
            periodoActual.horas.forEach(horaVisual => {
                // No mostrar checkboxes para horas exclusivas
                if (horaVisual.esLectiva || horaVisual.esRecreoGuardia) {
                    htmlInterno += `<label>
                        <input type="checkbox" name="horas-${idSuffix}" value="${horaVisual.mapToMasterIndex}">
                        ${horaVisual.nombre} (${horaVisual.horario})
                    </label>`;
                }
            });

            htmlInterno += `   </div>
                           </div><hr style="border-top: 1px solid #eee;">`;

            bloqueDiv.innerHTML = htmlInterno;
            contenedor.appendChild(bloqueDiv);
        },

        customGroupSort(grupoA_texto, grupoB_texto) {
            const parseForSort = (textoOriginal) => {
                const texto = textoOriginal.toUpperCase();
                let esInf = false, esPri = false, nivel = 99, letra = 'Z';

                const matchInf = texto.match(/(\d+)\s*AÑOS(?:\s*([A-Z]))?/);
                if (matchInf) {
                    esInf = true;
                    nivel = parseInt(matchInf[1]);
                    letra = matchInf[2] || '';
                } else {
                    const matchPri = texto.match(/(\d+)(?:[ºª°])?(?:\s*([A-Z]))?/);
                    if (matchPri) {
                        esPri = true;
                        nivel = parseInt(matchPri[1]);
                        letra = matchPri[2] || '';
                    } else {
                        return { esInf: false, esPri: false, nivel: 100 + (texto.charCodeAt(0) || 0), letra: textoOriginal, original: textoOriginal };
                    }
                }
                return { esInf, esPri, nivel, letra, original: textoOriginal };
            };

            const dataA = parseForSort(grupoA_texto);
            const dataB = parseForSort(grupoB_texto);

            // Infantil primero
            if (dataA.esInf && !dataB.esInf) return -1;
            if (!dataA.esInf && dataB.esInf) return 1;

            // Si ambos son Infantil o ambos son Primaria (o ambos fallback)
            if ((dataA.esInf && dataB.esInf) || (dataA.esPri && dataB.esPri) || (!dataA.esInf && !dataA.esPri && !dataB.esInf && !dataB.esPri)) {
                if (dataA.nivel !== dataB.nivel) {
                    return dataA.nivel - dataB.nivel;
                }
                return dataA.letra.localeCompare(dataB.letra);
            }
            
            // Si uno es Primaria y el otro es fallback (no Infantil)
            if (dataA.esPri && (!dataB.esInf && !dataB.esPri)) return -1;
            if (dataB.esPri && (!dataA.esInf && !dataA.esPri)) return 1;
            
            // Fallback general si todo lo demás falla
            return dataA.original.localeCompare(dataB.original);
        },

        obtenerTodosLosGruposActivos() {
            const grupos = new Set();
            const masterScheduleHours = this.periodosLectivos['oct-may'].horas;
            this.datos.docentes.forEach(docente => {
                if (docente.horario) {
                    this.dias.forEach(dia => {
                        if (docente.horario[dia]) {
                            masterScheduleHours.forEach(horaMaster => {
                                const masterIdx = horaMaster.mapToMasterIndex;
                                const celda = docente.horario[dia][masterIdx];
                                if (celda && celda.estado === 'Clase' && celda.asignatura) {
                                    const infoAsignatura = this.parseNivelGrupo(celda.asignatura, this.getEtapaClase(celda.asignatura));
                                    const grupoTextoOriginal = infoAsignatura.textoNivelGrupo.trim();
                                    if (grupoTextoOriginal) {
                                        grupos.add(grupoTextoOriginal);
                                    }
                                }
                            });
                        }
                    });
                }
            });
            // Aplicar ordenación personalizada
            return Array.from(grupos).sort((a, b) => this.customGroupSort(a, b));
        },

        anadirBloqueExcursion() {
            this.numExcursionDefs++;
            const idSuffix = this.numExcursionDefs;
            const contenedor = document.getElementById('contenedorDefinicionesExcursion');
            if (!contenedor) {
                console.error("Contenedor para definiciones de excursión no encontrado.");
                return;
            }

            const bloqueDiv = document.createElement('div');
            bloqueDiv.className = 'excursion-definicion-bloque';
            bloqueDiv.id = `excursionBloque-${idSuffix}`;

            let htmlInterno = `
                <div class="input-group">
                    <label for="gruposExcursionSelect-${idSuffix}">Grupos en Excursión:</label>
                    <select id="gruposExcursionSelect-${idSuffix}" class="grupos-excursion-selector">
                        <option value="">Selecciona un grupo...</option>
                    </select>
                    <button type="button" class="btn-quitar-excursion" title="Quitar esta definición de excursión">X</button>
                </div>
                <div class="input-group">
                    <label for="horasExcursionCheckboxContainer-${idSuffix}">Horas de la Excursión (Periodo: ${this.periodosLectivos[this.periodoActivo].nombre}):</label>
                    <div id="horasExcursionCheckboxContainer-${idSuffix}" class="checkbox-container">
                        <label class="todo-el-dia-label">
                            <input type="checkbox" class="todo-el-dia-excursion-checkbox" name="todoElDiaExcursion-${idSuffix}">
                            <strong>Toda la jornada escolar</strong>
                        </label>`;

            const horasDelPeriodoActivo = this.periodosLectivos[this.periodoActivo].horas;
            horasDelPeriodoActivo.forEach((horaVisual) => {
                if (horaVisual.esLectiva && horaVisual.mapToMasterIndex !== -1 && !horaVisual.esExclusiva) {
                    htmlInterno += `
                        <label>
                            <input type="checkbox" name="horas-excursion-${idSuffix}" value="${horaVisual.mapToMasterIndex}">
                            ${horaVisual.nombre} (${horaVisual.horario})
                        </label>`;
                }
            });

            htmlInterno += `
                    </div>
                </div>
                <hr style="border-top: 1px solid #eee;">`;

            bloqueDiv.innerHTML = htmlInterno;
            
            // Poblar el selector de grupos
            const selectGrupos = bloqueDiv.querySelector(`#gruposExcursionSelect-${idSuffix}`);
            if (selectGrupos) {
                const todosLosGrupos = this.obtenerTodosLosGruposActivos();
                if (todosLosGrupos.length === 0) {
                    const option = document.createElement('option');
                    option.value = "";
                    option.textContent = "No hay grupos en horarios";
                    option.disabled = true;
                    selectGrupos.appendChild(option);
                } else {
                    todosLosGrupos.forEach(grupo => {
                        const option = document.createElement('option');
                        option.value = grupo.toUpperCase().replace(/\\s+/g, '');
                        option.textContent = grupo;
                        selectGrupos.appendChild(option);
                    });
                }
            }

            // Añadir el bloque al contenedor
            contenedor.appendChild(bloqueDiv);

            // Configurar el botón de quitar excursión
            const btnQuitar = bloqueDiv.querySelector('.btn-quitar-excursion');
            if (btnQuitar) {
                btnQuitar.addEventListener('click', () => {
                    bloqueDiv.remove();
                });
            }

            // Configurar el checkbox de "todo el día"
            const todoElDiaCheckbox = bloqueDiv.querySelector('.todo-el-dia-excursion-checkbox');
            const horasCheckboxes = bloqueDiv.querySelectorAll('input[type="checkbox"][name^="horas-excursion-"]');
            
            if (todoElDiaCheckbox) {
                todoElDiaCheckbox.addEventListener('change', (e) => {
                    horasCheckboxes.forEach(cb => {
                        cb.checked = e.target.checked;
                    });
                });
            }
        },

        esGrupoDeExcursion(grupo, masterHoraIdx) {
            if (!this.excursionesDefinidasHoy || this.excursionesDefinidasHoy.length === 0) {
                return false;
            }

            const grupoNormalizado = grupo.toUpperCase().replace(/\s+/g, '');
            
            for (const excursion of this.excursionesDefinidasHoy) {
                if (excursion.horasMasterIndices.includes(masterHoraIdx)) {
                    if (excursion.grupos.includes(grupoNormalizado)) {
                        console.log(`Grupo ${grupoNormalizado} está de excursión en hora ${masterHoraIdx}`);
                        return true;
                    }
                }
            }
            return false;
        },

        esProfesorLiberadoPorExcursion(docentePotencial, dia, masterHoraIdx) {
            if (!this.excursionesDefinidasHoy || this.excursionesDefinidasHoy.length === 0) {
                return false;
            }

            const celdaDocente = docentePotencial.horario[dia]?.[masterHoraIdx];
            if (!celdaDocente || celdaDocente.estado !== 'Clase' || !celdaDocente.asignatura) {
                return false; // Solo se libera si tenía 'Clase' con una asignatura específica
            }

            const infoAsignatura = this.parseNivelGrupo(celdaDocente.asignatura, this.getEtapaClase(celdaDocente.asignatura));
            const grupoAsignaturaNormalizado = infoAsignatura.textoNivelGrupo.toUpperCase().replace(/\s+/g, '');

            if (!grupoAsignaturaNormalizado) return false;

            for (const excursion of this.excursionesDefinidasHoy) {
                if (excursion.horasMasterIndices.includes(masterHoraIdx)) {
                    if (excursion.grupos.includes(grupoAsignaturaNormalizado)) {
                        console.log(`Profesor ${docentePotencial.nombre} liberado en hora ${masterHoraIdx} porque el grupo ${grupoAsignaturaNormalizado} está de excursión.`);
                        return true;
                    }
                }
            }
            return false;
        },

        getEtapaClase(asignatura) {
            if (!asignatura) return "Desconocida";
            const asignaturaLower = asignatura.toLowerCase();

            if (asignaturaLower.includes("inf") ||
                asignaturaLower.includes("años") ||
                /\b[3-5]\s*años\b/i.test(asignatura)) {
                return "Infantil";
            }

            if (asignaturaLower.includes("pri") ||
                /\b[1-6][º°]\b/.test(asignatura) ||
                /\b(primero|segundo|tercero|cuarto|quinto|sexto)\b/i.test(asignaturaLower)) {
                return "Primaria";
            }

            return "Desconocida";
        },

        parseNivelGrupo(asignatura, etapaDeReferencia) {
            let nivel = '', grupoLetra = '', textoNivelGrupo = '';
            const infantilMatchAnos = asignatura.match(/\b(\d\s*años)\s*([A-Z])?\b/i);
            const primariaMatchGrado = asignatura.match(/\b(\d+)[ºª]\s*([A-Z])?\b/i);

            if (infantilMatchAnos) {
                nivel = infantilMatchAnos[1];
                grupoLetra = infantilMatchAnos[2] || '';
                textoNivelGrupo = nivel + (grupoLetra ? ' ' + grupoLetra : '');
            } else if (primariaMatchGrado) {
                nivel = primariaMatchGrado[1] + (etapaDeReferencia === "Primaria" ? 'º' : '');
                grupoLetra = primariaMatchGrado[2] || '';
                textoNivelGrupo = nivel + grupoLetra;
            }
            return { nivel: nivel.trim(), grupoLetra, textoNivelGrupo: textoNivelGrupo.trim() };
        },

        filtroComunDisponibilidad(docentePotencial, indexPotencial, docenteAusenteIndex, dia, masterHoraIdx, sustitutosOcupadosEnHora, globallyAbsentTeachersBySlot) {
            if (!docentePotencial || !docentePotencial.horario || !docentePotencial.horario[dia] || !docentePotencial.horario[dia][masterHoraIdx]) {
                return false;
            }
            const cellData = docentePotencial.horario[dia][masterHoraIdx];
            
            // Primero verificamos si está liberado por excursión
            const estaLiberadoPorExcursion = this.esProfesorLiberadoPorExcursion(docentePotencial, dia, masterHoraIdx);
            
            // Si no está liberado por excursión y su estado es 'No disponible', no puede sustituir
            if (!estaLiberadoPorExcursion && cellData.estado === 'No disponible') {
                return false;
            }

            // Verificaciones adicionales
            if (globallyAbsentTeachersBySlot[masterHoraIdx] && globallyAbsentTeachersBySlot[masterHoraIdx].has(indexPotencial)) return false;
            // Ya no filtramos por sustitutosOcupadosEnHora para permitir intercambios
            if (indexPotencial === docenteAusenteIndex) return false;

            // Si está liberado por excursión, se considera como 'Libre'
            if (estaLiberadoPorExcursion) return true;

            // Si no está liberado, debe cumplir alguna de estas condiciones
            return cellData.estado === 'Libre' ||
                   cellData.estado === 'Apoyo' ||
                   (cellData.estado === 'Clase' && cellData.asignatura && cellData.asignatura.toLowerCase().startsWith('apoyo'));
        },

        findAndAssignSustituto() {
            console.log("Inicio de findAndAssignSustituto. Verifique la consola para errores si no funciona.");
            const periodoActivoOriginalVisual = this.periodoActivo;

            const fechaInput = document.getElementById('fechaInput');
            const diaSelect = document.getElementById('diaSelect');
            if (!fechaInput.value) {
                alert("Por favor, selecciona una fecha válida en el calendario.");
                console.log("findAndAssignSustituto abortado: fechaInput sin valor.");
                return;
            }
            if (!diaSelect.value) {
                alert("Por favor, selecciona un día válido (o la fecha en el calendario para que se auto-seleccione).");
                console.log("findAndAssignSustituto abortado: diaSelect sin valor.");
                return;
            }
            console.log("Fecha y día validados. Fecha:", fechaInput.value, "Día Select:", diaSelect.value);

            this.excursionesDefinidasHoy = [];
            const bloquesExcursion = document.querySelectorAll('#contenedorDefinicionesExcursion .excursion-definicion-bloque');
            console.log("Número de bloques de excursión encontrados:", bloquesExcursion.length);

            bloquesExcursion.forEach((bloque, index) => {
                const gruposSelect = bloque.querySelector('.grupos-excursion-selector');
                const horasCheckboxes = bloque.querySelectorAll('.checkbox-container input[type="checkbox"][name^="horas-excursion-"]:checked');
                console.log(`Bloque excursión ${index}: Selector de grupos encontrado: ${!!gruposSelect}, Horas checkeadas: ${horasCheckboxes.length}`);
                
                if (gruposSelect && gruposSelect.value && horasCheckboxes.length > 0) {
                    const grupoSeleccionado = gruposSelect.value;
                    const horasMasterIndices = Array.from(horasCheckboxes).map(cb => parseInt(cb.value));
                    
                    if (grupoSeleccionado && horasMasterIndices.length > 0) {
                        this.excursionesDefinidasHoy.push({
                            grupos: [grupoSeleccionado],
                            horasMasterIndices: horasMasterIndices
                        });
                    }
                } else {
                    console.log(`Bloque excursión ${index} omitido: no hay grupo seleccionado o no hay horas seleccionadas.`);
                }
            });
            console.log("Excursiones definidas para hoy procesadas:", JSON.stringify(this.excursionesDefinidasHoy));

            this.periodoActivo = 'oct-may';
            console.log("Periodo activo para lógica interna fijado a:", this.periodoActivo);

            let diaSeleccionado = diaSelect.value;
            if (!diaSeleccionado) {
                const [diaNumStr, mesStr, anioStr] = fechaInput.value.split('/');
                const diaNum = parseInt(diaNumStr);
                const mesNum = parseInt(mesStr);
                const anioNum = parseInt(anioStr);
                // Validar que son números
                if (isNaN(diaNum) || isNaN(mesNum) || isNaN(anioNum)) {
                    alert("La fecha seleccionada no es válida. Por favor, selecciónela de nuevo desde el calendario.");
                    this.periodoActivo = periodoActivoOriginalVisual;
                    return;
                }
                const fecha = new Date(2000 + anioNum, mesNum - 1, diaNum);
                const dayIndex = (fecha.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
                if (dayIndex < this.dias.length) {
                    diaSeleccionado = this.dias[dayIndex];
                    diaSelect.value = diaSeleccionado;
                } else {
                    alert("Error: No se pudo determinar el día de la semana a partir de la fecha.");
                    this.periodoActivo = periodoActivoOriginalVisual;
                    console.log("findAndAssignSustituto abortado: No se pudo determinar día de la semana.");
                    return;
                }
            }
            console.log("Día seleccionado para ausencias:", diaSeleccionado);

            const definicionesAusencia = [];
            const bloquesAusencia = document.querySelectorAll('#contenedorDefinicionesAusencia .ausencia-definicion-bloque');
            console.log("Número de bloques de ausencia de docentes encontrados:", bloquesAusencia.length);

            bloquesAusencia.forEach((bloque, index) => {
                const docenteSelect = bloque.querySelector('.docente-ausente-selector');
                const docenteIndex = docenteSelect.value;
                if (docenteIndex === "") {
                    console.log(`Bloque ausencia ${index} omitido: docente no seleccionado.`);
                    return;
                }

                const horasCheckboxes = bloque.querySelectorAll('.checkbox-container input[type="checkbox"][name^="horas-"]:checked');
                const horasMasterIndices = Array.from(horasCheckboxes).map(cb => parseInt(cb.value));
                if (horasMasterIndices.length > 0) {
                    definicionesAusencia.push({
                        docenteIndex: parseInt(docenteIndex),
                        horasMasterIndices: horasMasterIndices
                    });
                } else {
                    console.log(`Bloque ausencia ${index} para docente ${docenteIndex} omitido: no hay horas seleccionadas.`);
                }
            });

            if (definicionesAusencia.length === 0 && this.excursionesDefinidasHoy.length === 0) {
                alert("Por favor, define al menos una ausencia de docente o una excursión.");
                this.periodoActivo = periodoActivoOriginalVisual;
                console.log("findAndAssignSustituto abortado: No hay ausencias ni excursiones definidas.");
                return;
            }
            console.log("Definiciones de ausencia procesadas:", JSON.stringify(definicionesAusencia));

            const globallyAbsentTeachersBySlot = {};
            const sustitutosOcupadosEnHora = {};
            const dailySubstitutionsCount = {};
            this.datos.docentes.forEach(doc => { dailySubstitutionsCount[doc.nombre] = 0; });

            definicionesAusencia.forEach(def => {
                def.horasMasterIndices.forEach(masterIdx => {
                    if (!globallyAbsentTeachersBySlot[masterIdx]) globallyAbsentTeachersBySlot[masterIdx] = new Set();
                    globallyAbsentTeachersBySlot[masterIdx].add(def.docenteIndex);
                });
            });

            this.resultadosSustitucionActuales = [];
            const logEntriesGlobales = [];

            definicionesAusencia.forEach(defAusencia => {
                const docenteAusente = this.datos.docentes[defAusencia.docenteIndex];
                if (!docenteAusente) return;

                defAusencia.horasMasterIndices.forEach(masterHoraIdx => {
                    if (masterHoraIdx === -1) return;

                    const celdaAusencia = docenteAusente.horario[diaSeleccionado][masterHoraIdx];
                    const horaDefMaster = this.periodosLectivos['oct-may'].horas.find(h => h.mapToMasterIndex === masterHoraIdx);
                    if (!horaDefMaster) return;

                    if (celdaAusencia && celdaAusencia.estado === 'No disponible') {
                        return;
                    }

                    let nombreHoraDisplay = horaDefMaster.nombre;
                    let franjaHorariaDisplay = horaDefMaster.horario;
                    // Para la visualización, usamos el periodoActivoOriginalVisual si es diferente de oct-may
                    const periodoParaDisplay = this.periodosLectivos[periodoActivoOriginalVisual] || this.periodosLectivos['oct-may'];
                    const horaVisualMatch = periodoParaDisplay.horas.find(h => h.mapToMasterIndex === masterHoraIdx);
                    
                    if (horaVisualMatch) {
                        nombreHoraDisplay = horaVisualMatch.nombre;
                        franjaHorariaDisplay = horaVisualMatch.horario;
                    }

                    let resultadoParaEstaHora = {
                        docenteAusenteNombre: docenteAusente.nombre,
                        docenteAusenteIndex: defAusencia.docenteIndex,
                        dia: diaSeleccionado,
                        horaMasterIndex: masterHoraIdx,
                        horaNombreDisplay: nombreHoraDisplay,
                        franjaHorariaDisplay: franjaHorariaDisplay,
                        asignaturaOriginal: (celdaAusencia && celdaAusencia.asignatura) ? celdaAusencia.asignatura : "N/A",
                        profesorSustitutoNombre: "Nadie disponible",
                        profesorSustitutoCargo: "",
                        disponiblesOriginalmente: [],
                        observacionesSustitucion: ""
                    };

                    if (resultadoParaEstaHora.asignaturaOriginal === "N/A" || (celdaAusencia && celdaAusencia.estado === 'Apoyo')) {
                        resultadoParaEstaHora.profesorSustitutoNombre = "No es necesario sustituir";
                        if (celdaAusencia && celdaAusencia.estado === 'Apoyo') {
                            resultadoParaEstaHora.observacionesSustitucion = "Originalmente era un Apoyo";
                        } else {
                            resultadoParaEstaHora.observacionesSustitucion = "Asignatura N/A";
                        }
                        this.resultadosSustitucionActuales.push(resultadoParaEstaHora);
                        return;
                    }

                    // Verificar si el grupo está de excursión
                    const infoAsignatura = this.parseNivelGrupo(celdaAusencia.asignatura, this.getEtapaClase(celdaAusencia.asignatura));
                    if (this.esGrupoDeExcursion(infoAsignatura.textoNivelGrupo, masterHoraIdx)) {
                        resultadoParaEstaHora.profesorSustitutoNombre = "No es necesario sustituir";
                        resultadoParaEstaHora.observacionesSustitucion = "Grupo está de excursión";
                        this.resultadosSustitucionActuales.push(resultadoParaEstaHora);
                        return;
                    }

                    if (horaDefMaster.esRecreoGuardia && celdaAusencia && celdaAusencia.esBiblioteca) {
                        resultadoParaEstaHora.profesorSustitutoNombre = "NO HAY BIBLIOTECA";
                        resultadoParaEstaHora.asignaturaOriginal = "Biblioteca";
                        this.resultadosSustitucionActuales.push(resultadoParaEstaHora);
                        return;
                    }
                    if (horaDefMaster.esRecreoGuardia) return;

                    if (celdaAusencia && celdaAusencia.estado === 'Clase' && !horaDefMaster.esExclusiva) {
                        const etapaClaseAusente = this.getEtapaClase(celdaAusencia.asignatura);
                        const docenteAusenteOriginal = this.datos.docentes[defAusencia.docenteIndex];
                        const categoriaMaestroOriginalAusente = docenteAusenteOriginal ? docenteAusenteOriginal.categoriaDocente : "Castellano";

                        let candidatosConPrioridad = this.datos.docentes
                            .map((docentePotencial, indexPotencial) => {
                                const prioridad = this.obtenerPrioridadProfesor(
                                    docentePotencial,
                                    celdaAusencia.asignatura,
                                    etapaClaseAusente,
                                    categoriaMaestroOriginalAusente,
                                    diaSeleccionado,
                                    masterHoraIdx
                                );
                                return {
                                    docente: docentePotencial,
                                    index: indexPotencial,
                                    prioridad: prioridad,
                                    claseOriginalSocioP0: (prioridad === 0.0 && docentePotencial.horario && 
                                                          docentePotencial.horario[diaSeleccionado] && 
                                                          docentePotencial.horario[diaSeleccionado][masterHoraIdx]) ?
                                                          docentePotencial.horario[diaSeleccionado][masterHoraIdx].asignatura : null
                                };
                            })
                            .filter(c => c.prioridad < 999 &&
                                       c.index !== defAusencia.docenteIndex &&
                                       !(globallyAbsentTeachersBySlot[masterHoraIdx] && globallyAbsentTeachersBySlot[masterHoraIdx].has(c.index)) &&
                                       (!(sustitutosOcupadosEnHora[masterHoraIdx] && sustitutosOcupadosEnHora[masterHoraIdx].has(c.docente.nombre)))
                            );

                        // Aplicar penalización por número de sustituciones hechas
                        candidatosConPrioridad.forEach(c => {
                            const subsHechas = dailySubstitutionsCount[c.docente.nombre] || 0;

                            // Aplicar penalización si el docente tiene 2 o más sustituciones,
                            // no es un intercambio de P0 (Religión/Valores), y no es PT/AL.
                            if (subsHechas >= 2 &&
                                c.prioridad !== 0.0 && // No es un intercambio de P0 con prioridad 0.0
                                !(c.docente.especialidadDocente === "PT" || c.docente.especialidadDocente === "AL") // No es PT ni AL
                            ) {
                                const originalPriority = c.prioridad;
                                c.prioridad += 10.0; // Penalización para hacerlo menos preferible
                                console.log(`PENALTY APPLIED: Teacher ${c.docente.nombre} (Subs: ${subsHechas}). Original Prio: ${originalPriority.toFixed(2)}, Penalized Prio: ${c.prioridad.toFixed(2)}.`);
                            }
                        });

                        // Ordenar candidatos por prioridad y número de sustituciones
                        candidatosConPrioridad.sort((a, b) => {
                            if (a.prioridad !== b.prioridad) {
                                return a.prioridad - b.prioridad;
                            }
                            // Si la prioridad (potencialmente penalizada) es la misma, desempatar por número de sustituciones
                            return (dailySubstitutionsCount[a.docente.nombre] || 0) - (dailySubstitutionsCount[b.docente.nombre] || 0);
                        });

                        resultadoParaEstaHora.disponiblesOriginalmente = candidatosConPrioridad.map(c => ({
                            nombre: c.docente.nombre,
                            cargo: c.docente.cargo || '',
                            etapa: c.docente.etapaDocente || '',
                            especialidad: c.docente.especialidadDocente || ''
                        }));

                        if (candidatosConPrioridad.length > 0) {
                            const mejorCandidato = candidatosConPrioridad[0];
                            resultadoParaEstaHora.profesorSustitutoNombre = mejorCandidato.docente.nombre;
                            resultadoParaEstaHora.profesorSustitutoCargo = mejorCandidato.docente.cargo || '';

                            // Actualizar contadores de sustituciones
                            dailySubstitutionsCount[mejorCandidato.docente.nombre] = (dailySubstitutionsCount[mejorCandidato.docente.nombre] || 0) + 1;
                            mejorCandidato.docente.sustitucionesHechas = (mejorCandidato.docente.sustitucionesHechas || 0) + 1;

                            sustitutosOcupadosEnHora[masterHoraIdx] = sustitutosOcupadosEnHora[masterHoraIdx] || new Set();
                            sustitutosOcupadosEnHora[masterHoraIdx].add(mejorCandidato.docente.nombre);

                            const asignaturaOriginalActual = resultadoParaEstaHora.asignaturaOriginal;
                            const asignaturaOriginalLower = asignaturaOriginalActual.toLowerCase();
                            const esReliOriginal = asignaturaOriginalLower.includes('religión') || asignaturaOriginalLower.includes('religion');
                            const esValOriginal = asignaturaOriginalLower.includes('valores');

                            if (esReliOriginal || esValOriginal) {
                                const infoClaseOriginal = this.parseNivelGrupo(asignaturaOriginalActual, etapaClaseAusente);
                                resultadoParaEstaHora.asignaturaMostrada = `Valores ${infoClaseOriginal.textoNivelGrupo || ''} (Todo el grupo)`.trim().replace(/\s\s+/g, ' ');
                                resultadoParaEstaHora.esP0Swap = mejorCandidato.prioridad === 0.0;
                            } else {
                                resultadoParaEstaHora.asignaturaMostrada = asignaturaOriginalActual;
                                resultadoParaEstaHora.esP0Swap = false;
                            }

                            if (!resultadoParaEstaHora.hasOwnProperty('asignaturaMostrada') || !resultadoParaEstaHora.asignaturaMostrada) {
                                resultadoParaEstaHora.asignaturaMostrada = asignaturaOriginalActual;
                            }

                            logEntriesGlobales.push({
                                fecha: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                docenteAusente: docenteAusente.nombre,
                                profesorSustituto: mejorCandidato.docente.nombre,
                                periodo: `${diaSeleccionado}, ${nombreHoraDisplay} (${franjaHorariaDisplay})`,
                                asignaturaSustituida: resultadoParaEstaHora.asignaturaMostrada,
                                observaciones: `Asignación automática (${dailySubstitutionsCount[mejorCandidato.docente.nombre]}ª sustitución del día)`
                            });
                        }
                    } else if (horaDefMaster.esExclusiva) {
                        resultadoParaEstaHora.profesorSustitutoNombre = "Exclusiva (No asignable)";
                        resultadoParaEstaHora.observacionesSustitucion = "Franja de exclusiva";
                    }
                    this.resultadosSustitucionActuales.push(resultadoParaEstaHora);
                });
            });

            if (logEntriesGlobales.length > 0) {
                this.datos.log.unshift(...logEntriesGlobales);
                if (this.datos.log.length > 200) this.datos.log = this.datos.log.slice(0, 200);
                this.saveData();
            }
            
            this.periodoActivo = periodoActivoOriginalVisual; // Restaurar periodo visual ANTES de renderizar tablas de resultados
            
            this.renderResultadosSustitucion();
            this.renderTablaSustitucionesAsignadasHoy();
            this.renderListaDocentes();
            this.renderLogSustituciones();
            
            console.log("Procesamiento de ausencias finalizado. Resultados antes de renderizar:", this.resultadosSustitucionActuales.length);
            
            this.periodoActivo = periodoActivoOriginalVisual;
            console.log("Periodo activo restaurado para visualización:", this.periodoActivo);
            
            this.renderResultadosSustitucion();
            this.renderTablaSustitucionesAsignadasHoy();
            this.renderListaDocentes();
            this.renderLogSustituciones();
            this.guardarTablaEnHistorial();
            console.log("Renderizaciones finales completadas.");
        },

        exportData: function() {
            const dataStr = JSON.stringify(this.datos);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const exportFileDefaultName = 'cuadrante_sustituciones_datos.json';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            alert("Datos exportados.");
        },

        importData: function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        if (importedData && typeof importedData.docentes !== 'undefined' && typeof importedData.log !== 'undefined') {
                            this.datos.docentes = importedData.docentes || [];
                            this.datos.log = importedData.log || [];
                            this.datos.docentes.forEach(docente => {
                                docente.sustitucionesHechas = docente.sustitucionesHechas || 0;
                                docente.cargo = docente.cargo || "";
                                docente.etapaDocente = docente.etapaDocente || "Primaria";
                                docente.especialidadDocente = docente.especialidadDocente || "";
                                const masterHorasDef = this.periodosLectivos['oct-may'].horas;
                                let horarioNecesitaArreglo = !docente.horario;
                                if (!horarioNecesitaArreglo) {
                                    for (const dia of this.dias) {
                                        if (!docente.horario[dia] || Object.keys(docente.horario[dia]).length !== masterHorasDef.length) { horarioNecesitaArreglo = true; break; }
                                        for (const horaMaster of masterHorasDef) {
                                            const masterIdx = horaMaster.mapToMasterIndex;
                                            if (!docente.horario[dia].hasOwnProperty(masterIdx) || typeof docente.horario[dia][masterIdx] !== 'object' || !docente.horario[dia][masterIdx].hasOwnProperty('estado')) { horarioNecesitaArreglo = true; break; }
                                            if (docente.horario[dia][masterIdx].estado === "Guardia") { docente.horario[dia][masterIdx].estado = "Libre"; docente.horario[dia][masterIdx].asignatura = ""; }
                                        }
                                        if (horarioNecesitaArreglo) break;
                                    }
                                }
                                if (horarioNecesitaArreglo) {
                                    console.warn("Arreglando horario para docente importado:", docente.nombre);
                                    docente.horario = {};
                                    this.dias.forEach(dia => {
                                        docente.horario[dia] = {};
                                        masterHorasDef.forEach(horaMaster => { docente.horario[dia][horaMaster.mapToMasterIndex] = { estado: "Libre", asignatura: "" }; });
                                    });
                                }
                            });
                            this.datos.log.forEach(entry => {
                                if(entry.sustitucion && !entry.profesorSustituto) {
                                    const partes = entry.sustitucion.split('→');
                                    entry.profesorSustituto = partes[0] ? partes[0].trim() : "N/D";
                                    entry.asignaturaSustituida = partes[1] ? partes[1].trim() : "N/D";
                                    delete entry.sustitucion;
                                }
                                entry.observaciones = entry.observaciones || "";
                            });
                            this.saveData(); this.render();
                            document.getElementById('contenedorDefinicionesAusencia').innerHTML = '';
                            this.numAusenciaDefs = 0; this.anadirBloqueAusencia();
                            alert('Datos importados correctamente.');
                        } else { alert('Error: El archivo importado no tiene el formato esperado (faltan "docentes" o "log").'); }
                    } catch (error) { console.error('Error al parsear el archivo JSON:', error); alert('Error al importar el archivo. Asegúrate de que es un archivo JSON válido y generado por esta aplicación.'); }
                };
                reader.onerror = () => { alert('Error al leer el archivo.'); };
                reader.readAsText(file);
            }
            if (event && event.target) event.target.value = null;
        },

        copiarTablaComoImagen: function(idTabla) {
            const tabla = document.getElementById(idTabla);
            if (!tabla) { alert("No se encontró la tabla a copiar."); return; }
            html2canvas(tabla).then(canvas => {
                canvas.toBlob(blob => {
                    if (!blob) { alert("No se pudo generar la imagen."); return; }
                    const item = new ClipboardItem({ "image/png": blob });
                    navigator.clipboard.write([item])
                        .then(() => { alert("Tabla copiada como imagen al portapapeles."); })
                        .catch(err => { console.error("Error al copiar al portapapeles:", err); alert("Error al copiar la imagen al portapapeles. Asegúrate de usar un navegador compatible."); });
                });
            });
        },

        addDocente: function() {
            const nombreInput = document.getElementById('nombreDocenteInput');
            const cargoInput = document.getElementById('cargoDocenteInput');
            const etapaInput = document.getElementById('etapaDocenteInput');
            const especialidadInput = document.getElementById('especialidadDocenteInput');
            const tipoDocenteInput = document.getElementById('tipoDocenteInput');

            const nombre = nombreInput.value.trim();
            const cargo = cargoInput.value.trim();
            const etapaDocente = etapaInput.value;
            let especialidadDocente = especialidadInput.value;
            const tipoDocente = tipoDocenteInput.value;

            if (!nombre || !cargo) { alert("Por favor, introduce nombre y cargo."); return; }

            let categoriaDocente;
            if (especialidadDocente === "Religion") categoriaDocente = "Religion";
            else if (especialidadDocente === "PT" || especialidadDocente === "AL") categoriaDocente = "PT/AL";
            else if (etapaDocente === "Infantil" && (cargo.toLowerCase().includes('ing') || cargo.toLowerCase().includes('inglés'))) categoriaDocente = "InfantilIngles";
            else categoriaDocente = tipoDocente;

            const docenteExistente = this.datos.docentes.find(d => d.nombre.toLowerCase() === nombre.toLowerCase() && d.cargo.toLowerCase() === cargo.toLowerCase());
            if (docenteExistente) { alert("Ya existe un docente con el mismo nombre y cargo."); return; }

            const nuevoHorario = {};
            const masterHorasDef = this.periodosLectivos['oct-may'].horas;
            this.dias.forEach(dia => {
                nuevoHorario[dia] = {};
                masterHorasDef.forEach(horaMaster => { nuevoHorario[dia][horaMaster.mapToMasterIndex] = { estado: "Libre", asignatura: "" }; });
            });

            this.datos.docentes.push({ nombre, cargo, horario: nuevoHorario, sustitucionesHechas: 0, etapaDocente, especialidadDocente, categoriaDocente });
            this.saveData(); this.render();
            document.querySelectorAll('.docente-ausente-selector').forEach(select => {
                const currentVal = select.value; select.innerHTML = '<option value="">Selecciona docente...</option>';
                this.datos.docentes.forEach((doc, idx) => { const infoDocente = `${doc.nombre} [${doc.etapaDocente} - ${doc.categoriaDocente}] (${doc.cargo})`; select.innerHTML += `<option value="${idx}">${infoDocente}</option>`; });
                select.value = currentVal;
            });
            nombreInput.value = ''; cargoInput.value = ''; etapaInput.value = 'Primaria'; especialidadInput.value = '';
        },

        editarDocente: function(indexStr) {
            const index = parseInt(indexStr);
            const docente = this.datos.docentes[index];
            if (!docente) return;

            const nuevoNombre = prompt(`Editar nombre para "${docente.nombre}":`, docente.nombre);
            if (nuevoNombre === null) return; const nombreTrimmed = nuevoNombre.trim();
            if (!nombreTrimmed) { alert("El nombre no puede estar vacío."); return; }

            const nuevoCargo = prompt(`Editar cargo para "${nombreTrimmed}":`, docente.cargo || "");
            if (nuevoCargo === null) return; const cargoTrimmed = nuevoCargo.trim();
            if (!cargoTrimmed) { alert("El cargo no puede estar vacío."); return; }

            const nuevaEtapa = prompt(`Editar Etapa Principal para "${nombreTrimmed}" (Infantil/Primaria):`, docente.etapaDocente || "Primaria");
            if (nuevaEtapa === null || (nuevaEtapa !== "Infantil" && nuevaEtapa !== "Primaria")) { alert("Etapa no válida."); return; }

            let nuevaEspecialidad = prompt(`Editar Especialidad para "${nombreTrimmed}" (Religion/PT/AL/InfantilIngles o dejar vacío):`, docente.especialidadDocente || "");
            if (nuevaEspecialidad === null || (nuevaEspecialidad !== "" && nuevaEspecialidad !== "Religion" && nuevaEspecialidad !== "PT" && nuevaEspecialidad !== "AL" && nuevaEspecialidad !== "InfantilIngles")) { alert("Especialidad no válida."); return; }

            let nuevaCategoria;
            if (nuevaEspecialidad === "Religion") nuevaCategoria = "Religion";
            else if (nuevaEspecialidad === "PT" || nuevaEspecialidad === "AL") nuevaCategoria = "PT/AL";
            else if (nuevaEspecialidad === "InfantilIngles" || (nuevaEtapa === "Infantil" && (cargoTrimmed.toLowerCase().includes('ing') || cargoTrimmed.toLowerCase().includes('inglés')))) { nuevaCategoria = "InfantilIngles"; nuevaEspecialidad = "InfantilIngles"; }
            else {
                let tipoDocente;
                do { tipoDocente = prompt(`Tipo de Docente para "${nombreTrimmed}" (Castellano/Bilingue):`, docente.categoriaDocente === "Bilingue" ? "Bilingue" : "Castellano"); if (tipoDocente === null) return; tipoDocente = tipoDocente.trim(); } while (tipoDocente !== "Castellano" && tipoDocente !== "Bilingue");
                nuevaCategoria = tipoDocente;
            }

            docente.nombre = nombreTrimmed; docente.cargo = cargoTrimmed; docente.etapaDocente = nuevaEtapa; docente.especialidadDocente = nuevaEspecialidad; docente.categoriaDocente = nuevaCategoria;
            this.saveData(); this.render();
            document.querySelectorAll('.docente-ausente-selector').forEach(select => {
                const currentVal = select.value; select.innerHTML = '<option value="">Selecciona docente...</option>';
                this.datos.docentes.forEach((doc, idx) => { const infoDocente = `${doc.nombre} [${doc.etapaDocente} - ${doc.categoriaDocente}] (${doc.cargo})`; select.innerHTML += `<option value="${idx}">${infoDocente}</option>`; });
                if (this.datos.docentes[currentVal]) select.value = currentVal; else select.value = "";
            });
            alert("Docente actualizado correctamente.");
        },

        moverDocente: function(indexStr, direccion) {
            const index = parseInt(indexStr);
            const newIndex = index + direccion;
            if (newIndex < 0 || newIndex >= this.datos.docentes.length) return;
            const [docenteMovido] = this.datos.docentes.splice(index, 1);
            this.datos.docentes.splice(newIndex, 0, docenteMovido);
            this.saveData(); this.render();
            document.querySelectorAll('.docente-ausente-selector').forEach(select => {
                const currentVal = select.value; select.innerHTML = '<option value="">Selecciona docente...</option>';
                this.datos.docentes.forEach((doc, idx) => { select.innerHTML += `<option value="${idx}">${doc.nombre}</option>`; });
                select.value = currentVal;
            });
        },

        removeDocente: function(indexStr) {
            const index = parseInt(indexStr);
            if (confirm(`¿Eliminar a ${this.datos.docentes[index].nombre}?`)) {
                this.datos.docentes.splice(index, 1); this.saveData(); this.render();
                document.querySelectorAll('.docente-ausente-selector').forEach(select => {
                    const currentVal = select.value; select.innerHTML = '<option value="">Selecciona docente...</option>';
                    this.datos.docentes.forEach((doc, idx) => { select.innerHTML += `<option value="${idx}">${doc.nombre}</option>`; });
                    if(this.datos.docentes[currentVal]) select.value = currentVal; else select.value = "";
                });
            }
        },

        updateCell: function(docenteIndex, dia, horaIndexVisual, esEdicionMultiple = false) {
            const modalOriginal = document.getElementById('modalEdicionCelda');
            if (!modalOriginal) {
                console.error('Modal de edición de celda no encontrado');
                return;
            }

            const nuevoModal = modalOriginal.cloneNode(true);
            modalOriginal.parentNode.replaceChild(nuevoModal, modalOriginal);

            const elementos = {
                estadoRadios: nuevoModal.querySelectorAll('input[name="estado"]'),
                opcionesClase: nuevoModal.querySelector('#opcionesClase'),
                opcionesApoyo: nuevoModal.querySelector('#opcionesApoyo'),
                opcionesNoDisponible: nuevoModal.querySelector('#opcionesNoDisponible'),
                btnGuardar: nuevoModal.querySelector('.btn-guardar'),
                btnCancelar: nuevoModal.querySelector('.btn-cancelar'),
                btnCerrar: nuevoModal.querySelector('.modal-close')
            };

            if (!elementos.opcionesClase || !elementos.opcionesApoyo || !elementos.opcionesNoDisponible ||
                !elementos.btnGuardar || !elementos.btnCancelar || !elementos.btnCerrar || elementos.estadoRadios.length === 0) {
                console.error("Faltan elementos esenciales en la estructura clonada del modal #modalEdicionCelda.");
                return;
            }

            const horaDefPeriodoActivo = this.periodosLectivos[this.periodoActivo].horas[horaIndexVisual];
            if (!horaDefPeriodoActivo) { return; }
            const masterHoraIndex = horaDefPeriodoActivo.mapToMasterIndex;

            // Manejo de Recreo/Biblioteca
            if (horaDefPeriodoActivo.nombre === "Recreo" && horaDefPeriodoActivo.esRecreoGuardia && !esEdicionMultiple) {
                const cellDataRecreo = this.datos.docentes[docenteIndex].horario[dia][masterHoraIndex];
                let changed = false;
                if (cellDataRecreo.estado === "Libre") {
                    const confirmacion = confirm("¿Desea asignar Biblioteca para este recreo?");
                    if (!confirmacion) {
                        if (nuevoModal.style.display === 'flex') { 
                            nuevoModal.classList.remove('show'); 
                            setTimeout(() => { nuevoModal.style.display = 'none'; }, 300); 
                        }
                        return;
                    }
                    cellDataRecreo.estado = "Clase"; 
                    cellDataRecreo.asignatura = "Biblioteca"; 
                    cellDataRecreo.esBiblioteca = true; 
                    changed = true;
                } else if (cellDataRecreo.estado === "Clase" && cellDataRecreo.esBiblioteca === true) {
                    cellDataRecreo.estado = "Libre"; 
                    cellDataRecreo.asignatura = ""; 
                    delete cellDataRecreo.esBiblioteca; 
                    changed = true;
                } else {
                    if (nuevoModal.style.display === 'flex') { 
                        nuevoModal.classList.remove('show'); 
                        setTimeout(() => { nuevoModal.style.display = 'none'; }, 300); 
                    }
                    return; 
                }
                if (changed) { 
                    this.saveData(); 
                    this.renderTablaHorarios(); 
                }
                return;
            }

            if (!esEdicionMultiple && horaDefPeriodoActivo.esExclusiva) {
                alert("La franja de Exclusiva no se puede modificar individualmente.");
                return;
            }

            nuevoModal.style.display = 'flex';
            requestAnimationFrame(() => { nuevoModal.classList.add('show'); });

            let cellDataToEdit = null;
            if (!esEdicionMultiple) {
                cellDataToEdit = this.datos.docentes[docenteIndex]?.horario[dia]?.[masterHoraIndex];
                if (!cellDataToEdit) {
                    console.error("Datos de celda no encontrados para edición individual:", { docenteIndex, dia, masterHoraIndex });
                    nuevoModal.classList.remove('show');
                    setTimeout(() => { nuevoModal.style.display = 'none'; }, 300);
                            return; 
                        }
            }

            const actualizarNivelesLocal = (etapa, contenedorOpciones) => {
                const nivelSelector = contenedorOpciones.querySelector('.nivel-selector');
                if (!nivelSelector) { 
                    console.warn("nivel-selector no encontrado en", contenedorOpciones); 
                                return;
                            }
                nivelSelector.innerHTML = '';
                if (etapa === 'Primaria') {
                    for (let i = 1; i <= 6; i++) { 
                        nivelSelector.innerHTML += `<button class="nivel-btn" data-nivel="${i}">${i}º</button>`; 
                    }
                } else {
                    for (let i = 3; i <= 5; i++) { 
                        nivelSelector.innerHTML += `<button class="nivel-btn" data-nivel="${i}">${i} años</button>`; 
                    }
                }
            };

            const limpiarSeleccionesLocal = (contenedor, specificSelectors = null) => {
                if (!contenedor) return;
                const selectorsToClean = specificSelectors || ['.nivel-btn.selected', '.grupo-btn.selected', '.asignatura-btn.selected', '.apoyo-asignatura-btn.selected'];
                selectorsToClean.forEach(selector => {
                    contenedor.querySelectorAll(selector).forEach(btn => btn.classList.remove('selected'));
                });
            };

            [elementos.opcionesClase, elementos.opcionesApoyo].forEach(opcionContenedor => {
                if (!opcionContenedor) return;

                const nivelSel = opcionContenedor.querySelector('.nivel-selector');
                if(nivelSel) nivelSel.addEventListener('click', e => {
                    const targetButton = e.target.closest('.nivel-btn');
                    if (targetButton) {
                        nivelSel.querySelectorAll('.nivel-btn.selected').forEach(btn => btn.classList.remove('selected'));
                        targetButton.classList.add('selected');
                    }
                });

                const grupoSel = opcionContenedor.querySelector('.grupo-selector');
                if(grupoSel) grupoSel.addEventListener('click', e => {
                    const targetButton = e.target.closest('.grupo-btn');
                    if (targetButton) {
                        grupoSel.querySelectorAll('.grupo-btn.selected').forEach(btn => btn.classList.remove('selected'));
                        targetButton.classList.add('selected');
                    }
                });

                if (opcionContenedor.id === 'opcionesClase') {
                    const asignaturasSel = opcionContenedor.querySelector('.asignaturas-grid');
                    if(asignaturasSel) asignaturasSel.addEventListener('click', e => {
                        const targetButton = e.target.closest('.asignatura-btn');
                        if (targetButton) {
                            asignaturasSel.querySelectorAll('.asignatura-btn.selected').forEach(btn => btn.classList.remove('selected'));
                            targetButton.classList.add('selected');
                        }
                    });
                } else if (opcionContenedor.id === 'opcionesApoyo') {
                    const apoyoAsignaturasSel = opcionContenedor.querySelector('.asignaturas-apoyo-primaria-grid');
                    if(apoyoAsignaturasSel) apoyoAsignaturasSel.addEventListener('click', e => {
                        const targetButton = e.target.closest('.apoyo-asignatura-btn');
                        if (targetButton) {
                            apoyoAsignaturasSel.querySelectorAll('.apoyo-asignatura-btn.selected').forEach(btn => btn.classList.remove('selected'));
                            targetButton.classList.add('selected');
                        }
                    });
                }
            });

            ['clase', 'apoyo'].forEach(tipo => {
                const contenedorOpciones = elementos[`opciones${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`];
                if (!contenedorOpciones) return;
                const radiosEtapa = contenedorOpciones.querySelectorAll(`input[name="etapa-${tipo}"]`);
                radiosEtapa.forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        const etapaSeleccionada = e.target.value;
                        actualizarNivelesLocal(etapaSeleccionada, contenedorOpciones);
                        limpiarSeleccionesLocal(contenedorOpciones);
                        const sinGrupoBtn = contenedorOpciones.querySelector('.grupo-selector .grupo-btn[data-grupo="ninguno"]');
                        if (sinGrupoBtn) sinGrupoBtn.classList.add('selected');

                        if (tipo === 'clase') {
                            const asignaturasGrid = contenedorOpciones.querySelector('.asignaturas-grid');
                            if (asignaturasGrid) asignaturasGrid.style.display = etapaSeleccionada === 'Infantil' ? 'none' : 'flex';
                        } else if (tipo === 'apoyo') {
                            const apoyoAsignaturaSelDiv = contenedorOpciones.querySelector('.apoyo-asignatura-selector');
                            if (apoyoAsignaturaSelDiv) {
                                apoyoAsignaturaSelDiv.style.display = etapaSeleccionada === 'Primaria' ? 'block' : 'none';
                                if (etapaSeleccionada === 'Primaria') {
                                    const matematicasBtn = apoyoAsignaturaSelDiv.querySelector('.apoyo-asignatura-btn[data-apoyo-asignatura="Matemáticas"]');
                                    if (matematicasBtn && !apoyoAsignaturaSelDiv.querySelector('.apoyo-asignatura-btn.selected')) {
                                        matematicasBtn.classList.add('selected');
                                    }
                                }
                            }
                        }
                    });
                });
            });

            if (esEdicionMultiple) {
                const claseRadio = nuevoModal.querySelector('input[name="estado"][value="Clase"]');
                if (claseRadio) {
                    claseRadio.checked = true;
                    this.mostrarOpcionesEstado('Clase', nuevoModal);
                }

                const opcionesClaseCont = elementos.opcionesClase;
                if (opcionesClaseCont) {
                    limpiarSeleccionesLocal(opcionesClaseCont);
                    const primariaRadioClase = opcionesClaseCont.querySelector('input[name="etapa-clase"][value="Primaria"]');
                    if (primariaRadioClase) {
                        primariaRadioClase.checked = true;
                        primariaRadioClase.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    const sinGrupoBtnClase = opcionesClaseCont.querySelector('.grupo-selector .grupo-btn[data-grupo="ninguno"]');
                    if (sinGrupoBtnClase) sinGrupoBtnClase.classList.add('selected');
                }

                const opcionesApoyoCont = elementos.opcionesApoyo;
                if (opcionesApoyoCont) {
                    limpiarSeleccionesLocal(opcionesApoyoCont);
                    const primariaRadioApoyo = opcionesApoyoCont.querySelector('input[name="etapa-apoyo"][value="Primaria"]');
                    if (primariaRadioApoyo) {
                        primariaRadioApoyo.checked = true;
                        primariaRadioApoyo.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    const sinGrupoBtnApoyo = opcionesApoyoCont.querySelector('.grupo-selector .grupo-btn[data-grupo="ninguno"]');
                    if (sinGrupoBtnApoyo) sinGrupoBtnApoyo.classList.add('selected');
                }

                const inputMotivoNoDisp = elementos.opcionesNoDisponible.querySelector('.input-asignatura');
                if (inputMotivoNoDisp) inputMotivoNoDisp.value = '';
            } else if (cellDataToEdit) {
                const estadoActual = cellDataToEdit.estado;
                const estadoRadio = nuevoModal.querySelector(`input[name="estado"][value="${estadoActual}"]`);
                if (estadoRadio) {
                    estadoRadio.checked = true;
                    this.mostrarOpcionesEstado(estadoActual, nuevoModal);
                    const currentAsignatura = cellDataToEdit.asignatura || "";

                    if (estadoActual === 'Clase' && elementos.opcionesClase) {
                        limpiarSeleccionesLocal(elementos.opcionesClase);
                        const matchInfantil = currentAsignatura.match(/^(\d+)\s+años(?:\s+([A-Z]))?$/i);
                        const matchPrimariaCompleta = currentAsignatura.match(/^(.+?)\s+(\d+)[ºª](?:\s+([A-Z]))?$/i);
                        const etapaDetectada = matchInfantil ? 'Infantil' : 'Primaria';
                        
                        const etapaRadioClase = elementos.opcionesClase.querySelector(`input[name="etapa-clase"][value="${etapaDetectada}"]`);
                        if (etapaRadioClase) {
                            etapaRadioClase.checked = true;
                            etapaRadioClase.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        
                        setTimeout(() => {
                            if (matchInfantil) {
                                const [, nivel, grupo] = matchInfantil;
                                const nivelBtn = elementos.opcionesClase.querySelector(`.nivel-selector .nivel-btn[data-nivel="${nivel}"]`);
                                if (nivelBtn) nivelBtn.click();
                                const grupoBtn = elementos.opcionesClase.querySelector(`.grupo-selector .grupo-btn[data-grupo="${grupo ? grupo.toUpperCase() : 'ninguno'}"]`);
                                if (grupoBtn) grupoBtn.click();
                            } else if (matchPrimariaCompleta) {
                                const [, materia, nivel, grupo] = matchPrimariaCompleta;
                                const nivelBtn = elementos.opcionesClase.querySelector(`.nivel-selector .nivel-btn[data-nivel="${nivel}"]`);
                                if (nivelBtn) nivelBtn.click();
                                const grupoBtn = elementos.opcionesClase.querySelector(`.grupo-selector .grupo-btn[data-grupo="${grupo ? grupo.toUpperCase() : 'ninguno'}"]`);
                                if (grupoBtn) grupoBtn.click();
                                const asignaturaBtn = elementos.opcionesClase.querySelector(`.asignaturas-grid .asignatura-btn[data-asignatura="${materia.trim()}"]`);
                                if (asignaturaBtn) asignaturaBtn.click();
                            } else {
                                const asignaturaBtn = elementos.opcionesClase.querySelector(`.asignaturas-grid .asignatura-btn[data-asignatura="${currentAsignatura.trim()}"]`);
                                if (asignaturaBtn) asignaturaBtn.click();
                                if (!elementos.opcionesClase.querySelector('.grupo-selector .grupo-btn.selected')) {
                                   const sinGrupoBtn = elementos.opcionesClase.querySelector('.grupo-selector .grupo-btn[data-grupo="ninguno"]');
                                   if (sinGrupoBtn) sinGrupoBtn.click();
                                }
                            }
                        }, 100);
                    } else if (estadoActual === 'Apoyo' && elementos.opcionesApoyo) {
                        limpiarSeleccionesLocal(elementos.opcionesApoyo);
                        const matchApoyoFull = currentAsignatura.match(/^Apoyo\s+(Primaria|Infantil)(?:\s+(\d+)(?:º| años))?(?:\s+([A-Z]))?$/i);
                        if (matchApoyoFull) {
                            const [, etapa, nivel, grupo] = matchApoyoFull;
                            const etapaRadioApoyo = elementos.opcionesApoyo.querySelector(`input[name="etapa-apoyo"][value="${etapa}"]`);
                            if (etapaRadioApoyo) {
                                etapaRadioApoyo.checked = true;
                                etapaRadioApoyo.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            setTimeout(() => {
                                if (nivel) {
                                    const nivelBtn = elementos.opcionesApoyo.querySelector(`.nivel-selector .nivel-btn[data-nivel="${nivel}"]`);
                                    if (nivelBtn) nivelBtn.click();
                                }
                                const grupoDetectado = grupo ? grupo.toUpperCase() : 'ninguno';
                                const grupoBtn = elementos.opcionesApoyo.querySelector(`.grupo-selector .grupo-btn[data-grupo="${grupoDetectado}"]`);
                                if (grupoBtn) grupoBtn.click();
                            }, 100);
                        } else {
                             const etapaRadioApoyo = elementos.opcionesApoyo.querySelector(`input[name="etapa-apoyo"][value="Primaria"]`);
                             if (etapaRadioApoyo) {
                                 etapaRadioApoyo.checked = true;
                                 etapaRadioApoyo.dispatchEvent(new Event('change', { bubbles: true }));
                             }
                             setTimeout(() => {
                                 const sinGrupoBtn = elementos.opcionesApoyo.querySelector('.grupo-selector .grupo-btn[data-grupo="ninguno"]');
                                 if (sinGrupoBtn) sinGrupoBtn.click();
                             }, 100);
                        }
                    } else if (estadoActual === 'No disponible' && elementos.opcionesNoDisponible) {
                        const inputMotivo = elementos.opcionesNoDisponible.querySelector('.input-asignatura');
                        if (inputMotivo) inputMotivo.value = currentAsignatura;
                    }
                } else {
                    const libreRadio = nuevoModal.querySelector('input[name="estado"][value="Libre"]');
                    if (libreRadio) libreRadio.checked = true;
                    this.mostrarOpcionesEstado('Libre', nuevoModal);
                }
            }

            elementos.estadoRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.mostrarOpcionesEstado(e.target.value, nuevoModal);
                });
            });

            const closeModalLocal = () => {
                nuevoModal.classList.remove('show');
                setTimeout(() => {
                    nuevoModal.style.display = 'none';
                    if (esEdicionMultiple) this.finalizarSeleccionMultiple(false);
                }, 300);
            };

            elementos.btnCerrar.addEventListener('click', closeModalLocal);
            elementos.btnCancelar.addEventListener('click', closeModalLocal);
            nuevoModal.addEventListener('click', e => { if (e.target === nuevoModal) closeModalLocal(); });

            elementos.btnGuardar.addEventListener('click', () => {
                const estadoSeleccionado = nuevoModal.querySelector('input[name="estado"]:checked')?.value;
                if (!estadoSeleccionado) { alert('Por favor, seleccione un estado.'); return; }
                let asignaturaFinal = '';

                switch (estadoSeleccionado) {
                    case 'Clase':
                        const opClaseCont = elementos.opcionesClase;
                        const etapaClase = opClaseCont.querySelector('input[name="etapa-clase"]:checked')?.value;
                        const nivelBtnClase = opClaseCont.querySelector('.nivel-selector .nivel-btn.selected');
                        const grupoBtnClase = opClaseCont.querySelector('.grupo-selector .grupo-btn.selected');
                        if (!etapaClase) { alert('Por favor, seleccione una etapa para la clase.'); return; }
                        if (!nivelBtnClase) { alert('Por favor, seleccione un nivel para la clase.'); return; }
                        const nivelClaseTexto = nivelBtnClase.textContent;
                        const grupoClaseValor = grupoBtnClase ? grupoBtnClase.dataset.grupo : 'ninguno';
                        if (etapaClase === 'Infantil') {
                            asignaturaFinal = `${nivelClaseTexto}${grupoClaseValor !== 'ninguno' ? ` ${grupoClaseValor.toUpperCase()}` : ''}`;
                        } else {
                            const asignaturaBtn = opClaseCont.querySelector('.asignaturas-grid .asignatura-btn.selected');
                            if (!asignaturaBtn) { alert('Por favor, seleccione una asignatura para Primaria.'); return; }
                            const nombreAsignatura = asignaturaBtn.dataset.asignatura;
                            asignaturaFinal = `${nombreAsignatura} ${nivelClaseTexto}${grupoClaseValor !== 'ninguno' ? ` ${grupoClaseValor.toUpperCase()}` : ''}`;
                        }
                        break;
                    case 'Apoyo':
                        const opApoyoCont = elementos.opcionesApoyo;
                        const etapaApoyo = opApoyoCont.querySelector('input[name="etapa-apoyo"]:checked')?.value;
                        const nivelBtnApoyo = opApoyoCont.querySelector('.nivel-selector .nivel-btn.selected');
                        const grupoBtnApoyo = opApoyoCont.querySelector('.grupo-selector .grupo-btn.selected');
                        if (!etapaApoyo) { alert('Por favor, seleccione una etapa para el apoyo.'); return; }
                        if (!nivelBtnApoyo) { alert('Por favor, seleccione un nivel para el apoyo.'); return; }
                        const nivelApoyoTexto = nivelBtnApoyo.textContent;
                        const grupoApoyoValor = grupoBtnApoyo ? grupoBtnApoyo.dataset.grupo : 'ninguno';
                        
                        if (etapaApoyo === 'Primaria') {
                            const apoyoAsignaturaSelDiv = opApoyoCont.querySelector('.apoyo-asignatura-selector');
                            const asignaturaApoyoBtn = apoyoAsignaturaSelDiv?.querySelector('.apoyo-asignatura-btn.selected');
                            if (!asignaturaApoyoBtn) {
                                alert('Por favor, seleccione una asignatura específica para el apoyo en Primaria.');
                                return;
                            }
                            const asignaturaApoyoEspecifica = asignaturaApoyoBtn.dataset.apoyoAsignatura;
                            asignaturaFinal = `Apoyo ${asignaturaApoyoEspecifica} ${nivelApoyoTexto}`;
                        } else {
                            asignaturaFinal = `Apoyo ${etapaApoyo} ${nivelApoyoTexto}`;
                        }
                        
                        if (grupoApoyoValor !== 'ninguno' && grupoApoyoValor) {
                            asignaturaFinal += ` ${grupoApoyoValor.toUpperCase()}`;
                        }
                        break;
                    case 'No disponible':
                        const motivo = elementos.opcionesNoDisponible.querySelector('.input-asignatura')?.value.trim();
                        if (!motivo && !esEdicionMultiple) { alert('Por favor, ingrese un motivo para "No disponible".'); return; }
                        asignaturaFinal = motivo || "No disponible";
                        break;
                    case 'Libre':
                        asignaturaFinal = '';
                        break;
                }

                asignaturaFinal = asignaturaFinal.trim().replace(/\s\s+/g, ' ');

                if (esEdicionMultiple) {
                    this.celdasSeleccionadas.forEach(celdaId => {
                        const [docIdx, d, hIdxVis] = celdaId.split('-');
                        const horaDefCelda = this.periodosLectivos[this.periodoActivo].horas[hIdxVis];
                        if (horaDefCelda.esExclusiva || horaDefCelda.esRecreoGuardia) return;
                        const masterIdxCelda = horaDefCelda.mapToMasterIndex;
                        if (masterIdxCelda !== -1) {
                            const cellData = this.datos.docentes[docIdx].horario[d][masterIdxCelda];
                            cellData.estado = estadoSeleccionado;
                            cellData.asignatura = asignaturaFinal;
                            delete cellData.esPantoja;
                            delete cellData.esBiblioteca;
                        }
                    });
                    this.finalizarSeleccionMultiple(true);
                } else {
                    const cellDataSingle = this.datos.docentes[docenteIndex].horario[dia][masterHoraIndex];
                    cellDataSingle.estado = estadoSeleccionado;
                    cellDataSingle.asignatura = asignaturaFinal;
                    delete cellDataSingle.esPantoja;
                    delete cellDataSingle.esBiblioteca;
                }

                this.saveData();
                this.renderTablaHorarios();
                closeModalLocal();
            });
        },

        mostrarOpcionesEstado: function(estado, modalInstance) {
            const context = modalInstance;
            if (!context) {
                console.error("mostrarOpcionesEstado: modalInstance no fue proporcionado.");
                return;
            }

            const opcionesClase = context.querySelector('#opcionesClase');
            const opcionesApoyo = context.querySelector('#opcionesApoyo');
            const opcionesNoDisponible = context.querySelector('#opcionesNoDisponible');

            if (opcionesClase) opcionesClase.style.display = estado === 'Clase' ? 'block' : 'none';
            if (opcionesApoyo) opcionesApoyo.style.display = estado === 'Apoyo' ? 'block' : 'none';
            if (opcionesNoDisponible) opcionesNoDisponible.style.display = estado === 'No disponible' ? 'block' : 'none';

            if (estado === 'Clase' && opcionesClase) {
                const asignaturasGrid = opcionesClase.querySelector('.asignaturas-grid');
                const etapaSeleccionadaRadio = opcionesClase.querySelector('input[name="etapa-clase"]:checked');
                const etapaSeleccionada = etapaSeleccionadaRadio ? etapaSeleccionadaRadio.value : 'Primaria';
                
                if (asignaturasGrid) {
                    asignaturasGrid.style.display = etapaSeleccionada === 'Infantil' ? 'none' : 'flex';
                }
            }
        },

        renderResultadosSustitucion: function() {
            const resultadoDiv = document.getElementById('resultadoSustitucion');
            if (!resultadoDiv) return;
            resultadoDiv.innerHTML = '';
            if (this.resultadosSustitucionActuales.length === 0) { resultadoDiv.innerHTML = "<p>No hay resultados.</p>"; return; }

            const agrupados = this.resultadosSustitucionActuales.reduce((acc, res) => {
                if (!acc[res.docenteAusenteNombre]) acc[res.docenteAusenteNombre] = { dia: res.dia, sustituciones: [] };
                acc[res.docenteAusenteNombre].sustituciones.push(res); return acc;
            }, {});

            let html = '';
            for (const nombreAusente in agrupados) {
                const data = agrupados[nombreAusente];
                html += `<h4>Modificar para ${nombreAusente} el ${data.dia}:</h4>
                         <table><thead><tr><th>Sesión</th><th>Tarea</th><th>Sustituto</th></tr></thead><tbody>`;
                data.sustituciones.forEach(res => {
                    const originalIndex = this.resultadosSustitucionActuales.findIndex(o => o.docenteAusenteNombre === res.docenteAusenteNombre && o.horaMasterIndex === res.horaMasterIndex && o.dia === res.dia);
                    html += `<tr><td>${res.horaNombreDisplay} (${res.franjaHorariaDisplay})</td><td>${res.asignaturaOriginal}</td><td>`;
                    if (res.profesorSustitutoNombre.includes("(No asignable)") || res.profesorSustitutoNombre === "No es clase/guardia asignable" || res.profesorSustitutoNombre === "NO HAY BIBLIOTECA" || res.profesorSustitutoNombre === "No es necesario sustituir") {
                        html += res.profesorSustitutoNombre;
                    } else {
                        html += `<select data-type="overrideSustituto" data-result-index="${originalIndex}">`;
                        const sustActual = this.datos.docentes.find(d => d.nombre === res.profesorSustitutoNombre);
                        if (sustActual) html += `<option value="${sustActual.nombre}" selected>${sustActual.nombre} [${sustActual.etapaDocente}] (${sustActual.cargo}) (Asignado)</option>`;
                        
                        // Mostrar los profesores disponibles según el orden de prelación original
                        res.disponiblesOriginalmente.forEach(prof => {
                            // Solo añadir si no es el sustituto actualmente asignado (para evitar duplicados si sustActual ya se añadió)
                            if (prof.nombre !== res.profesorSustitutoNombre) {
                                const docenteData = this.datos.docentes.find(d => d.nombre === prof.nombre);
                                const cargoCompleto = docenteData ? `[${docenteData.etapaDocente || prof.etapa}] (${docenteData.cargo || prof.cargo})` : `[${prof.etapa}] (${prof.cargo})`;
                                
                                const asignadoEn = this.resultadosSustitucionActuales.find(r => 
                                    r.horaMasterIndex === res.horaMasterIndex && 
                                    r.profesorSustitutoNombre === prof.nombre &&
                                    r.docenteAusenteNombre !== res.docenteAusenteNombre // Asegura que no es la misma ranura de sustitución
                                );
                                const etiquetaAsignado = asignadoEn ? ` (Asignado a ${asignadoEn.docenteAusenteNombre})` : '';
                                html += `<option value="${prof.nombre}">${prof.nombre} ${cargoCompleto}${etiquetaAsignado}</option>`;
                            }
                        });
                        
                        html += `</select>`;
                    }
                    html += `</td></tr>`;
                });
                html += `</tbody></table><hr>`;
            }
            resultadoDiv.innerHTML = html || "<p>No hay sustituciones asignables.</p>";

            // Agregar manejador de eventos para los selectores
            document.querySelectorAll('select[data-type="overrideSustituto"]').forEach(select => {
                select.addEventListener('change', (e) => {
                    const resultIndex = parseInt(e.target.dataset.resultIndex);
                    const nuevoSustituto = e.target.value;
                    const resultado = this.resultadosSustitucionActuales[resultIndex];
                    
                    if (nuevoSustituto === "Nadie disponible") {
                        resultado.profesorSustitutoNombre = nuevoSustituto;
                        resultado.profesorSustitutoCargo = "";
                    } else {
                        const docenteSeleccionado = this.datos.docentes.find(d => d.nombre === nuevoSustituto);
                        if (docenteSeleccionado) {
                            // Buscar si el nuevo sustituto ya está asignado en otra sustitución
                            const asignadoEn = this.resultadosSustitucionActuales.find(r => 
                                r.horaMasterIndex === resultado.horaMasterIndex && 
                                r.profesorSustitutoNombre === nuevoSustituto
                            );

                            if (asignadoEn) {
                                // Intercambiar los profesores
                                const profesorAnterior = resultado.profesorSustitutoNombre;
                                resultado.profesorSustitutoNombre = nuevoSustituto;
                                resultado.profesorSustitutoCargo = docenteSeleccionado.cargo;
                                asignadoEn.profesorSustitutoNombre = profesorAnterior;
                                const docenteAnterior = this.datos.docentes.find(d => d.nombre === profesorAnterior);
                                if (docenteAnterior) {
                                    asignadoEn.profesorSustitutoCargo = docenteAnterior.cargo;
                                }
                            } else {
                                resultado.profesorSustitutoNombre = nuevoSustituto;
                                resultado.profesorSustitutoCargo = docenteSeleccionado.cargo;
                            }
                        }
                    }
                    
                    // Volver a renderizar para actualizar la vista
                    this.renderResultadosSustitucion();
                    this.renderTablaSustitucionesAsignadasHoy();
                });
            });
        },

        renderTablaSustitucionesAsignadasHoy: function() {
            const container = document.getElementById('tablaSustitucionesAsignadasHoyContainer');
            if (!container) return;
            container.innerHTML = '';

            let fechaParaMostrar;
            const fechaInput = document.getElementById('fechaInput');
            if (fechaInput && fechaInput.value) {
                const [dia, mes, anio] = fechaInput.value.split('/');
                fechaParaMostrar = new Date(2000 + parseInt(anio), parseInt(mes) - 1, parseInt(dia));
            } else {
                fechaParaMostrar = new Date();
            }

            let diaParaCabecera = (this.resultadosSustitucionActuales.length > 0 && this.resultadosSustitucionActuales[0].dia) ?
                this.resultadosSustitucionActuales[0].dia :
                this.dias[(fechaParaMostrar.getDay() + 6) % 7];

            const fechaFormateada = `${fechaParaMostrar.getDate().toString().padStart(2, '0')}/${(fechaParaMostrar.getMonth() + 1).toString().padStart(2, '0')}/${fechaParaMostrar.getFullYear().toString().slice(-2)}`;
            const cabeceraColumnaDia = `${diaParaCabecera} (${fechaFormateada})`;

            let tablaHTML = `<table id="tablaSustitucionesAsignadas">
                <thead>
                    <tr>
                        <th style="background-color: #fdad00;">Sesión / Hora</th>
                        <th style="background-color: #fdad00;">${cabeceraColumnaDia}</th>
                    </tr>
                </thead>
                <tbody>`;

            const agrupadasPorHora = this.resultadosSustitucionActuales.reduce((acc, res) => {
                if (res.profesorSustitutoNombre === "No es necesario sustituir" && !res.asignaturaOriginal.toLowerCase().includes('biblioteca')) return acc; // Excluir "No es necesario" a menos que sea biblioteca (para NO HAY BIBLIOTECA)
                const clave = `${res.horaMasterIndex}`;
                if (!acc[clave]) acc[clave] = { sustituciones: [] };
                acc[clave].sustituciones.push(res);
                return acc;
            }, {});

            const horasDelPeriodoVisual = this.periodosLectivos[this.periodoActivo].horas;

            horasDelPeriodoVisual.forEach(horaVisual => {
                let rowStyle = '';
                if (horaVisual.esRecreoGuardia) {
                    rowStyle = ' style="background-color: #a0c4ff;"';
                } else if (horaVisual.esExclusiva) {
                    rowStyle = ' style="background-color: #ffd9a8;"';
                }

                tablaHTML += `<tr${rowStyle}><td>${horaVisual.nombre} (${horaVisual.horario})</td><td>`;

                if (this.periodoActivo === 'oct-may' && horaVisual.esExclusiva) {
                    tablaHTML += '&nbsp;';
                } else {
                    const horaDataAgrupada = agrupadasPorHora[horaVisual.mapToMasterIndex];
                    if (horaDataAgrupada && horaDataAgrupada.sustituciones.length > 0) {
                        
                        // <<< INICIO DE LA MODIFICACIÓN PARA ORDENAR >>>
                        horaDataAgrupada.sustituciones.sort((sustA, sustB) => {
                            const tareaOriginalA = sustA.asignaturaOriginal;
                            const tareaOriginalB = sustB.asignaturaOriginal;

                            const isBiblioA = sustA.profesorSustitutoNombre === "NO HAY BIBLIOTECA";
                            const isBiblioB = sustB.profesorSustitutoNombre === "NO HAY BIBLIOTECA";

                            if (isBiblioA && !isBiblioB) return -1;
                            if (!isBiblioA && isBiblioB) return 1;
                            if (isBiblioA && isBiblioB) return 0;

                            // Si una de las tareas es para un grupo de excursión y la otra no,
                            // la que no es de excursión (es decir, la sustitución real) va primero.
                            const infoGrupoTempA = this.parseNivelGrupo(tareaOriginalA, this.getEtapaClase(tareaOriginalA));
                            const grupoExcursionA = this.esGrupoDeExcursion(infoGrupoTempA.textoNivelGrupo, sustA.horaMasterIndex);
                            const infoGrupoTempB = this.parseNivelGrupo(tareaOriginalB, this.getEtapaClase(tareaOriginalB));
                            const grupoExcursionB = this.esGrupoDeExcursion(infoGrupoTempB.textoNivelGrupo, sustB.horaMasterIndex);

                            if (grupoExcursionA && !grupoExcursionB) return 1; // A (excursión) va después de B (no excursión)
                            if (!grupoExcursionA && grupoExcursionB) return -1; // B (excursión) va después de A (no excursión)

                            const etapaA = this.getEtapaClase(tareaOriginalA);
                            const etapaB = this.getEtapaClase(tareaOriginalB);

                            const infoGrupoA = this.parseNivelGrupo(tareaOriginalA, etapaA);
                            const infoGrupoB = this.parseNivelGrupo(tareaOriginalB, etapaB);
                            
                            return this.customGroupSort(infoGrupoA.textoNivelGrupo, infoGrupoB.textoNivelGrupo);
                        });
                        // <<< FIN DE LA MODIFICACIÓN PARA ORDENAR >>>

                        tablaHTML += horaDataAgrupada.sustituciones.map(res => {
                            // Comprobación para no mostrar sustituciones de grupos en excursión,
                            // a menos que sea el mensaje "Grupo está de excursión".
                            const infoGrupoSust = this.parseNivelGrupo(res.asignaturaOriginal, this.getEtapaClase(res.asignaturaOriginal));
                            if (this.esGrupoDeExcursion(infoGrupoSust.textoNivelGrupo, res.horaMasterIndex) &&
                                res.observacionesSustitucion !== "Grupo está de excursión") {
                                return '';
                            }

                            const tareaMostrada = res.asignaturaMostrada || res.asignaturaOriginal;
                            let textoSustitucion = "";

                            if (res.profesorSustitutoNombre === "NO HAY BIBLIOTECA") {
                                textoSustitucion = "NO HAY BIBLIOTECA";
                            } else if (res.observacionesSustitucion === "Grupo está de excursión") {
                                textoSustitucion = `Clase de ${res.asignaturaOriginal} no requiere sustitución (Grupo de excursión)`;
                            } else if (res.profesorSustitutoNombre === "No es necesario sustituir") {
                                 textoSustitucion = `Clase de ${res.asignaturaOriginal} no requiere sustitución (${res.observacionesSustitucion || ''})`;
                            }
                            else {
                                textoSustitucion = `${res.profesorSustitutoCargo || res.profesorSustitutoNombre} → ${tareaMostrada}`;
                            }
                            return `<div class="sustitucion-item">${textoSustitucion}</div>`;
                        }).join('');
                    }
                }
                tablaHTML += `</td></tr>`;
            });

            tablaHTML += `</tbody></table>`;
            container.innerHTML = tablaHTML;
        },

        renderTablaHorarios: function() {
            const container = document.getElementById('horariosContainer');
            if (!container) { console.error("Contenedor #horariosContainer no encontrado"); return; }
            container.innerHTML = ''; // Limpiar antes de volver a renderizar

            this.datos.docentes.forEach((docente, docenteIndex) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'docente-horario-wrapper';
                wrapper.dataset.docenteIndex = docenteIndex;

                // Crear el botón de selección múltiple
                const btnSeleccion = document.createElement('button');
                btnSeleccion.className = 'btn-seleccion-multiple';
                btnSeleccion.textContent = 'Selección múltiple';
                btnSeleccion.dataset.docenteIndex = docenteIndex;

                if (this.modoSeleccionMultiple && this.docenteSeleccionMultipleActual === docenteIndex.toString()) {
                    wrapper.classList.add('modo-seleccion-multiple');
                    btnSeleccion.classList.add('activo');
                    btnSeleccion.textContent = `✔ Aplicar cambios (${this.celdasSeleccionadas.size})`;
                }

                // Agregar el evento click al botón
                btnSeleccion.addEventListener('click', () => {
                    if (this.modoSeleccionMultiple && btnSeleccion.classList.contains('activo')) {
                        // Desactivar modo selección múltiple para este docente
                        this.modoSeleccionMultiple = false;
                        btnSeleccion.classList.remove('activo');
                        btnSeleccion.textContent = "Selección múltiple";
                        wrapper.classList.remove('modo-seleccion-multiple');

                        if (this.celdasSeleccionadas.size > 0) {
                            this.aplicarASeleccionadas();
                        }
                    } else {
                        // Si había otro docente en modo selección múltiple, reinícialo
                        if (this.docenteSeleccionMultipleActual && this.docenteSeleccionMultipleActual !== docenteIndex.toString()) {
                            const prevDocenteIdx = this.docenteSeleccionMultipleActual;
                            const prevWrapper = container.querySelector(`.docente-horario-wrapper[data-docente-index="${prevDocenteIdx}"]`);
                            if (prevWrapper) {
                                prevWrapper.classList.remove('modo-seleccion-multiple');
                                const prevBtn = prevWrapper.querySelector('.btn-seleccion-multiple');
                                if (prevBtn) {
                                    prevBtn.classList.remove('activo');
                                    prevBtn.textContent = "Selección múltiple";
                                }
                                prevWrapper.querySelectorAll('.horario-celda.seleccionada').forEach(c => c.classList.remove('seleccionada'));
                            }
                        }

                        // Si se cambia de docente o se activa por primera vez, limpiar selecciones previas
                        if (this.docenteSeleccionMultipleActual !== docenteIndex.toString() || !this.modoSeleccionMultiple) {
                            this.celdasSeleccionadas.clear();
                        }

                        this.modoSeleccionMultiple = true;
                        this.docenteSeleccionMultipleActual = docenteIndex.toString();

                        btnSeleccion.classList.add('activo');
                        btnSeleccion.textContent = `✔ Aplicar cambios (${this.celdasSeleccionadas.size})`;
                        wrapper.classList.add('modo-seleccion-multiple');
                    }
                });

                wrapper.appendChild(btnSeleccion);

                // Crear y añadir el H3
                const h3 = document.createElement('h3');
                h3.innerHTML = `${docente.nombre} <small style="color:#555;font-weight:normal;">(${docente.cargo || 'Sin cargo'})</small>`;
                wrapper.appendChild(h3);

                // Crear y añadir la tabla
                const table = document.createElement('table');
                const thead = document.createElement('thead');
                const theadRow = document.createElement('tr');

                // Añadir encabezados
                const thSesion = document.createElement('th');
                thSesion.className = 'sesion-header';
                thSesion.textContent = 'Sesión';
                theadRow.appendChild(thSesion);

                const thHora = document.createElement('th');
                thHora.className = 'hora-intervalo-header';
                thHora.textContent = 'Hora';
                theadRow.appendChild(thHora);

                this.dias.forEach(dia => {
                    const th = document.createElement('th');
                    th.textContent = dia;
                    theadRow.appendChild(th);
                });

                thead.appendChild(theadRow);
                table.appendChild(thead);

                // Crear tbody
                const tbody = document.createElement('tbody');
                const horasDelPeriodoActivo = this.periodosLectivos[this.periodoActivo].horas;

                horasDelPeriodoActivo.forEach((horaVisual, indexVisualEnPeriodoActivo) => {
                    const tr = document.createElement('tr');

                    // Celda Sesión
                    const tdSesion = document.createElement('td');
                    tdSesion.className = 'sesion-cell';
                    tdSesion.textContent = horaVisual.nombre;
                    tr.appendChild(tdSesion);

                    // Celda Hora
                    const tdHora = document.createElement('td');
                    tdHora.className = 'hora-intervalo-cell';
                    tdHora.textContent = horaVisual.horario;
                    tr.appendChild(tdHora);

                    // Celdas por día
                    this.dias.forEach(dia => {
                        const td = document.createElement('td');
                        const masterIdx = horaVisual.mapToMasterIndex;

                        // Asegurar que cellData exista
                        let cellData = null;
                        if (docente.horario && docente.horario[dia] && docente.horario[dia].hasOwnProperty(masterIdx)) {
                            cellData = docente.horario[dia][masterIdx];
                        } else {
                            if (!docente.horario) docente.horario = {};
                            if (!docente.horario[dia]) docente.horario[dia] = {};
                            docente.horario[dia][masterIdx] = { estado: "Libre", asignatura: "" };
                            cellData = docente.horario[dia][masterIdx];
                        }

                        // Configurar la celda según su tipo
                        if (this.periodoActivo === 'oct-may' && horaVisual.esExclusiva) {
                            td.className = "celda-exclusiva";
                            td.title = "Exclusiva (no modificable)";
                            td.textContent = "Exclusiva";
                        } else if (horaVisual.esRecreoGuardia) {
                            const esBiblioteca = cellData && cellData.esBiblioteca;
                            td.className = `horario-celda celda-recreo-guardia ${esBiblioteca ? 'celda-clase' : 'celda-libre'}`;
                            td.textContent = esBiblioteca ? 'Biblioteca' : 'Libre';
                            td.title = td.textContent;
                        } else if (horaVisual.esLectiva && masterIdx !== -1) {
                            const estado = (cellData && cellData.estado) ? cellData.estado.toLowerCase() : 'libre';
                            let classes = ['horario-celda'];

                            switch(estado) {
                                case 'apoyo':
                                    classes.push('celda-apoyo');
                                    td.textContent = cellData.asignatura || 'Apoyo';
                                    break;
                                case 'clase':
                                    classes.push('celda-clase');
                                    td.textContent = cellData.asignatura || 'Clase';
                                    break;
                                case 'no disponible':
                                    classes.push('celda-no-disponible');
                                    td.textContent = cellData.asignatura || 'No Disp.';
                                    break;
                                default:
                                    classes.push('celda-libre');
                                    td.textContent = 'Libre';
                            }

                            const celdaId = `${docenteIndex}-${dia}-${indexVisualEnPeriodoActivo}`;
                            if (this.celdasSeleccionadas.has(celdaId)) {
                                classes.push('seleccionada');
                            }

                            td.className = classes.join(' ');
                            td.title = td.textContent;
                        } else if (!horaVisual.esLectiva && !horaVisual.esExclusiva && !horaVisual.esRecreoGuardia) {
                            td.className = "celda-no-lectiva-fija";
                        }

                        // Añadir atributos de datos
                        td.dataset.docenteIndex = docenteIndex;
                        td.dataset.dia = dia;
                        td.dataset.horaIndexVisual = indexVisualEnPeriodoActivo;

                        tr.appendChild(td);
                    });

                    tbody.appendChild(tr);
                });

                table.appendChild(tbody);
                wrapper.appendChild(table);
                container.appendChild(wrapper);
            });
        },
        renderLogSustituciones: function() {
            const logBody = document.getElementById('logSustitucionesBody');
            if (!logBody) return;
            logBody.innerHTML = '';
            (this.datos.log || []).forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${entry.fecha || 'N/D'}</td><td>${entry.docenteAusente || 'N/D'}</td><td>${entry.profesorSustituto || 'N/D'}</td><td>${entry.periodo || 'N/D'}</td><td>${entry.asignaturaSustituida || 'N/D'}</td><td>${entry.observaciones || ''}</td>`;
                logBody.appendChild(tr);
            });
        },
        renderListaDocentes: function() {
            const lista = document.getElementById('listaDocentes');
            const contador = document.getElementById('contadorDocentes');
            if (!lista || !contador) return;
            contador.textContent = this.datos.docentes.length;
            lista.innerHTML = '';
            this.datos.docentes.forEach((docente, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<div class="docente-info"><strong>${docente.nombre}</strong><span class="cargo">${docente.cargo || 'Sin cargo'} - <i>Sust.: ${docente.sustitucionesHechas || 0}</i></span></div><div class="acciones-docente"><button class="btn-mover-arriba" data-index="${index}" title="Mover arriba" ${index === 0 ? 'disabled' : ''}>↑</button><button class="btn-mover-abajo" data-index="${index}" title="Mover abajo" ${index === this.datos.docentes.length - 1 ? 'disabled' : ''}>↓</button><button class="btn-editar" data-index="${index}" title="Editar docente">Editar</button><button class="btn-eliminar" data-index="${index}" title="Eliminar docente">Eliminar</button></div>`;
                lista.appendChild(li);
            });
        },

        initCalendar: function() {
            const fechaInput = document.getElementById('fechaInput');
            const calendarPopup = document.getElementById('calendarPopup');
            const prevMonthBtn = document.getElementById('prevMonth');
            const nextMonthBtn = document.getElementById('nextMonth');
            const currentMonthSpan = document.getElementById('currentMonth');
            const diaSelect = document.getElementById('diaSelect');
            const periodoActivoSelect = document.getElementById('periodoActivoSelect');

            if (!fechaInput || !calendarPopup || !prevMonthBtn || !nextMonthBtn || !currentMonthSpan || !diaSelect || !periodoActivoSelect) {
                console.error("No se encontraron todos los elementos necesarios para el calendario");
                return;
            }

            diaSelect.innerHTML = '<option value="">Selecciona día...</option>';
            this.dias.forEach(dia => {
                diaSelect.innerHTML += `<option value="${dia}">${dia}</option>`;
            });

            let currentDate = new Date();
            let selectedDate = null;
            
            // Avanzar al próximo día laborable si es fin de semana
            while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const actualizarDiaYPeriodoPorFecha = (date) => {
                // Actualizar el select de día (oculto)
                const dayIndex = (date.getDay() + 6) % 7; // Lunes = 0
                if (dayIndex < this.dias.length) {
                    diaSelect.value = this.dias[dayIndex];
                }

                // Determinar y actualizar periodoActivo
                const month = date.getMonth() + 1; // Enero es 0
                let nuevoPeriodo = 'oct-may';
                if (month === 9) {
                    nuevoPeriodo = 'septiembre';
                } else if (month === 6) {
                    nuevoPeriodo = 'junio';
                }

                if (this.periodoActivo !== nuevoPeriodo) {
                    this.periodoActivo = nuevoPeriodo;
                    periodoActivoSelect.value = nuevoPeriodo;

                    // Limpiar y regenerar bloques de ausencia y excursión para el nuevo periodo
                    document.getElementById('contenedorDefinicionesAusencia').innerHTML = '';
                    document.getElementById('contenedorDefinicionesExcursion').innerHTML = '';
                    this.numAusenciaDefs = 0;
                    this.numExcursionDefs = 0;
                    this.anadirBloqueAusencia();
                    this.anadirBloqueExcursion();
                }
                
                this.renderTablaSustitucionesAsignadasHoy();
            };

            const renderCalendar = (date) => {
                const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                currentMonthSpan.textContent = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                
                const calendarGrid = calendarPopup.querySelector('.calendar-grid');
                if (!calendarGrid) return;

                const daysHeaders = 'LMXJVSD'.split('').map(d => `<div>${d}</div>`).join('');
                let daysInMonth = '';
                
                let firstDayIndex = (firstDay.getDay() + 6) % 7;
                for (let i = 0; i < firstDayIndex; i++) {
                    daysInMonth += '<div></div>';
                }

                for (let i = 1; i <= lastDay.getDate(); i++) {
                    const currentDayDate = new Date(date.getFullYear(), date.getMonth(), i);
                    const dayOfWeek = currentDayDate.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isToday = currentDayDate.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate && currentDayDate.toDateString() === selectedDate.toDateString();
                    
                    const classes = ['calendar-day', isWeekend ? 'weekend' : '', isToday ? 'today' : '', isSelected ? 'selected' : ''].filter(Boolean).join(' ');
                    daysInMonth += `<div class="${classes}" data-date="${currentDayDate.toISOString()}">${i}</div>`;
                }
                
                calendarGrid.innerHTML = daysHeaders + daysInMonth;

                calendarGrid.querySelectorAll('.calendar-day[data-date]:not(.weekend)').forEach(day => {
                    day.addEventListener('click', () => {
                        const dateClicked = new Date(day.dataset.date);
                        selectedDate = dateClicked;
                        
                        const formattedDate = `${dateClicked.getDate().toString().padStart(2, '0')}/${(dateClicked.getMonth() + 1).toString().padStart(2, '0')}/${dateClicked.getFullYear().toString().slice(-2)}`;
                        fechaInput.value = formattedDate;
                        
                        actualizarDiaYPeriodoPorFecha(dateClicked);
                        calendarPopup.classList.remove('show');
                        
                        document.getElementById('resultadoSustitucion').innerHTML = '';
                        this.resultadosSustitucionActuales = [];
                    });
                });
            };

            prevMonthBtn.addEventListener('click', () => {
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
                renderCalendar(currentDate);
            });

            nextMonthBtn.addEventListener('click', () => {
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
                renderCalendar(currentDate);
            });

            fechaInput.addEventListener('click', () => {
                calendarPopup.classList.toggle('show');
                renderCalendar(currentDate);
            });

            document.addEventListener('click', (e) => {
                if (!calendarPopup.contains(e.target) && e.target !== fechaInput) {
                    calendarPopup.classList.remove('show');
                }
            });

            // Inicialización al cargar la página
            selectedDate = currentDate;
            const formattedInitDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear().toString().slice(-2)}`;
            fechaInput.value = formattedInitDate;
            
            actualizarDiaYPeriodoPorFecha(currentDate);
            renderCalendar(currentDate);
            this.render();
        },

        toggleModoSeleccionMultiple: function(docenteIndex, wrapper, btn) {
            const btnAplicar = document.getElementById('btnAplicarMultiple');
            if (this.modoSeleccionMultiple && this.docenteSeleccionMultipleActual === docenteIndex) { // Desactivar
                this.finalizarSeleccionMultiple();
            } else { // Activar o cambiar de docente
                this.finalizarSeleccionMultiple(false); // Limpiar cualquier otra selección activa sin guardar
                this.modoSeleccionMultiple = true;
                this.docenteSeleccionMultipleActual = docenteIndex;
                wrapper.classList.add('modo-seleccion-multiple');
                btn.classList.add('activo');
                if (btnAplicar) btnAplicar.style.display = 'block';
            }
        },

        toggleSeleccionCelda: function(celda) {
            // Solo permitir seleccionar celdas que no sean Exclusiva ni Recreo
            const horaDef = this.periodosLectivos[this.periodoActivo].horas[celda.dataset.horaIndexVisual];
            if ((this.periodoActivo === 'oct-may' && horaDef.esExclusiva) || horaDef.esRecreoGuardia) {
                alert("No se pueden seleccionar celdas de Exclusiva o Recreo para edición múltiple.");
                return;
            }

            const key = `${celda.dataset.docenteIndex}-${celda.dataset.dia}-${celda.dataset.horaIndexVisual}`;
            if (this.celdasSeleccionadas.has(key)) {
                this.celdasSeleccionadas.delete(key);
                celda.classList.remove('seleccionada');
            } else {
                this.celdasSeleccionadas.add(key);
                celda.classList.add('seleccionada');
            }

            // Actualizar el texto del botón activo con el contador
            const btnActivo = document.querySelector('.btn-seleccion-multiple.activo');
            if (btnActivo) {
                btnActivo.innerText = `✔ Aplicar cambios (${this.celdasSeleccionadas.size})`;
            }
        },

        aplicarASeleccionadas: function() {
            if (this.celdasSeleccionadas.size === 0) { alert('Por favor, selecciona al menos una celda.'); return; }
            const primeraCeldaId = Array.from(this.celdasSeleccionadas)[0];
            const [docenteIndex, dia, horaIndexVisual] = primeraCeldaId.split('-');
            this.updateCell(docenteIndex, dia, horaIndexVisual, true); // true para edición múltiple
        },

        finalizarSeleccionMultiple: function(guardar = true) { // `guardar` no se usa aquí pero podría ser útil
            this.modoSeleccionMultiple = false;
            this.docenteSeleccionMultipleActual = null;
            this.celdasSeleccionadas.clear();
            document.querySelectorAll('.docente-horario-wrapper.modo-seleccion-multiple').forEach(w => w.classList.remove('modo-seleccion-multiple'));
            document.querySelectorAll('.btn-seleccion-multiple.activo').forEach(b => b.classList.remove('activo'));
            document.querySelectorAll('.horario-celda.seleccionada').forEach(c => c.classList.remove('seleccionada'));
            const btnAplicar = document.getElementById('btnAplicarMultiple');
            if(btnAplicar) btnAplicar.style.display = 'none';
        },


        handleManualSustitutoOverride: function(selectElement) {
            const resultIndex = parseInt(selectElement.dataset.resultIndex);
            const nuevoSustitutoNombre = selectElement.value;
            const resultadoAfectado = this.resultadosSustitucionActuales[resultIndex];
            if (!resultadoAfectado) return;
            const profesorSustitutoOriginalNombre = resultadoAfectado.profesorSustitutoNombre;
            if (profesorSustitutoOriginalNombre === nuevoSustitutoNombre) return;

            const noSustituibles = ["Nadie disponible", "No es clase/guardia asignable", "Exclusiva (No asignable)", "NO HAY BIBLIOTECA", "No es necesario sustituir"];
            if (profesorSustitutoOriginalNombre && !noSustituibles.some(ns => profesorSustitutoOriginalNombre.includes(ns))) {
                const docenteOriginal = this.datos.docentes.find(d => d.nombre === profesorSustitutoOriginalNombre);
                if (docenteOriginal && docenteOriginal.sustitucionesHechas > 0) docenteOriginal.sustitucionesHechas--;
            }
            if (nuevoSustitutoNombre && !noSustituibles.some(ns => nuevoSustitutoNombre.includes(ns))) {
                const docenteNuevo = this.datos.docentes.find(d => d.nombre === nuevoSustitutoNombre);
                if (docenteNuevo) docenteNuevo.sustitucionesHechas = (docenteNuevo.sustitucionesHechas || 0) + 1;
            }

            resultadoAfectado.profesorSustitutoNombre = nuevoSustitutoNombre;
            if (nuevoSustitutoNombre && !noSustituibles.some(ns => nuevoSustitutoNombre.includes(ns))) {
                const sust = this.datos.docentes.find(d => d.nombre === nuevoSustitutoNombre);
                resultadoAfectado.profesorSustitutoCargo = sust ? sust.cargo : "";
                this.datos.log.unshift({ fecha: new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }), docenteAusente: resultadoAfectado.docenteAusenteNombre, profesorSustituto: nuevoSustitutoNombre, periodo: `${resultadoAfectado.dia}, ${resultadoAfectado.horaNombreDisplay} (${resultadoAfectado.franjaHorariaDisplay})`, asignaturaSustituida: resultadoAfectado.asignaturaOriginal, observaciones: 'Modificación manual' });
                if (this.datos.log.length > 200) this.datos.log = this.datos.log.slice(0, 200);
            } else resultadoAfectado.profesorSustitutoCargo = "";

            this.saveData(); this.renderTablaSustitucionesAsignadasHoy(); this.renderLogSustituciones(); this.renderListaDocentes(); this.guardarTablaEnHistorial();
        },

        guardarTablaEnHistorial: function() {
            if (!this.resultadosSustitucionActuales || this.resultadosSustitucionActuales.length === 0) return;
            const fechaInput = document.getElementById('fechaInput');
            if (!fechaInput || !fechaInput.value) return;
            const fecha = fechaInput.value;
            const tablaActual = { fecha, periodoActivo: this.periodoActivo, resultados: JSON.parse(JSON.stringify(this.resultadosSustitucionActuales)), timestamp: new Date().toISOString() };
            if (!this.datos.historialTablas) this.datos.historialTablas = {};
            if (!this.datos.historialTablas[fecha]) this.datos.historialTablas[fecha] = [];
            this.datos.historialTablas[fecha].push(tablaActual);
            try { this.saveData(); localStorage.setItem('historialTablas_v1', JSON.stringify(this.datos.historialTablas)); } catch (error) { console.error("Error al guardar historial:", error); }
            this.renderHistorialTablas();
        },

        renderHistorialTablas: function() {
            const container = document.getElementById('historialTablas'); if (!container) return;
            if (!this.datos.historialTablas) this.datos.historialTablas = {};
            let html = '<div class="historial-container">';
            const fechasOrdenadas = Object.keys(this.datos.historialTablas).sort((a, b) => {
                const [diaA, mesA, anioA] = a.split('/').map(Number); const [diaB, mesB, anioB] = b.split('/').map(Number);
                return new Date(2000 + anioB, mesB - 1, diaB) - new Date(2000 + anioA, mesA - 1, diaA);
            });
            if (fechasOrdenadas.length === 0) html += '<p>No hay tablas guardadas.</p>';
            else {
                fechasOrdenadas.forEach(fecha => {
                    const tablasDelDia = this.datos.historialTablas[fecha];
                    html += `<div class="historial-dia"><h3>${fecha}</h3><div class="historial-versiones">`;
                    tablasDelDia.forEach((tabla, index) => {
                        const hora = new Date(tabla.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        const numSust = tabla.resultados.filter(r => r.profesorSustitutoNombre && !r.profesorSustitutoNombre.includes("NO HAY BIBLIOTECA") && !r.profesorSustitutoNombre.includes("No es necesario sustituir")).length;
                        html += `<div class="version-tabla"><div class="version-info"><span class="version-titulo">Versión ${index + 1} (${hora})</span><span class="version-resumen">${numSust} sustituciones</span></div><div class="version-acciones"><button onclick="cuadranteApp.cargarTablaHistorial('${fecha}', ${index})" class="btn-cargar">Cargar</button><button onclick="cuadranteApp.eliminarTablaHistorial('${fecha}', ${index})" class="btn-eliminar">Eliminar</button></div></div>`;
                    });
                    html += `</div></div>`;
                });
            }
            html += '</div>'; container.innerHTML = html;
        },

        cargarTablaHistorial: function(fecha, index) {
            try {
                const historialGuardado = localStorage.getItem('historialTablas_v1');
                if (!historialGuardado) { alert("No se encontró historial."); return; }
                const historialTablas = JSON.parse(historialGuardado);
                if (!historialTablas[fecha] || !historialTablas[fecha][index]) { alert("Tabla no encontrada."); return; }
                if (confirm("¿Cargar esta tabla? Se sobrescribirá la tabla actual.")) {
                    const tabla = historialTablas[fecha][index];
                    this.resultadosSustitucionActuales = JSON.parse(JSON.stringify(tabla.resultados));
                    this.periodoActivo = tabla.periodoActivo || 'oct-may';
                    document.getElementById('fechaInput').value = fecha;
                    const [dia, mes, anio] = fecha.split('/');
                    const dayName = this.dias[(new Date(2000 + parseInt(anio), parseInt(mes) - 1, parseInt(dia)).getDay() + 6) % 7];
                    document.getElementById('diaSelect').value = dayName;
                    this.renderResultadosSustitucion(); this.renderTablaSustitucionesAsignadasHoy();
                    document.querySelector('.tab-button[data-tab="sustitucionesTab"]').click();
                }
            } catch (error) { console.error("Error al cargar tabla:", error); alert("Error al cargar la tabla."); }
        },

        eliminarTablaHistorial: function(fecha, index) {
            if (!this.datos.historialTablas[fecha] || !this.datos.historialTablas[fecha][index]) { alert("Tabla no encontrada."); return; }
            if (confirm("¿Eliminar esta versión?")) {
                this.datos.historialTablas[fecha].splice(index, 1);
                if (this.datos.historialTablas[fecha].length === 0) delete this.datos.historialTablas[fecha];
                this.saveData(); this.renderHistorialTablas();
            }
        },

        mostrarModalEdicionMultiple: function() {
            const modal = document.getElementById("modalEdicionCelda");
            if (!modal) return;

            // Mostrar modal
            modal.style.display = "flex";

            // Limpiar selección previa
            modal.querySelectorAll('input[type="radio"][name="estado"]').forEach(r => r.checked = false);
            document.getElementById("opcionesClase").style.display = "none";
            document.getElementById("opcionesApoyo").style.display = "none";
            document.getElementById("opcionesNoDisponible").style.display = "none";

            // Contar docentes afectados
            const docentesAfectados = new Set();
            this.celdasSeleccionadas.forEach(key => {
                const [docenteIndex] = key.split('-');
                docentesAfectados.add(docenteIndex);
            });

            // Resumen UX
            const resumen = document.createElement("div");
            resumen.classList.add("resumen-celdas");
            resumen.innerHTML = `
                <strong>Resumen de selección:</strong><br>
                - ${this.celdasSeleccionadas.size} celda(s) seleccionada(s)<br>
                - ${docentesAfectados.size} docente(s) afectado(s)
            `;
            const header = modal.querySelector(".modal-header");
            const existingResumen = header.querySelector(".resumen-celdas");
            if (existingResumen) {
                header.removeChild(existingResumen);
            }
            header.appendChild(resumen);
        },

        obtenerPrioridadProfesor: function(docentePotencialSustituto, asignaturaOriginalClaseAusente, etapaClaseAusente, categoriaMaestroOriginalAusente, dia, masterHoraIdx) {
            // --- Información básica del DOCENTE POTENCIAL SUSTITUTO ---
            if (!docentePotencialSustituto || !docentePotencialSustituto.horario || !docentePotencialSustituto.horario[dia] || !docentePotencialSustituto.horario[dia][masterHoraIdx]) {
                return 999; // No hay datos de horario
            }

            const celdaSustituto = docentePotencialSustituto.horario[dia][masterHoraIdx];
            let estadoSustituto = celdaSustituto.estado; // Estado original de la celda
            let asignaturaEnCeldaSustituto = celdaSustituto.asignatura || ""; // Usaremos este nombre de variable consistentemente

            // Primero, verificar si el profesor está liberado por excursión, ya que esto puede cambiar su estado a 'Libre'.
            if (this.esProfesorLiberadoPorExcursion(docentePotencialSustituto, dia, masterHoraIdx)) {
                estadoSustituto = 'Libre';
                asignaturaEnCeldaSustituto = 'Liberado por excursión';
                // console.log(`${docentePotencialSustituto.nombre} liberado por excursión en hora ${masterHoraIdx}. Nuevo estado: ${estadoSustituto}`);
            }

            // ***** COMPROBACIÓN GLOBAL PARA "No disponible" *****
            // Si después de considerar la excursión, el estado es 'No disponible', no puede sustituir.
            if (estadoSustituto === 'No disponible') {
                // Descomenta la siguiente sección si necesitas depurar específicamente a Marcos AL u otro profesor
                /*
                if (docentePotencialSustituto.nombre.includes("Marcos") && docentePotencialSustituto.especialidadDocente === "AL") {
                    console.log(`DEBUG OBTENER_PRIORIDAD: Marcos AL (o similar) detectado como 'No disponible' para hora ${masterHoraIdx} en día ${dia}. Celda original: ${celdaSustituto.estado}. Estado final: ${estadoSustituto}. Retornando 999.`);
                }
                */
                return 999; // Prioridad más baja, no será seleccionado.
            }
            // ***** FIN DE LA COMPROBACIÓN GLOBAL *****

            const esLibreSustituto = estadoSustituto === 'Libre';
            const esApoyoSustitutoGeneral = estadoSustituto === 'Apoyo' || (estadoSustituto === 'Clase' && asignaturaEnCeldaSustituto.toLowerCase().startsWith('apoyo'));

            const etapaSustituto = docentePotencialSustituto.etapaDocente;
            const especialidadSustituto = docentePotencialSustituto.especialidadDocente;
            const categoriaSustituto = docentePotencialSustituto.categoriaDocente;
            const cargoSustituto = docentePotencialSustituto.cargo;

            const infoClaseAusente = this.parseNivelGrupo(asignaturaOriginalClaseAusente, etapaClaseAusente);
            const nivelClaseAusenteNum = infoClaseAusente.nivel.match(/\d+/)?.[0];
            const textoNivelGrupoClaseAusente = infoClaseAusente.textoNivelGrupo;

            // --- PRIORIDAD 0: Intercambio Religión/Valores ---
            const esReliOriginalBase = asignaturaOriginalClaseAusente.toLowerCase().includes('religión') || asignaturaOriginalClaseAusente.toLowerCase().includes('religion');
            const esValOriginalBase = asignaturaOriginalClaseAusente.toLowerCase().includes('valores');
            const esReliSustitutoTaskBase = asignaturaEnCeldaSustituto.toLowerCase().includes('religión') || asignaturaEnCeldaSustituto.toLowerCase().includes('religion');
            const esValSustitutoTaskBase = asignaturaEnCeldaSustituto.toLowerCase().includes('valores');
            const esIntercambioP0Posible = (esReliOriginalBase && esValSustitutoTaskBase) || (esValOriginalBase && esReliSustitutoTaskBase);

            if (estadoSustituto === 'Clase' && esIntercambioP0Posible) { // Solo si el sustituto está en 'Clase' para el intercambio
                const infoAsignaturaSustituto = this.parseNivelGrupo(asignaturaEnCeldaSustituto, etapaSustituto);
                if (infoAsignaturaSustituto.textoNivelGrupo === textoNivelGrupoClaseAusente && textoNivelGrupoClaseAusente !== '') {
                    return 0.0;
                }
            }

            // --- MANEJO ESPECIAL Y EXCLUSIVO PARA PT y AL ---
            // Esta sección solo se alcanza si el estado NO es 'No disponible' (ya que se habría retornado 999).
            if (especialidadSustituto === "PT" || especialidadSustituto === "AL") {
                if (esLibreSustituto) { // Genuinamente libre en horario o liberado por excursión
                    if (etapaClaseAusente === "Primaria") {
                        return especialidadSustituto === "AL" ? 6.80 : 6.81; 
                    } else if (etapaClaseAusente === "Infantil") {
                        return especialidadSustituto === "AL" ? 15.80 : 15.81;
                    } else { 
                        return especialidadSustituto === "AL" ? 20.80 : 20.81; // Fallback
                    }
                } else { 
                    // No están 'Libre' y tampoco 'No disponible' (manejado arriba).
                    // Están en su sesión PT/AL programada (estado 'Apoyo' o 'Clase'), que se cancelaría.
                    if (etapaClaseAusente === "Primaria") {
                        return especialidadSustituto === "AL" ? 6.90 : 6.91;
                    } else if (etapaClaseAusente === "Infantil") {
                        return especialidadSustituto === "AL" ? 15.90 : 15.91;
                    } else {
                        return especialidadSustituto === "AL" ? 20.90 : 20.91; // Fallback
                    }
                }
            }
            
            // --- Si el profesor NO es PT/AL, y no fue P0, continuar ---
            // Requisito de disponibilidad para profesores generalistas (ya sabemos que no es 'No disponible')
            if (!esLibreSustituto && !esApoyoSustitutoGeneral) {
                return 999; 
            }

            // Funciones auxiliares de coincidencia (sin cambios)
            const apoyoCoincideConTextoNivelGrupo = (asignaturaApoyo, etapaApoyo, textoNivelGrupoReferencia) => {
                if (!asignaturaApoyo || !textoNivelGrupoReferencia) return false;
                const infoApoyo = this.parseNivelGrupo(asignaturaApoyo, etapaApoyo);
                return infoApoyo.textoNivelGrupo.toUpperCase().replace(/\s+/g, '') === textoNivelGrupoReferencia.toUpperCase().replace(/\s+/g, '');
            };
            const apoyoCoincideConNivelNum = (asignaturaApoyo, etapaApoyo, nivelNumReferencia) => {
                if (!asignaturaApoyo || !nivelNumReferencia) return false;
                const infoApoyo = this.parseNivelGrupo(asignaturaApoyo, etapaApoyo);
                const nivelApoyoNum = infoApoyo.nivel.match(/\d+/)?.[0];
                return nivelApoyoNum === nivelNumReferencia;
            };
            
            // Lógica para Primaria (docentes NO PT/AL)
            if (etapaClaseAusente === "Primaria") {
                if (etapaSustituto === "Primaria") {
                    if (esApoyoSustitutoGeneral && apoyoCoincideConTextoNivelGrupo(asignaturaEnCeldaSustituto, etapaSustituto, textoNivelGrupoClaseAusente)) {
                        if (categoriaSustituto === "Castellano") return 1.10;
                        if (categoriaSustituto === "Bilingue") return 1.20;
                        return 1.30;
                    }
                    if (esApoyoSustitutoGeneral && apoyoCoincideConNivelNum(asignaturaEnCeldaSustituto, etapaSustituto, nivelClaseAusenteNum) && !apoyoCoincideConTextoNivelGrupo(asignaturaEnCeldaSustituto, etapaSustituto, textoNivelGrupoClaseAusente) ) {
                        if (categoriaSustituto === "Castellano" && categoriaMaestroOriginalAusente === "Castellano") return 2.10;
                        if (categoriaSustituto === "Bilingue" && categoriaMaestroOriginalAusente === "Bilingue") return 2.20;
                        if (categoriaSustituto === "Castellano" || categoriaSustituto === "Bilingue") return 2.30;
                    }
                    if (especialidadSustituto === "Religion") {
                        return esApoyoSustitutoGeneral ? 3.00 : 3.01;
                    }
                    if (categoriaSustituto === "Castellano" && categoriaMaestroOriginalAusente === "Castellano") {
                        return esApoyoSustitutoGeneral ? 4.10 : 4.11;
                    }
                    if (categoriaSustituto === "Bilingue" && categoriaMaestroOriginalAusente === "Bilingue") {
                        return esApoyoSustitutoGeneral ? 4.20 : 4.21;
                    }
                    if (cargoSustituto && cargoSustituto.toLowerCase().includes('tutor')) {
                        return esApoyoSustitutoGeneral ? 4.50 : 4.51;
                    }
                    if (categoriaSustituto === "Castellano" || categoriaSustituto === "Bilingue") {
                        return esApoyoSustitutoGeneral ? 4.80 : 4.81;
                    }
                } else if (etapaSustituto === "Infantil") { // Infantil (NO PT/AL) cubriendo Primaria
                    if (esLibreSustituto) return 7.10;
                    if (esApoyoSustitutoGeneral) return 7.00;
                }
            }

            // Lógica para Infantil (docentes NO PT/AL)
            if (etapaClaseAusente === "Infantil") {
                if (etapaSustituto === "Infantil") {
                    if (esApoyoSustitutoGeneral && apoyoCoincideConTextoNivelGrupo(asignaturaEnCeldaSustituto, etapaSustituto, textoNivelGrupoClaseAusente)) {
                        if (cargoSustituto && cargoSustituto.toLowerCase().includes('tutor') && apoyoCoincideConTextoNivelGrupo(cargoSustituto, etapaSustituto, textoNivelGrupoClaseAusente)) return 11.10;
                        if (categoriaSustituto === "InfantilIngles") return 11.20;
                        if (cargoSustituto && cargoSustituto.toLowerCase().includes('tutor')) return 11.30;
                        return 11.40;
                    }
                    if (especialidadSustituto === "Religion") {
                        return esApoyoSustitutoGeneral ? 12.00 : 12.01;
                    }
                    if (cargoSustituto && cargoSustituto.toLowerCase().includes('tutor') && apoyoCoincideConTextoNivelGrupo(cargoSustituto, etapaSustituto, textoNivelGrupoClaseAusente)) {
                         return esApoyoSustitutoGeneral ? 12.20 : 12.21;
                    }
                    if (esApoyoSustitutoGeneral) {
                        if (categoriaSustituto === "InfantilIngles") return 13.20;
                        return 13.10;
                    }
                    if (esLibreSustituto) {
                        if (categoriaSustituto === "InfantilIngles") return 13.61;
                        if (cargoSustituto && cargoSustituto.toLowerCase().includes('tutor')) return 13.71;
                        return 13.81;
                    }
                } else if (etapaSustituto === "Primaria") { // Primaria (NO PT/AL) cubriendo Infantil
                    if (esLibreSustituto) return 16.10;
                    if (esApoyoSustitutoGeneral) return 16.00;
                }
            }

            return 999; // Default si ninguna regla aplica
        },

        openDocenteModal: function(docenteIndex = null) {
            const elementos = {
                modal: document.getElementById('modalGestionDocente'),
                titulo: document.getElementById('modalDocenteTitulo'),
                nombreInput: document.getElementById('docenteNombreInputModal'),
                cargoInput: document.getElementById('docenteCargoInputModal'),
                editIndex: document.getElementById('docenteEditIndex'),
                especialidadComunSelect: document.getElementById('docenteEspecialidadComunSelectModal'),
                tipoDocentePrimariaSelect: document.getElementById('docenteTipoSelectModal'),
                esInglesInfantilCheckbox: document.getElementById('docenteEsInglesInfantilCheckboxModal'),
                primariaOptionsDiv: document.getElementById('primariaOptionsModalContainer'),
                infantilOptionsDiv: document.getElementById('infantilOptionsModalContainer')
            };

            // Verificar elementos requeridos
            for (const [key, elemento] of Object.entries(elementos)) {
                if (!elemento) {
                    console.error(`Error en openDocenteModal: Elemento ${key} no encontrado`);
                    return;
                }
            }

            const radiosEtapa = elementos.modal.querySelectorAll('input[name="docenteEtapaModal"]');
            if (!radiosEtapa.length) {
                console.error('Error en openDocenteModal: No se encontraron radios de etapa');
                return;
            }

            // Limpiar estado anterior
            elementos.editIndex.value = docenteIndex !== null ? docenteIndex : '';
            elementos.nombreInput.value = '';
            elementos.cargoInput.value = '';
            elementos.especialidadComunSelect.value = '';
            elementos.tipoDocentePrimariaSelect.value = 'Castellano';
            elementos.esInglesInfantilCheckbox.checked = false;
            radiosEtapa.forEach(radio => radio.checked = radio.value === "Primaria");

            // Cargar datos si estamos editando
            if (docenteIndex !== null) {
                const docente = this.datos.docentes[docenteIndex];
                if (!docente) {
                    console.error(`Error en openDocenteModal: Docente con índice ${docenteIndex} no encontrado`);
                    return;
                }

                elementos.titulo.textContent = 'Editar Docente';
                elementos.nombreInput.value = docente.nombre || '';
                elementos.cargoInput.value = docente.cargo || '';

                // Configurar etapa
                radiosEtapa.forEach(radio => {
                    radio.checked = (radio.value === docente.etapaDocente);
                });

                // Configurar especialidad
                elementos.especialidadComunSelect.value = docente.especialidadDocente === "InfantilIngles" ? "" : (docente.especialidadDocente || "");

                // Configurar opciones específicas según etapa
                if (docente.etapaDocente === "Primaria") {
                    elementos.tipoDocentePrimariaSelect.value = (docente.categoriaDocente === "Castellano" || docente.categoriaDocente === "Bilingue") 
                        ? docente.categoriaDocente 
                        : "Castellano";
                } else if (docente.etapaDocente === "Infantil") {
                    elementos.esInglesInfantilCheckbox.checked = (docente.especialidadDocente === "InfantilIngles" || docente.categoriaDocente === "InfantilIngles");
                }
            } else {
                elementos.titulo.textContent = 'Añadir Docente';
            }

            // Actualizar visibilidad de campos
            this.updateDocenteModalCamposVisibles();

            // Mostrar modal con animación
            elementos.modal.style.opacity = '0';
            elementos.modal.style.display = 'flex';
            requestAnimationFrame(() => {
                elementos.modal.style.opacity = '1';
                elementos.modal.classList.add('show');
            });

            // Enfocar el primer campo
            elementos.nombreInput.focus();
        },

        closeDocenteModal: function() {
            const modal = document.getElementById('modalGestionDocente');
            if (!modal) return;

            modal.classList.remove('show');
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        },

        updateDocenteModalCamposVisibles: function() {
            const etapaSeleccionada = document.querySelector('input[name="docenteEtapaModal"]:checked').value;
            const especialidadComun = document.getElementById('docenteEspecialidadComunSelectModal').value;

            const primariaOptionsDiv = document.getElementById('primariaOptionsModalContainer');
            const infantilOptionsDiv = document.getElementById('infantilOptionsModalContainer');
            
            primariaOptionsDiv.style.display = 'none';
            infantilOptionsDiv.style.display = 'none';

            if (especialidadComun === "AL" || especialidadComun === "PT" || especialidadComun === "Religion") {
                // No se muestra ni opciones de primaria ni de infantil si hay especialidad común
            } else {
                if (etapaSeleccionada === "Primaria") {
                    primariaOptionsDiv.style.display = 'block';
                } else if (etapaSeleccionada === "Infantil") {
                    infantilOptionsDiv.style.display = 'block';
                }
            }
        },

        saveDocenteDesdeModal: function() {
            const nombre = document.getElementById('docenteNombreInputModal').value.trim();
            const cargo = document.getElementById('docenteCargoInputModal').value.trim();
            const etapaDocente = document.querySelector('input[name="docenteEtapaModal"]:checked').value;
            const especialidadComun = document.getElementById('docenteEspecialidadComunSelectModal').value;

            if (!nombre) {
                alert("Por favor, introduce el nombre del docente.");
                return;
            }

            let finalEspecialidadDocente = "";
            let finalCategoriaDocente = "";

            if (especialidadComun) {
                finalEspecialidadDocente = especialidadComun;
                finalCategoriaDocente = especialidadComun;
                } else {
                if (etapaDocente === "Primaria") {
                    finalCategoriaDocente = document.getElementById('docenteTipoSelectModal').value;
                    finalEspecialidadDocente = "";
            } else {
                    const esInglesInfantil = document.getElementById('docenteEsInglesInfantilCheckboxModal').checked;
                    if (esInglesInfantil) {
                        finalEspecialidadDocente = "InfantilIngles";
                        finalCategoriaDocente = "InfantilIngles";
                } else {
                        finalEspecialidadDocente = "";
                        if (cargo.toLowerCase().includes('tutor')) {
                            finalCategoriaDocente = "TutorInfantil";
                        } else {
                            finalCategoriaDocente = "InfantilMaestro";
                        }
                    }
                }
            }

            const docenteData = {
                nombre,
                cargo,
                horario: {},
                sustitucionesHechas: 0,
                etapaDocente,
                especialidadDocente: finalEspecialidadDocente,
                categoriaDocente: finalCategoriaDocente,
            };

            const editIndexStr = document.getElementById('docenteEditIndex').value;
            if (editIndexStr !== '') {
                const editIndex = parseInt(editIndexStr);
                const originalDocente = this.datos.docentes[editIndex];
                docenteData.horario = originalDocente.horario;
                docenteData.sustitucionesHechas = originalDocente.sustitucionesHechas;
                this.datos.docentes[editIndex] = docenteData;
            } else {
                const masterHorasDef = this.periodosLectivos['oct-may'].horas;
                this.dias.forEach(dia => {
                    docenteData.horario[dia] = {};
                    masterHorasDef.forEach(horaMaster => {
                        docenteData.horario[dia][horaMaster.mapToMasterIndex] = { estado: "Libre", asignatura: "" };
                    });
                });
                this.datos.docentes.push(docenteData);
            }

            this.saveData();
            this.renderListaDocentes();
            this.actualizarSelectoresDocenteAusente();
            this.closeDocenteModal();
        },
        
        actualizarSelectoresDocenteAusente: function() {
            document.querySelectorAll('.docente-ausente-selector').forEach(select => {
                const currentVal = select.value;
                select.innerHTML = '<option value="">Selecciona docente...</option>';
                this.datos.docentes.forEach((doc, idx) => {
                    const infoDocente = `${doc.nombre} [${doc.etapaDocente} - ${doc.categoriaDocente}] (${doc.cargo})`;
                    select.innerHTML += `<option value="${idx}">${infoDocente}</option>`;
                });
                    select.value = currentVal;
            });
        },

        limpiarRegistro() {
            if (confirm("¿Estás seguro de que quieres borrar todo el registro de sustituciones? Esta acción no se puede deshacer.")) {
                this.datos.log = [];
                this.saveData();
                this.renderLogSustituciones();
                alert("El registro de sustituciones ha sido borrado.");
            }
        },

        resetContadoresSustitucionesDocentes() {
            if (confirm("¿Estás seguro de que quieres resetear a 0 el contador de sustituciones hechas para TODOS los docentes?")) {
                if (this.datos && this.datos.docentes) {
                    this.datos.docentes.forEach(docente => {
                        docente.sustitucionesHechas = 0;
                    });
                    this.saveData();
                    this.renderListaDocentes();
                    alert("Contadores de sustituciones de docentes reseteados a 0.");
                }
            }
        }
    };

    app.init();
    window.cuadranteApp = app;
});