/**
 * MIDI Config - Reconstrução de Interface Pós-BLE
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
                Modo Avião ativo? Aguardando...
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

        // Limpa tudo antes de ler novamente
        outList.innerHTML = "";
        inList.innerHTML = "";

        // Garante que o WebMidi está habilitado antes de listar
        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Portas detectadas: In:${WebMidi.inputs.length} Out:${WebMidi.outputs.length}`);
            
            if (WebMidi.inputs.length === 0) {
                inList.innerHTML = `<div style="opacity:0.3; font-size:11px; padding:10px;">Nenhum controlador Bluetooth/USB listado.</div>`;
            } else {
                WebMidi.inputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().inId === dev.id;
                    inList.innerHTML += this._renderItem('in', dev, isSel);
                });
            }

            if (WebMidi.outputs.length === 0) {
                outList.innerHTML = `<div style="opacity:0.3; font-size:11px; padding:10px;">Nenhuma saída detectada.</div>`;
            } else {
                WebMidi.outputs.forEach(dev => {
                    const isSel = MidiEngine.getRouting().outId === dev.id;
                    outList.innerHTML += this._renderItem('out', dev, isSel);
                });
            }
        }
    },

    _renderItem(type, device, isSelected) {
        return `
            <div class="menu-item no-arrow" onclick="MidiConfig.applySelection('${type}', '${device.id}')" 
                 style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:8px; cursor:pointer;">
                <div style="display:flex; flex-direction:column; pointer-events:none;">
                    <span style="font-size:14px; color:white;">${device.name || 'Dispositivo MIDI'}</span>
                    <small style="opacity:0.5; font-size:9px;">${device.connection === 'usb' ? 'Cabo' : 'Wireless'} - ${device.id.substring(0,5)}</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    async scanUSB() {
        this.log("Reiniciando sistema...");
        await WebMidi.disable();
        await MidiEngine.start();
        this.updateDeviceLists();
    },

    async scanBLE() {
        if (!navigator.bluetooth) return this.log("Bluetooth indisponível.");
        
        try {
            this.log("Abrindo seletor...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });

            this.log("Conectando GATT...");
            const server = await device.gatt.connect();
            
            this.log("Conectado! Verificando permissões...");
            
            // Tenta acessar o serviço para forçar o Android a liberar o driver MIDI
            try {
                await server.getPrimaryService('03b80100-8366-4e49-b312-331dee746c28');
            } catch (e) {
                console.log("Serviço MIDI não reportado, mas prosseguindo...");
            }

            // O segredo: Esperamos o Android "respirar"
            this.log("Aguardando 3 segundos para montagem...");
            
            setTimeout(async () => {
                this.log("Atualizando lista de dispositivos...");
                // Desabilitamos e habilitamos o WebMidi para ele re-escanear o sistema
                await WebMidi.disable();
                await MidiEngine.start();
                
                // Forçamos a reconstrução visual
                this.updateDeviceLists();
                this.log("Dispositivo Pronto!");
            }, 3000);

        } catch (err) {
            this.log("Erro: " + err.message);
        }
    },

    applySelection(type, id) {
        const current = MidiEngine.getRouting();
        let newIn = type === 'in' ? id : current.inId;
        let newOut = type === 'out' ? id : current.outId;
        MidiEngine.setRouting(newIn, newOut);
        this.updateDeviceLists();
    }
};
