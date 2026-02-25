/**
 * MIDI Config Bridge - Ativador de Hardware
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
            <div class="section-title">Saída (Destino)</div>
            <div id="outputs-list"></div>
            <div class="section-title" style="margin-top:25px;">Entrada (Controlador)</div>
            <div id="inputs-list"></div>
        `;
        this.updateDeviceLists();
    },

    updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        // Verifica se o WebMidi está habilitado e se existem portas
        const isReady = (typeof WebMidi !== 'undefined' && WebMidi.enabled);

        if (isReady && WebMidi.outputs.length > 0) {
            WebMidi.outputs.forEach(device => {
                const isSelected = MidiEngine.getRouting().outId === device.id;
                outList.innerHTML += this._renderItem('out', device, isSelected);
            });
        } else {
            outList.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:10px; color:white;">Nenhuma saída encontrada.</div>`;
        }

        if (isReady && WebMidi.inputs.length > 0) {
            WebMidi.inputs.forEach(device => {
                const isSelected = MidiEngine.getRouting().inId === device.id;
                inList.innerHTML += this._renderItem('in', device, isSelected);
            });
        } else {
            inList.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:10px; color:white;">Nenhuma entrada encontrada.</div>`;
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; font-weight:500; color:white;">${device.name}</span>
                    <small style="opacity:0.5; font-size:10px; color:white;">${device.manufacturer || 'MIDI Device'}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    async scanUSB(e) {
        const btn = e.target;
        btn.innerText = "Solicitando...";
        
        try {
            // FORÇA O NAVEGADOR A PEDIR PERMISSÃO AO USUÁRIO
            if (navigator.requestMIDIAccess) {
                await navigator.requestMIDIAccess({ sysex: true });
            }
            
            // Reinicia o motor para garantir que o WebMidi.js veja o que a API acabou de liberar
            await MidiEngine.start();
            
            setTimeout(() => {
                this.updateDeviceLists();
                btn.innerText = "Detectar USB";
            }, 1000);
        } catch (err) {
            console.error("Permissão MIDI negada pelo usuário ou navegador.");
            btn.innerText = "Erro Permissão";
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
