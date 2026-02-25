/**
 * MIDI Config - Isolamento de Dispositivos (USB vs BLE)
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
            
            <div id="debug-console" style="font-size:11px; color:#4CAF50; background:#000; padding:12px; margin-bottom:15px; border-radius:8px; font-family:monospace; border:1px solid #333;">
                Aguardando dispositivos...
            </div>
            
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px;">
                <div class="section-title" style="color:#ff9800; font-size:12px; margin-bottom:10px;">ENTRADAS (CONTROLADORES)</div>
                <div id="inputs-list"></div>
                
                <div class="section-title" style="color:#2196F3; font-size:12px; margin:20px 0 10px 0;">SAÍDAS (DESTINO SOM)</div>
                <div id="outputs-list"></div>
            </div>
            
            <div style="margin-top:15px; text-align:center;">
                <small style="color:#666; font-size:10px;">Se o Bluetooth não aparecer, desligue o Juno-D do cabo momentaneamente.</small>
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
            this.log(`Varredura: In:${WebMidi.inputs.length} | Out:${WebMidi.outputs.length}`);

            // Renderizar Entradas
            if (WebMidi.inputs.length === 0) {
                inList.innerHTML = `<div style="color:#555; font-size:11px;">Nenhuma entrada detectada.</div>`;
            } else {
                WebMidi.inputs.forEach(dev => {
                    const isSelected = MidiEngine.getRouting().inId === dev.id;
                    const isBLE = dev.connection !== 'usb';
                    inList.innerHTML += this._renderItem('in', dev, isSelected, isBLE);
                });
            }

            // Renderizar Saídas
            if (WebMidi.outputs.length === 0) {
                outList.innerHTML = `<div style="color:#555; font-size:11px;">Conecte o Juno-D / Roland via USB.</div>`;
            } else {
                WebMidi.outputs.forEach(dev => {
                    const isSelected = MidiEngine.getRouting().outId === dev.id;
                    outList.innerHTML += this._renderItem('out', dev, isSelected, false);
                });
            }
        }
    },

    _renderItem(type, device, isSelected, isBLE) {
        const themeColor = isBLE ? "#ff9800" : "#2196F3";
        return `
            <div onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; border:1px solid ${isSelected ? themeColor : 'transparent'}; cursor:pointer;">
                <div style="display:flex; flex-direction:column;">
                    <span style="color:white; font-size:14px;">${device.name || 'Dispositivo MIDI'}</span>
                    <small style="color:${themeColor}; font-size:9px;">${isBLE ? 'BLUETOOTH' : 'CABO USB'}</small>
                </div>
                <div style="width:12px; height:12px; border-radius:50%; background:${isSelected ? themeColor : '#333'}; border:1px solid #666;"></div>
            </div>`;
    },

    async forceRebind() {
        this.log("Re-escaneando portas...");
        await WebMidi.disable();
        await WebMidi.enable({ sysex: true });
        await MidiEngine.start();
        setTimeout(() => this.updateDeviceLists(), 800);
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Sem suporte BLE.");
        try {
            this.log("Buscando Bluetooth...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });
            await device.gatt.connect();
            this.log("Bluetooth Pareado! Atualizando...");
            setTimeout(() => this.forceRebind(), 2000);
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
