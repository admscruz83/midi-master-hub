/**
 * MIDI Config - Conexão de Força Bruta (Estilo Nativo)
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.scanBLE()" style="background:#2b3a55; border: 1px solid #4a6fa5; color:white; height:55px; border-radius:8px; font-weight:bold;">1. TENTAR CONEXÃO</button>
                <button class="action-btn" onclick="MidiConfig.fullReset()" style="background:#4CAF50; color:white; border:none; height:55px; border-radius:8px; font-weight:bold;">2. REFRESH LISTA</button>
            </div>
            
            <div id="debug-console" style="font-size:11px; color:#4CAF50; background:#000; padding:12px; margin-bottom:15px; border-radius:8px; font-family:monospace; border:1px solid #333; min-height:80px; line-height:1.4;">
                DICA: Se o app BLE MIDI Connect estiver aberto, FECHE-O antes de tentar aqui.
            </div>
            
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; border:1px solid #333;">
                <div class="section-title" style="color:#ff9800; font-size:11px; margin-bottom:12px; font-weight:bold; letter-spacing:1px;">ENTRADA (CONTROLADOR)</div>
                <div id="inputs-list" style="min-height:50px;"></div>
                
                <div class="section-title" style="color:#2196F3; font-size:11px; margin:25px 0 12px 0; font-weight:bold; letter-spacing:1px;">SAÍDA (XPS-10)</div>
                <div id="outputs-list" style="min-height:50px;"></div>
            </div>
        `;
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) consoleEl.innerHTML = `> ${msg}`;
    },

    async updateDeviceLists() {
        const inList = document.getElementById('inputs-list');
        const outList = document.getElementById('outputs-list');
        if (!inList || !outList) return;

        inList.innerHTML = "";
        outList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Portas Ativas - In:${WebMidi.inputs.length} | Out:${WebMidi.outputs.length}`);

            WebMidi.inputs.forEach(input => {
                input.removeListener("midimessage");
                input.addListener("midimessage", e => {
                    this.log(`SINAL: ${input.name} | Nota: ${e.data[1]}`);
                    const outId = MidiEngine.getRouting().outId;
                    if (outId) {
                        const out = WebMidi.getOutputById(outId);
                        if (out) out.send(e.data);
                    }
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
        const color = type === 'in' ? '#ff9800' : '#2196F3';
        const name = device.name || "Dispositivo MIDI";
        return `
            <div onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:${isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'}; margin-bottom:8px; border-radius:10px; border:1px solid ${isSelected ? color : 'transparent'}; cursor:pointer;">
                <div style="pointer-events:none;">
                    <div style="color:white; font-size:14px; font-weight:bold;">${name}</div>
                    <small style="color:${color}; font-size:10px;">Porta: ${device.id.substring(0,6)}</small>
                </div>
                <div style="width:16px; height:16px; border-radius:50%; background:${isSelected ? color : '#333'};"></div>
            </div>`;
    },

    async fullReset() {
        this.log("Reiniciando motor MIDI...");
        await WebMidi.disable();
        await new Promise(r => setTimeout(r, 1000));
        await WebMidi.enable({ sysex: true });
        await MidiEngine.start();
        this.updateDeviceLists();
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Navegador sem suporte Bluetooth.");
        
        try {
            this.log("Solicitando dispositivo...");
            // O segredo está em pedir o UUID específico que o Android exige para MIDI
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['03b80100-8366-4e49-b312-331dee746c28'] }],
                optionalServices: ['battery_service', 'device_information']
            });

            this.log("Conectando ao hardware...");
            const server = await device.gatt.connect();
            
            this.log("Luz fixa! Acordando serviço MIDI...");
            // Forçamos a leitura do serviço para "validar" a conexão no Chrome
            const service = await server.getPrimaryService('03b80100-8366-4e49-b312-331dee746c28');
            
            this.log("Serviço validado. Reiniciando portas...");
            
            // Aguarda 2 segundos e reinicia o WebMidi para ele "enxergar" o novo hardware
            setTimeout(() => this.fullReset(), 2000);

        } catch (err) {
            this.log("Erro: " + err.message);
            // Se der erro de filtro, tenta o modo genérico
            if (err.message.includes("User cancelled")) return;
            this.log("Tentando modo genérico...");
            this.scanGeneric();
        }
    },

    async scanGeneric() {
        try {
            const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
            await device.gatt.connect();
            setTimeout(() => this.fullReset(), 2000);
        } catch (e) { this.log("Erro fatal: " + e.message); }
    },

    applySelection(type, id) {
        const current = MidiEngine.getRouting();
        MidiEngine.setRouting(type === 'in' ? id : current.inId, type === 'out' ? id : current.outId);
        this.updateDeviceLists();
    }
};
