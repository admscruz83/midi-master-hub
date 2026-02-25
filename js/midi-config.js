/**
 * MIDI Config - Subscrição e Ativação de Fluxo
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.scanBLE()" style="background:#2b3a55; border: 1px solid #4a6fa5; color:white; height:50px; border-radius:8px; cursor:pointer;">1. Parear Bluetooth</button>
                <button class="action-btn" onclick="MidiConfig.forceRebind()" style="background:#4CAF50; color:white; border:none; font-weight:bold; height:50px; border-radius:8px; cursor:pointer;">2. Atualizar Lista</button>
            </div>
            
            <div id="debug-console" style="font-size:11px; color:#4CAF50; background:#000; padding:12px; margin-bottom:15px; border-radius:8px; font-family:monospace; border:1px solid #333; min-height:60px; line-height:1.4;">
                Aguardando conexão (Sem USB)...
            </div>
            
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; border:1px solid #333;">
                <div class="section-title" style="color:#ff9800; font-size:11px; margin-bottom:10px; font-weight:bold; letter-spacing:1px;">ENTRADA (CONTROLADOR)</div>
                <div id="inputs-list" style="min-height:40px;"></div>
                
                <div class="section-title" style="color:#2196F3; font-size:11px; margin:20px 0 10px 0; font-weight:bold; letter-spacing:1px;">SAÍDA (DESTINO)</div>
                <div id="outputs-list" style="min-height:40px;"></div>
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
            this.log(`Monitor: In:${WebMidi.inputs.length} | Out:${WebMidi.outputs.length}`);

            WebMidi.inputs.forEach(input => {
                input.removeListener("midimessage");
                input.addListener("midimessage", e => {
                    this.log(`SINAL: ${input.name} | Nota: ${e.data[1]}`);
                    const outId = MidiEngine.getRouting().outId;
                    if (outId) {
                        const output = WebMidi.getOutputById(outId);
                        if (output) output.send(e.data);
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
        const name = device.name || (type === 'in' ? "Controlador Bluetooth" : "Porta de Saída");
        return `
            <div onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:rgba(255,255,255,0.05); margin-bottom:8px; border-radius:10px; border:1px solid ${isSelected ? color : 'transparent'}; cursor:pointer;">
                <div style="pointer-events:none;">
                    <div style="color:white; font-size:14px; font-weight:bold;">${name}</div>
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
        if (!navigator.bluetooth) return this.log("Navegador incompatível.");
        try {
            this.log("Buscando...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            
            const server = await device.gatt.connect();
            this.log("GATT Conectado. Ativando Notificações...");

            // Tentativa de subscrever na característica MIDI para forçar o fluxo
            try {
                const service = await server.getPrimaryService('03b80100-8366-4e49-b312-331dee746c28');
                const characteristics = await service.getCharacteristics();
                for (let char of characteristics) {
                    if (char.properties.notify || char.properties.read) {
                        await char.startNotifications();
                        this.log("Fluxo de dados MIDI subscrito!");
                    }
                }
            } catch (e) {
                this.log("Aviso: Falha na subscrição direta, tentando modo nativo...");
            }

            setTimeout(async () => {
                await this.forceRebind();
                this.log(WebMidi.inputs.length > 0 ? "Pronto! Selecione na lista." : "In:0 - Reinicie o Bluetooth do celular.");
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
