/**
 * MIDI Config - Injeção Forçada de DOM
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        // Criamos a estrutura base com IDs claros para manipulação direta
        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.forceRebind()" style="background:#4CAF50; color:white; border:none; font-weight:bold; height:50px; border-radius:8px; cursor:pointer;">Forçar Reconhecimento</button>
                <button class="action-btn" onclick="MidiConfig.scanBLE()" style="background:#2b3a55; border: 1px solid #4a6fa5; color:white; height:50px; border-radius:8px; cursor:pointer;">+ Bluetooth</button>
            </div>
            <div id="debug-console" style="font-size:11px; color:#4CAF50; background:#000; padding:12px; margin-bottom:15px; border-radius:8px; font-family:monospace; border:1px solid #333;">
                Aguardando...
            </div>
            
            <div style="margin-top:20px;">
                <h3 style="color:#aaa; font-size:12px; text-transform:uppercase; margin-bottom:10px;">Saída (Para Roland XPS)</h3>
                <div id="outputs-list" style="display:flex; flex-direction:column; gap:8px;"></div>
            </div>

            <div style="margin-top:30px;">
                <h3 style="color:#aaa; font-size:12px; text-transform:uppercase; margin-bottom:10px;">Entrada (Do Controlador)</h3>
                <div id="inputs-list" style="display:flex; flex-direction:column; gap:8px;"></div>
            </div>
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
            const numIn = WebMidi.inputs.length;
            const numOut = WebMidi.outputs.length;
            this.log(`Varredura Finalizada: In:${numIn} Out:${numOut}`);

            // Renderização das Entradas (Controladores)
            if (numIn === 0) {
                inList.innerHTML = `<div style="color:#666; font-size:12px; padding:15px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px dashed #444;">Nenhum controlador detectado ainda.</div>`;
            } else {
                WebMidi.inputs.forEach(dev => {
                    const isSelected = MidiEngine.getRouting().inId === dev.id;
                    inList.appendChild(this._createDeviceElement('in', dev, isSelected));
                });
            }

            // Renderização das Saídas (Roland)
            if (numOut === 0) {
                outList.innerHTML = `<div style="color:#666; font-size:12px; padding:15px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px dashed #444;">Conecte o Roland via USB.</div>`;
            } else {
                WebMidi.outputs.forEach(dev => {
                    const isSelected = MidiEngine.getRouting().outId === dev.id;
                    outList.appendChild(this._createDeviceElement('out', dev, isSelected));
                });
            }
        }
    },

    // Método de criação de elemento via objeto (mais seguro que innerHTML para Android)
    _createDeviceElement(type, device, isSelected) {
        const div = document.createElement('div');
        div.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: ${isSelected ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.07)'};
            border: 1px solid ${isSelected ? '#4CAF50' : 'rgba(255,255,255,0.1)'};
            border-radius: 10px;
            cursor: pointer;
        `;
        
        const name = device.name || "Controlador Bluetooth";
        div.innerHTML = `
            <div style="pointer-events:none;">
                <div style="color:white; font-size:14px; font-weight:bold;">${name}</div>
                <div style="color:#888; font-size:10px;">Porta: ${device.id.substring(0,10)}</div>
            </div>
            <div style="width:20px; height:20px; border-radius:50%; border:2px solid ${isSelected ? '#4CAF50' : '#555'}; background:${isSelected ? '#4CAF50' : 'transparent'};"></div>
        `;

        div.onclick = () => this.applySelection(type, device.id);
        return div;
    },

    async forceRebind() {
        this.log("Reiniciando fluxo MIDI...");
        try {
            await WebMidi.disable();
            await WebMidi.enable({ sysex: true });
            await MidiEngine.start();
            
            // Forçamos um tempo para o Android estabilizar a porta
            setTimeout(() => {
                this.updateDeviceLists();
                this.log(`Busca concluída. In:${WebMidi.inputs.length}`);
            }, 800);
        } catch (e) {
            this.log("Erro: " + e.message);
        }
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Navegador sem suporte Bluetooth.");
        try {
            this.log("Buscando aparelhos...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            await device.gatt.connect();
            this.log("Conectado! Verificando portas...");
            setTimeout(() => this.forceRebind(), 2000);
        } catch (err) {
            this.log("Erro: " + err.message);
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
        this.log("Dispositivo Selecionado!");
    }
};
