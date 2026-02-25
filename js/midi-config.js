/**
 * MIDI Config - Renderização Forçada de Portas Ativas
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.forceRebind()" style="background:#4CAF50; color:white; border:none; font-weight:bold; height:45px; border-radius:8px;">Forçar Reconhecimento</button>
                <button class="action-btn" onclick="MidiConfig.scanBLE()" style="background:#2b3a55; border: 1px solid #4a6fa5; color:white; height:45px; border-radius:8px;">+ Bluetooth</button>
            </div>
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:10px; margin-bottom:15px; border-radius:8px; font-family:monospace; min-height:45px; line-height:1.4;">
                Aguardando comando...
            </div>
            <div class="section-title">Saída (Enviar para Roland)</div>
            <div id="outputs-list" style="min-height:50px;"></div>
            <div class="section-title" style="margin-top:20px;">Entrada (Ler do Controlador)</div>
            <div id="inputs-list" style="min-height:50px;"></div>
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

        // Limpeza absoluta dos containers
        outList.innerHTML = "";
        inList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Portas detectadas: In:${WebMidi.inputs.length} Out:${WebMidi.outputs.length}`);
            
            // Renderização de ENTRADAS
            if (WebMidi.inputs.length === 0) {
                inList.innerHTML = `<div style="opacity:0.3; font-size:11px; padding:10px; border:1px dashed rgba(255,255,255,0.1); border-radius:8px;">Nenhum controlador visível.</div>`;
            } else {
                WebMidi.inputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().inId === dev.id;
                    inList.innerHTML += this._renderItem('in', dev, isSel);
                });
            }

            // Renderização de SAÍDAS
            if (WebMidi.outputs.length === 0) {
                outList.innerHTML = `<div style="opacity:0.3; font-size:11px; padding:10px; border:1px dashed rgba(255,255,255,0.1); border-radius:8px;">Conecte o Roland via USB.</div>`;
            } else {
                WebMidi.outputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().outId === dev.id;
                    outList.innerHTML += this._renderItem('out', dev, isSel);
                });
            }
        }
    },

    _renderItem(type, device, isSelected) {
        // Fallback para nomes vazios (comum em BLE no Android)
        const name = device.name || "Dispositivo MIDI Bluetooth";
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.08); margin-bottom:8px; border-radius:8px; border: 1px solid ${isSelected ? '#4CAF50' : 'transparent'}; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; color:white; font-weight:500;">${name}</span>
                    <small style="opacity:0.5; font-size:9px;">ID: ${device.id.substring(0,12)}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}" style="width:18px; height:18px; border:2px solid #666; border-radius:50%; position:relative;">
                    ${isSelected ? '<div style="position:absolute; top:3px; left:3px; width:8px; height:8px; background:#4CAF50; border-radius:50%;"></div>' : ''}
                </div>
            </div>`;
    },

    async forceRebind() {
        this.log("Reiniciando motor MIDI...");
        try {
            await WebMidi.disable();
            await WebMidi.enable({ sysex: true });
            await MidiEngine.start();
            
            // Aguarda 500ms para o DOM processar
            setTimeout(() => {
                this.updateDeviceLists();
                this.log("Lista atualizada com sucesso!");
            }, 500);
        } catch (e) {
            this.log("Erro: " + e.message);
        }
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Sem suporte a Bluetooth.");
        try {
            this.log("Buscando dispositivos...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            
            this.log("Conectando ao GATT...");
            await device.gatt.connect();
            
            this.log("Luz fixa? Aguardando porta...");
            setTimeout(() => this.forceRebind(), 2500);
        } catch (err) {
            this.log("Erro: " + err.message);
        }
    },

    applySelection(type, id) {
        const current = MidiEngine.getRouting();
        let inId = type === 'in' ? id : current.inId;
        let outId = type === 'out' ? id : current.outId;
        MidiEngine.setRouting(inId, outId);
        
        // Salva para não perder ao recarregar
        localStorage.setItem('pref_midi_in', inId);
        localStorage.setItem('pref_midi_out', outId);
        
        this.updateDeviceLists();
        this.log("Seleção aplicada!");
    }
};
