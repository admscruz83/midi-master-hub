/**
 * MIDI Config - Final com Monitor de Atividade
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.scanBLE()" style="background:#2b3a55; border: 1px solid #4a6fa5; color:white; height:50px; border-radius:8px;">1. Parear Bluetooth</button>
                <button class="action-btn" onclick="MidiConfig.forceRebind()" style="background:#4CAF50; color:white; border:none; font-weight:bold; height:50px; border-radius:8px;">2. Atualizar Lista</button>
            </div>
            
            <div id="debug-console" style="font-size:11px; color:#4CAF50; background:#000; padding:12px; margin-bottom:15px; border-radius:8px; font-family:monospace; border:1px solid #333; min-height:60px;">
                Aguardando sinal MIDI...
            </div>
            
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px;">
                <div class="section-title" style="color:#ff9800; font-size:11px; letter-spacing:1px; margin-bottom:10px;">ENTRADAS (CONTROLADORES)</div>
                <div id="inputs-list"></div>
                
                <div class="section-title" style="color:#2196F3; font-size:11px; letter-spacing:1px; margin:20px 0 10px 0;">SAÍDAS (DESTINO SOM)</div>
                <div id="outputs-list"></div>
            </div>
        `;
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) {
            consoleEl.innerHTML = `> ${msg}`;
            console.log("MIDI Master Log:", msg);
        }
    },

    async updateDeviceLists() {
        const inList = document.getElementById('inputs-list');
        const outList = document.getElementById('outputs-list');
        if (!inList || !outList) return;

        inList.innerHTML = "";
        outList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            // Monitor de Atividade em tempo real
            WebMidi.inputs.forEach(input => {
                input.removeListener("midimessage");
                input.addListener("midimessage", e => {
                    this.log(`Sinal recebido de: ${input.name} | Nota: ${e.data[1]}`);
                });

                const isSelected = MidiEngine.getRouting().inId === input.id;
                inList.innerHTML += this._renderItem('in', input, isSelected);
            });

            WebMidi.outputs.forEach(output => {
                const isSelected = MidiEngine.getRouting().outId === output.id;
                outList.innerHTML += this._renderItem('out', output, isSelected);
            });
        }
    },

    _renderItem(type, device, isSelected) {
        const isBLE = device.name && (device.name.toLowerCase().includes('midi') || !device.connection || device.connection !== 'usb');
        const color = type === 'in' ? '#ff9800' : '#2196F3';
        
        return `
            <div onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:${isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'}; margin-bottom:8px; border-radius:10px; border:1px solid ${isSelected ? color : 'transparent'}; cursor:pointer;">
                <div style="pointer-events:none;">
                    <div style="color:white; font-size:14px; font-weight:bold;">${device.name || 'Disp. MIDI'}</div>
                    <small style="color:${color}; font-size:9px; text-transform:uppercase;">${type === 'in' ? 'Controlador' : 'Saída'} [${device.id.substring(0,5)}]</small>
                </div>
                <div style="width:18px; height:18px; border-radius:50%; border:2px solid ${isSelected ? color : '#444'}; background:${isSelected ? color : 'transparent'}; transition: 0.2s;"></div>
            </div>`;
    },

    async forceRebind() {
        this.log("Re-escaneando hardware...");
        await WebMidi.disable();
        await WebMidi.enable({ sysex: true });
        await MidiEngine.start();
        setTimeout(() => this.updateDeviceLists(), 600);
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Sem Bluetooth no navegador.");
        try {
            this.log("Buscando Bluetooth...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            this.log("Pareando...");
            await device.gatt.connect();
            this.log("Conectado! Verifique a lista.");
            setTimeout(() => this.forceRebind(), 1500);
        } catch (err) {
            this.log("Erro: " + err.message);
        }
    },

    applySelection(type, id) {
        const current = MidiEngine.getRouting();
        let inId = type === 'in' ? id : current.inId;
        let outId = type === 'out' ? id : current.outId;
        MidiEngine.setRouting(inId, outId);
        this.updateDeviceLists();
        this.log("Dispositivo Ativado!");
    }
};
