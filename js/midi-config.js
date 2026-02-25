/**
 * MIDI Config Bridge - Diagnóstico e Conectividade
 * Versão corrigida para evitar erro de inicialização assíncrona
 */
const MidiConfig = {
    renderDeviceList() {
        console.log("Iniciando renderDeviceList...");
        const listContainer = document.getElementById('midi-device-list');

        if (!listContainer) {
            console.error("ERRO CRÍTICO: O elemento #midi-device-list não existe no DOM.");
            return;
        }

        // Criando o HTML dos botões e containers
        let html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px;">
                <button class="action-btn" onclick="MidiConfig.scanUSB(event)" style="background:#6750a4; color:white; border:none;">Detectar USB</button>
                <button class="action-btn ble-btn" style="background: #2b3a55; border: 1px solid #4a6fa5; color:white;" onclick="MidiConfig.scanBLE()">Buscar BLE MIDI</button>
            </div>

            <div id="midi-outputs-section">
                <div class="section-title">Saída (Destino)</div>
                <div id="outputs-list"></div>
            </div>

            <div id="midi-inputs-section" style="margin-top:25px;">
                <div class="section-title">Entrada (Controlador)</div>
                <div id="inputs-list"></div>
            </div>
        `;

        listContainer.innerHTML = html;
        console.log("HTML base injetado. Verificando dispositivos...");

        this.updateDeviceLists();
    },

    updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');

        if (!outList || !inList) return;

        // Limpa listas
        outList.innerHTML = "";
        inList.innerHTML = "";

        // CHECAGEM DE SEGURANÇA: Verifica se WebMidi está pronto e habilitado
        const isReady = (typeof WebMidi !== 'undefined' && WebMidi.enabled && WebMidi.outputs && WebMidi.inputs);

        // Lista Saídas
        if (isReady && WebMidi.outputs.length > 0) {
            WebMidi.outputs.forEach(device => {
                const routing = typeof MidiEngine !== 'undefined' ? MidiEngine.getRouting() : {};
                const isSelected = routing.outId === device.id;
                outList.innerHTML += this._renderItem('out', device, isSelected);
            });
        } else {
            outList.innerHTML = `<div class="menu-item no-arrow" style="opacity:0.5; font-size:12px; color:white;">Nenhuma saída detectada ou MIDI inicializando...</div>`;
        }

        // Lista Entradas
        if (isReady && WebMidi.inputs.length > 0) {
            WebMidi.inputs.forEach(device => {
                const routing = typeof MidiEngine !== 'undefined' ? MidiEngine.getRouting() : {};
                const isSelected = routing.inId === device.id;
                inList.innerHTML += this._renderItem('in', device, isSelected);
            });
        } else {
            inList.innerHTML = `<div class="menu-item no-arrow" style="opacity:0.5; font-size:12px; color:white;">Nenhuma entrada detectada ou MIDI inicializando...</div>`;
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')"
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; font-weight:500; color:white;">${device.name}</span>
                    <small style="opacity:0.5; font-size:10px; color:white;">${device.manufacturer || 'MIDI Generic'}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>
        `;
    },

    scanUSB(e) {
        if(e && e.target) e.target.innerText = "Buscando...";

        if (typeof MidiEngine !== 'undefined') {
            MidiEngine.start();
        }

        setTimeout(() => {
            this.updateDeviceLists();
            if(e && e.target) e.target.innerText = "Detectar USB";
        }, 1200);
    },

    async scanBLE() {
        if (!navigator.bluetooth) return alert("Navegador sem suporte a Bluetooth.");
        try {
            await navigator.bluetooth.requestDevice({
                filters: [{ services: ['03b80100-8366-4e49-b312-331dee746c28'] }],
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            // Após parear, aguarda um pouco para o WebMidi detectar a nova porta
            setTimeout(() => this.updateDeviceLists(), 2000);
        } catch (e) {
            console.log("BLE Cancelado");
        }
    },

    applySelection(type, id) {
        if (typeof MidiEngine === 'undefined') return;

        const current = MidiEngine.getRouting();
        let inId = type === 'in' ? id : current.inId;
        let outId = type === 'out' ? id : current.outId;

        MidiEngine.setRouting(inId, outId);
        localStorage.setItem('pref_midi_in', inId);
        localStorage.setItem('pref_midi_out', outId);
        this.updateDeviceLists();
    }
};