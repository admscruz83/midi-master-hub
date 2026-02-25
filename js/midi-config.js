/**
 * MIDI Config - Diagnóstico de Hardware Roland
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px;">
                <button id="btn-usb-scan" class="action-btn" onclick="MidiConfig.scanUSB(event)" style="background:#6750a4; color:white; border:none;">Detectar USB</button>
                <button class="action-btn ble-btn" style="background: #2b3a55; border: 1px solid #4a6fa5; color:white;" onclick="MidiConfig.scanBLE()">Buscar BLE MIDI</button>
            </div>
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:5px; margin-bottom:15px; border-radius:5px; font-family:monospace; min-height:20px;">Aguardando ação...</div>
            <div class="section-title">Saída (Destino)</div>
            <div id="outputs-list"></div>
            <div class="section-title" style="margin-top:25px;">Entrada (Controlador)</div>
            <div id="inputs-list"></div>
        `;
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) consoleEl.innerText = msg;
    },

    updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        const isReady = (typeof WebMidi !== 'undefined' && WebMidi.enabled);
        
        if (isReady) {
            this.log(`WebMidi ON | Entradas: ${WebMidi.inputs.length} | Saídas: ${WebMidi.outputs.length}`);
            
            if (WebMidi.outputs.length > 0) {
                WebMidi.outputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().outId === dev.id;
                    outList.innerHTML += this._renderItem('out', dev, isSel);
                });
            } else {
                outList.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:10px; color:white;">Nenhuma saída detectada pelo Chrome.</div>`;
            }

            if (WebMidi.inputs.length > 0) {
                WebMidi.inputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().inId === dev.id;
                    inList.innerHTML += this._renderItem('in', dev, isSel);
                });
            } else {
                inList.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:10px; color:white;">Nenhuma entrada detectada.</div>`;
            }
        } else {
            this.log("WebMidi ainda não inicializado.");
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; font-weight:500; color:white;">${device.name || 'USB MIDI'}</span>
                    <small style="opacity:0.5; font-size:10px; color:white;">${device.manufacturer || 'Roland'}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    async scanUSB(e) {
        const btn = e.target;
        btn.innerText = "Autorizando...";
        this.log("Solicitando permissão MIDI ao Android...");
        
        try {
            if (navigator.requestMIDIAccess) {
                await navigator.requestMIDIAccess({ sysex: true });
                this.log("Permissão OK! Iniciando motor...");
            }
            
            await MidiEngine.start();
            
            setTimeout(() => {
                this.updateDeviceLists();
                btn.innerText = "Detectar USB";
                if (WebMidi.inputs.length === 0) {
                    this.log("Erro: Android não entregou o hardware. Teste outro cabo/adaptador.");
                } else {
                    this.log("Sucesso! Dispositivos encontrados.");
                }
            }, 1000);
        } catch (err) {
            this.log("Erro de permissão: " + err.message);
            btn.innerText = "Erro!";
        }
    },

    async scanBLE() {
        if (!navigator.bluetooth) return alert("Bluetooth não suportado.");
        try {
            await navigator.bluetooth.requestDevice({
                filters: [{ services: ['03b80100-8366-4e49-b312-331dee746c28'] }],
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            setTimeout(() => this.updateDeviceLists(), 2000);
        } catch (e) { console.log("BLE Cancelado"); }
    },

    applySelection(type, id) {
        const current = MidiEngine.getRouting();
        let inId = type === 'in' ? id : current.inId;
        let outId = type === 'out' ? id : current.outId;
        MidiEngine.setRouting(inId, outId);
        localStorage.setItem('pref_midi_in', inId);
        localStorage.setItem('pref_midi_out', outId);
        this.updateDeviceLists();
    }
};
