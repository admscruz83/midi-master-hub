/**
 * MIDI Config - Captura de Porta Fixa
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.forceRebind()" style="background:#4CAF50; color:white; border:none; font-weight:bold;">Forçar Reconhecimento</button>
                <button class="action-btn" onclick="MidiConfig.scanBLE()" style="background:#2b3a55; border: 1px solid #4a6fa5; color:white;">+ Bluetooth</button>
            </div>
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:10px; margin-bottom:15px; border-radius:8px; font-family:monospace; min-height:45px;">
                Luz fixa detectada? Clique em "Forçar Reconhecimento".
            </div>
            <div class="section-title">Saída (Para Roland XPS)</div>
            <div id="outputs-list"></div>
            <div class="section-title" style="margin-top:20px;">Entrada (Controlador)</div>
            <div id="inputs-list"></div>
        `;
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) consoleEl.innerHTML = `> ${msg}`;
    },

    async updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Varredura: In:${WebMidi.inputs.length} Out:${WebMidi.outputs.length}`);
            
            if (WebMidi.inputs.length > 0) {
                WebMidi.inputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().inId === dev.id;
                    inList.innerHTML += this._renderItem('in', dev, isSel);
                });
            } else {
                inList.innerHTML = `<div style="opacity:0.3; font-size:11px; padding:10px;">Controlador ainda oculto pelo Android...</div>`;
            }

            WebMidi.outputs.forEach(dev => {
                const isSel = MidiEngine.getRouting().outId === dev.id;
                outList.innerHTML += this._renderItem('out', dev, isSel);
            });
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; color:white;">${device.name || 'Bluetooth MIDI'}</span>
                    <small style="opacity:0.5; font-size:9px;">Status: Conectado (${device.id.substring(0,4)})</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    // A NOVA FUNÇÃO: Tenta capturar o que já está pareado sem abrir janelas
    async forceRebind() {
        this.log("Forçando leitura de portas ativas...");
        try {
            await WebMidi.disable();
            // Re-habilita com sysex para garantir permissão total
            await WebMidi.enable({ sysex: true });
            await MidiEngine.start();
            this.updateDeviceLists();
            
            if (WebMidi.inputs.length > 0) {
                this.log("Sucesso! Porta encontrada.");
            } else {
                this.log("Ainda nada. Reinicie o Bluetooth do celular.");
            }
        } catch (e) {
            this.log("Erro no rebind: " + e.message);
        }
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Sem suporte a Bluetooth.");
        try {
            this.log("Iniciando busca...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            await device.gatt.connect();
            this.log("GATT Conectado! Luz deve ficar fixa.");
            
            // Espera curta e tenta o rebind automático
            setTimeout(() => this.forceRebind(), 2000);
        } catch (err) {
            this.log("Erro: " + err.message);
        }
    },

    applySelection(type, id) {
        const current = MidiEngine.getRouting();
        MidiEngine.setRouting(type === 'in' ? id : current.inId, type === 'out' ? id : current.outId);
        this.updateDeviceLists();
    }
};
