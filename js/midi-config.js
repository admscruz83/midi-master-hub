/**
 * MIDI Config - Versão Compatibilidade Total (BLE + USB)
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.scanUSB(event)" style="background:#6750a4; color:white; border:none;">Reset USB</button>
                <button class="action-btn" onclick="MidiConfig.scanBLE(event)" style="background:#2b3a55; border: 1px solid #4a6fa5; color:white;">+ Bluetooth</button>
            </div>
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:10px; margin-bottom:15px; border-radius:8px; font-family:monospace; min-height:40px;">
                Dica: Selecione seu controlador na lista que aparecer.
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

    updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Online | In: ${WebMidi.inputs.length} | Out: ${WebMidi.outputs.length}`);
            
            WebMidi.outputs.forEach(dev => {
                const isSel = MidiEngine.getRouting().outId === dev.id;
                outList.innerHTML += this._renderItem('out', dev, isSel);
            });

            WebMidi.inputs.forEach(dev => {
                const isSel = MidiEngine.getRouting().inId === dev.id;
                inList.innerHTML += this._renderItem('in', dev, isSel);
            });
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; color:white;">${device.name || 'Dispositivo MIDI'}</span>
                    <small style="opacity:0.5; font-size:10px;">Porta: ${device.connection || 'MIDI Interface'}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    async scanUSB(e) {
        this.log("Atualizando portas...");
        await MidiEngine.start();
        this.updateDeviceLists();
    },

    async scanBLE(e) {
        if (!navigator.bluetooth) {
            this.log("ERRO: Web Bluetooth não disponível.");
            return;
        }
        
        try {
            this.log("Abrindo seletor de dispositivos...");
            
            // Usando a configuração que funcionou no teste do Google
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28'] // UUID MIDI
            });

            this.log(`Conectando a ${device.name}...`);
            const server = await device.gatt.connect();
            
            this.log("Pareado! Ativando motor MIDI...");
            
            // Forçamos o WebMidi a reiniciar para "enxergar" a nova porta Bluetooth
            await WebMidi.enable();
            await MidiEngine.start();
            
            this.updateDeviceLists();
            this.log(`Sucesso: ${device.name} conectado.`);
        } catch (err) {
            this.log("Erro: " + err.message);
            console.error(err);
        }
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
