/**
 * MIDI Config - Ativação de Fluxo BLE
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.scanBLE()" style="background:#2b3a55; border: 1px solid #4a6fa5; color:white; height:50px; border-radius:8px;">1. Conectar Bluetooth</button>
                <button class="action-btn" onclick="MidiConfig.forceRebind()" style="background:#4CAF50; color:white; border:none; font-weight:bold; height:50px; border-radius:8px;">2. Atualizar Lista</button>
            </div>
            
            <div id="debug-console" style="font-size:11px; color:#4CAF50; background:#000; padding:12px; margin-bottom:15px; border-radius:8px; font-family:monospace; border:1px solid #333; min-height:60px;">
                Luz fixa no controlador? Clique em "Conectar Bluetooth" novamente.
            </div>
            
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px;">
                <div class="section-title" style="color:#ff9800; font-size:11px; margin-bottom:10px;">ENTRADA (CONTROLADOR)</div>
                <div id="inputs-list"></div>
                
                <div class="section-title" style="color:#2196F3; font-size:11px; margin:20px 0 10px 0;">SAÍDA (XPS-10)</div>
                <div id="outputs-list"></div>
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
            this.log(`In:${WebMidi.inputs.length} | Out:${WebMidi.outputs.length}`);

            WebMidi.inputs.forEach(input => {
                input.removeListener("midimessage");
                input.addListener("midimessage", e => {
                    this.log(`SINAL: ${input.name} | Nota: ${e.data[1]}`);
                    const outId = MidiEngine.getRouting().outId;
                    if (outId) WebMidi.getOutputById(outId).send(e.data);
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
        return `
            <div onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:rgba(255,255,255,0.05); margin-bottom:8px; border-radius:10px; border:1px solid ${isSelected ? color : 'transparent'}; cursor:pointer;">
                <div style="pointer-events:none;">
                    <div style="color:white; font-size:14px; font-weight:bold;">${device.name || 'Disp. MIDI'}</div>
                    <small style="color:${color}; font-size:9px;">ID: ${device.id.substring(0,8)}</small>
                </div>
                <div style="width:16px; height:16px; border-radius:50%; background:${isSelected ? color : '#333'};"></div>
            </div>`;
    },

    async forceRebind() {
        this.log("Sincronizando portas...");
        await WebMidi.disable();
        await WebMidi.enable({ sysex: true });
        await MidiEngine.start();
        this.updateDeviceLists();
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Sem suporte Bluetooth.");
        try {
            this.log("Iniciando busca...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28', 'battery_service', 'device_information']
            });
            
            this.log("Conectando...");
            const server = await device.gatt.connect();
            
            // TENTATIVA DE DESPERTAR: Acessamos o serviço MIDI explicitamente
            this.log("Ativando fluxo MIDI...");
            try {
                const service = await server.getPrimaryService('03b80100-8366-4e49-b312-331dee746c28');
                this.log("Serviço MIDI OK. Verificando portas...");
            } catch (e) {
                this.log("Aviso: Tentando modo alternativo...");
            }

            // Aguardamos 2 segundos para o Android registrar o driver MIDI
            setTimeout(async () => {
                await this.forceRebind();
                if (WebMidi.inputs.length < 2) {
                    this.log("Conectado, mas o controlador ainda não enviou dados.");
                } else {
                    this.log("Controlador detectado!");
                }
            }, 2000);

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
