/**
 * MIDI Config - Deep Scan para forçar montagem de porta no Android
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.scanUSB()" style="background:#6750a4; color:white; border:none;">Reset Geral</button>
                <button class="action-btn" onclick="MidiConfig.scanBLE()" style="background:#2b3a55; border:1px solid #4a6fa5; color:white;">+ Bluetooth</button>
            </div>
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:10px; margin-bottom:15px; border-radius:8px; font-family:monospace; min-height:45px;">
                Aguardando...
            </div>
            <div class="section-title">Saída (Destino)</div>
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
            this.log(`Monitorando Portas: In:${WebMidi.inputs.length} Out:${WebMidi.outputs.length}`);
            
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
                    <span style="font-size:14px; color:white;">${device.name || 'Disp. MIDI'}</span>
                    <small style="opacity:0.5; font-size:9px;">ID: ${device.id.substring(0,8)}</small>
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
            this.log("Iniciando busca...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });

            this.log("Conectando GATT...");
            const server = await device.gatt.connect();
            
            this.log("GATT OK! Forçando despertar do serviço...");
            
            try {
                // Tenta forçar a leitura do serviço MIDI para o Android montar a porta
                const service = await server.getPrimaryService('03b80100-8366-4e49-b312-331dee746c28');
                this.log("Serviço MIDI localizado. Montando driver...");
            } catch (e) {
                this.log("Aviso: Tentando montar porta sem serviço explícito...");
            }

            // O pulo do gato: Espera 3 segundos e reinicia TUDO
            setTimeout(async () => {
                this.log("Sincronizando com o Chrome...");
                await WebMidi.disable();
                await MidiEngine.start();
                this.updateDeviceLists();
                this.log("Dispositivo pronto!");
            }, 3000);

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
