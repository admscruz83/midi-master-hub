/**
 * MIDI Config - Seleção Automática de Emergência
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.forceRebind()" style="background:#4CAF50; color:white; border:none; font-weight:bold; height:50px; border-radius:8px;">1. Forçar Reconhecimento</button>
                <button class="action-btn" onclick="MidiConfig.autoSelectIn()" style="background:#ff9800; color:white; border:none; font-weight:bold; height:50px; border-radius:8px;">2. Seleção Forçada</button>
            </div>
            <div id="debug-console" style="font-size:11px; color:#4CAF50; background:#000; padding:12px; margin-bottom:15px; border-radius:8px; font-family:monospace; border:1px solid #333;">
                Aguardando...
            </div>
            
            <div id="midi-display-area" style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; border:1px solid #444;">
                <h3 style="color:#aaa; font-size:12px; margin-bottom:15px; text-transform:uppercase;">Dispositivos Encontrados</h3>
                <div id="inputs-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                <hr style="border:0; border-top:1px solid #333; margin:15px 0;">
                <div id="outputs-list" style="display:flex; flex-direction:column; gap:10px;"></div>
            </div>
        `;
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) consoleEl.innerHTML = `> ${msg}`;
    },

    // A MÁGICA: Se o In:1 existe, mas não aparece, essa função seleciona ele às cegas
    autoSelectIn() {
        if (typeof WebMidi !== 'undefined' && WebMidi.inputs.length > 0) {
            const firstIn = WebMidi.inputs[0];
            this.applySelection('in', firstIn.id);
            this.log(`FORÇADO: ${firstIn.name || 'Controlador'} Selecionado!`);
            alert("Controlador selecionado à força! Tente tocar.");
        } else {
            this.log("Erro: Nenhuma entrada detectada para forçar.");
        }
    },

    async updateDeviceLists() {
        const inList = document.getElementById('inputs-list');
        const outList = document.getElementById('outputs-list');
        if (!inList || !outList) return;

        inList.innerHTML = "";
        outList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Status: In:${WebMidi.inputs.length} Out:${WebMidi.outputs.length}`);

            // Lista Entradas
            WebMidi.inputs.forEach(dev => {
                const isSelected = MidiEngine.getRouting().inId === dev.id;
                inList.innerHTML += this._renderSimpleItem('in', dev, isSelected);
            });

            // Lista Saídas
            WebMidi.outputs.forEach(dev => {
                const isSelected = MidiEngine.getRouting().outId === dev.id;
                outList.innerHTML += this._renderSimpleItem('out', dev, isSelected);
            });
        }
    },

    _renderSimpleItem(type, device, isSelected) {
        return `
            <div onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="padding:15px; background:${isSelected ? '#2e7d32' : '#333'}; border-radius:8px; color:white; font-weight:bold; cursor:pointer; border:1px solid ${isSelected ? '#4CAF50' : '#555'};">
                ${type === 'in' ? '🎹' : '🔊'} ${device.name || 'Dispositivo MIDI'} 
                ${isSelected ? ' (ATIVO)' : ''}
            </div>`;
    },

    async forceRebind() {
        this.log("Reiniciando motor...");
        await WebMidi.disable();
        await WebMidi.enable({ sysex: true });
        await MidiEngine.start();
        setTimeout(() => this.updateDeviceLists(), 500);
    },

    async scanBLE() {
        try {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            await device.gatt.connect();
            this.log("GATT OK. Aguarde...");
            setTimeout(() => this.forceRebind(), 2000);
        } catch (err) { this.log("Erro: " + err.message); }
    },

    applySelection(type, id) {
        const current = MidiEngine.getRouting();
        let inId = type === 'in' ? id : current.inId;
        let outId = type === 'out' ? id : current.outId;
        MidiEngine.setRouting(inId, outId);
        this.updateDeviceLists();
    }
};
