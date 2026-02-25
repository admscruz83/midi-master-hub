/**
 * MIDI Config - Suporte Total USB e BLE
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 25px;">
                <button id="btn-usb-scan" class="action-btn" onclick="MidiConfig.scanUSB(event)" style="background:#6750a4; color:white; border:none;">Detectar USB</button>
                <button id="btn-ble-scan" class="action-btn ble-btn" style="background: #2b3a55; border: 1px solid #4a6fa5; color:white;" onclick="MidiConfig.scanBLE(event)">Buscar BLE MIDI</button>
            </div>
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:10px; margin-bottom:15px; border-radius:8px; font-family:monospace; line-height:1.4;">Hardware pronto.</div>
            <div class="section-title">Saída (Destino)</div>
            <div id="outputs-list"></div>
            <div class="section-title" style="margin-top:25px;">Entrada (Controlador)</div>
            <div id="inputs-list"></div>
        `;
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) consoleEl.innerHTML = `> ${msg}`;
    },

    updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Ativo | Portas: ${WebMidi.inputs.length} In / ${WebMidi.outputs.length} Out`);
            
            if (WebMidi.outputs.length > 0) {
                WebMidi.outputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().outId === dev.id;
                    outList.innerHTML += this._renderItem('out', dev, isSel);
                });
            } else {
                outList.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:10px;">Nenhum dispositivo de saída.</div>`;
            }

            if (WebMidi.inputs.length > 0) {
                WebMidi.inputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().inId === dev.id;
                    inList.innerHTML += this._renderItem('in', dev, isSel);
                });
            } else {
                inList.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:10px;">Nenhum dispositivo de entrada.</div>`;
            }
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; color:white;">${device.name || 'Dispositivo MIDI'}</span>
                    <small style="opacity:0.5; font-size:10px;">${device.type === 'input' ? 'Entrada' : 'Saída'}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    async scanUSB(e) {
        const btn = e.target;
        btn.innerText = "A aguardar...";
        try {
            await MidiEngine.start();
            this.updateDeviceLists();
        } catch (err) {
            this.log("Erro USB: " + err.message);
        } finally {
            btn.innerText = "Detectar USB";
        }
    },

    async scanBLE(e) {
        if (!navigator.bluetooth) {
            this.log("Erro: O seu navegador não suporta Bluetooth.");
            return;
        }

        const btn = e.target;
        btn.innerText = "A procurar...";
        this.log("A abrir seletor Bluetooth...");

        try {
            // UUID Universal para MIDI over Bluetooth Low Energy
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['03b80100-8366-4e49-b312-331dee746c28'] }],
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });

            this.log(`Conectado a: ${device.name}. A inicializar MIDI...`);
            
            // Após emparelhar o Bluetooth, precisamos de reiniciar o motor para o WebMidi "ver" a nova porta
            await MidiEngine.start();
            
            setTimeout(() => {
                this.updateDeviceLists();
                btn.innerText = "Buscar BLE MIDI";
                this.log(`Sucesso: ${device.name} pronto!`);
            }, 1500);

        } catch (err) {
            this.log("Bluetooth: " + err.message);
            btn.innerText = "Buscar BLE MIDI";
        }
    },

    applySelection(type, id) {
        const current = MidiEngine.getRouting();
        let inId = type === 'in' ? id : current.inId;
        let outId = type === 'out' ? id : current.outId;
        MidiEngine.setRouting(inId, outId);
        this.updateDeviceLists();
    }
};
