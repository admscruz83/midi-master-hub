/**
 * MIDI Config - Escuta Ativa de Portas (USB/BLE)
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.scanUSB(event)" style="background:#6750a4; color:white; border:none;">Reset Geral</button>
                <button class="action-btn" onclick="MidiConfig.scanBLE(event)" style="background:#2b3a55; border:1px solid #4a6fa5; color:white;">+ Bluetooth</button>
            </div>
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:10px; margin-bottom:15px; border-radius:8px; font-family:monospace; min-height:45px;">
                Aguardando dispositivos...
            </div>
            <div class="section-title">Saída (Destino)</div>
            <div id="outputs-list"></div>
            <div class="section-title" style="margin-top:20px;">Entrada (Controlador)</div>
            <div id="inputs-list"></div>
        `;
        
        // Ativa ouvinte de eventos para quando uma porta Bluetooth "nascer" no sistema
        this.setupEventListeners();
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) consoleEl.innerHTML = `> ${msg}`;
    },

    setupEventListeners() {
        if (typeof WebMidi !== 'undefined') {
            WebMidi.removeListener("connected");
            WebMidi.addListener("connected", (e) => {
                this.log(`Novo dispositivo: ${e.port.name}`);
                this.updateDeviceLists();
            });
        }
    },

    async updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Portas: In:${WebMidi.inputs.length} Out:${WebMidi.outputs.length}`);
            
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
                    <span style="font-size:14px; color:white;">${device.name || 'Bluetooth MIDI'}</span>
                    <small style="opacity:0.5; font-size:9px;">Conexão: ${device.connection || 'ativa'}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    async scanUSB() {
        this.log("Reiniciando WebMidi...");
        await WebMidi.disable();
        await MidiEngine.start();
        this.updateDeviceLists();
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Sem suporte a Bluetooth.");
        
        try {
            this.log("Buscando...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });

            this.log("Conectando...");
            await device.gatt.connect();
            
            this.log("Controlador detectado com sucesso!");
            
            // Força o sistema a re-escanear as portas MIDI após a conexão Bluetooth
            setTimeout(async () => {
                await WebMidi.enable();
                await MidiEngine.start();
                this.updateDeviceLists();
            }, 2000);

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
    }
};
