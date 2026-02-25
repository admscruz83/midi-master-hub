/**
 * MIDI Config Bridge - Diagnóstico e Conectividade
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
            <div id="midi-outputs-section">
                <div class="section-title">Saída (Destino)</div>
                <div id="outputs-list"></div>
            </div>
            <div id="midi-inputs-section" style="margin-top:25px;">
                <div class="section-title">Entrada (Controlador)</div>
                <div id="inputs-list"></div>
            </div>
        `;
        this.updateDeviceLists();
    },

    updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        const isReady = (typeof WebMidi !== 'undefined' && WebMidi.enabled);

        if (isReady && WebMidi.outputs.length > 0) {
            WebMidi.outputs.forEach(device => {
                const isSelected = MidiEngine.getRouting().outId === device.id;
                outList.innerHTML += this._renderItem('out', device, isSelected);
            });
        } else {
            outList.innerHTML = `<div class="menu-item no-arrow" style="opacity:0.5; font-size:12px; color:white;">Nenhum dispositivo encontrado.</div>`;
        }

        if (isReady && WebMidi.inputs.length > 0) {
            WebMidi.inputs.forEach(device => {
                const isSelected = MidiEngine.getRouting().inId === device.id;
                inList.innerHTML += this._renderItem('in', device, isSelected);
            });
        } else {
            inList.innerHTML = `<div class="menu-item no-arrow" style="opacity:0.5; font-size:12px; color:white;">Ligue o XPS-10 via OTG.</div>`;
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')"
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; font-weight:500; color:white;">${device.name}</span>
                    <small style="opacity:0.5; font-size:10px; color:white;">${device.manufacturer || 'USB MIDI'}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>
        `;
    },

    async scanUSB(e) {
        const btn = e.target;
        btn.innerText = "Buscando...";
        
        // Tenta pedir acesso nativo primeiro para forçar o balão de permissão
        try {
            if (navigator.requestMIDIAccess) {
                // Não usamos await aqui para não travar o botão se o Chrome ignorar
                navigator.requestMIDIAccess({ sysex: true }).then(() => {
                    console.log("Permissão MIDI concedida.");
                }).catch(err => console.warn("Permissão negada ou ignorada."));
            }
        } catch (err) {}

        // Inicia o motor MIDI
        await MidiEngine.start();

        // Aguarda um pouco e atualiza a lista, independente da permissão travar
        setTimeout(() => {
            this.updateDeviceLists();
            btn.innerText = "Detectar USB";
        }, 1500);
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
