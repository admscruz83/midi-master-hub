/**
 * MIDI Config - Ativação Direta de Hardware
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
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:10px; margin-bottom:15px; border-radius:8px; font-family:monospace; line-height:1.4;">Aguardando clique...</div>
            <div class="section-title">Saída (Destino)</div>
            <div id="outputs-list"></div>
            <div class="section-title" style="margin-top:25px;">Entrada (Controlador)</div>
            <div id="inputs-list"></div>
        `;
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) {
            consoleEl.innerHTML = `> ${msg}`;
            console.log(msg);
        }
    },

    updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        // Verifica se o WebMidi global está pronto
        const isReady = (typeof WebMidi !== 'undefined' && WebMidi.enabled);
        
        if (isReady) {
            const inCount = WebMidi.inputs.length;
            const outCount = WebMidi.outputs.length;
            this.log(`STATUS: Ativo | Portas: ${inCount} In / ${outCount} Out`);
            
            if (outCount > 0) {
                WebMidi.outputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().outId === dev.id;
                    outList.innerHTML += this._renderItem('out', dev, isSel);
                });
            } else {
                outList.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:10px;">Nenhuma saída detectada.</div>`;
            }

            if (inCount > 0) {
                WebMidi.inputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().inId === dev.id;
                    inList.innerHTML += this._renderItem('in', dev, isSel);
                });
            } else {
                inList.innerHTML = `<div style="opacity:0.5; font-size:12px; padding:10px;">Nenhuma entrada detectada.</div>`;
            }
        } else {
            this.log("STATUS: Inativo (Clique em Detectar)");
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px;">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-size:14px; color:white;">${device.name || 'Instrumento USB'}</span>
                    <small style="opacity:0.5; font-size:10px;">${device.manufacturer || 'Roland'}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    async scanUSB(e) {
        const btn = e.target;
        btn.innerText = "Conectando...";
        this.log("Tentando inicializar driver...");
        
        try {
            // Tenta ativar o motor diretamente aqui
            const success = await MidiEngine.start();
            
            if (success) {
                this.log("Driver ativado com sucesso!");
                this.updateDeviceLists();
            } else {
                this.log("Falha: O navegador não ativou o MIDI.");
            }
        } catch (err) {
            this.log("Erro fatal: " + err.message);
        } finally {
            btn.innerText = "Detectar USB";
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
        MidiEngine.setRouting(
            type === 'in' ? id : MidiEngine.getRouting().inId,
            type === 'out' ? id : MidiEngine.getRouting().outId
        );
        this.updateDeviceLists();
    }
};
