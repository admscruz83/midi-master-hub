/**
 * MIDI Config - Modo Aberto (Accept All) com Re-scan Agressivo
 */
const MidiConfig = {
    renderDeviceList() {
        const listContainer = document.getElementById('midi-device-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <button class="action-btn" onclick="MidiConfig.scanUSB(event)" style="background:#6750a4; color:white; border:none;">Reset MIDI</button>
                <button class="action-btn" onclick="MidiConfig.scanBLE(event)" style="background:#2b3a55; border:1px solid #4a6fa5; color:white;">+ Bluetooth</button>
            </div>
            <div id="debug-console" style="font-size:10px; color:#4CAF50; background:#000; padding:10px; margin-bottom:15px; border-radius:8px; font-family:monospace; min-height:45px;">
                Status: Aguardando conexão...
            </div>
            <div class="section-title">Saída (Para Roland XPS)</div>
            <div id="outputs-list"></div>
            <div class="section-title" style="margin-top:20px;">Entrada (Controlador)</div>
            <div id="inputs-list"></div>
        `;
        this.updateDeviceLists();
    },

    log(msg) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) consoleEl.innerHTML = `> ${msg}`;
        console.log("MIDI Log:", msg);
    },

    async updateDeviceLists() {
        const outList = document.getElementById('outputs-list');
        const inList = document.getElementById('inputs-list');
        if (!outList || !inList) return;

        outList.innerHTML = "";
        inList.innerHTML = "";

        if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
            this.log(`Portas: ${WebMidi.inputs.length} In / ${WebMidi.outputs.length} Out`);
            
            if (WebMidi.outputs.length === 0 && WebMidi.inputs.length === 0) {
                outList.innerHTML = inList.innerHTML = `<div style="opacity:0.3; font-size:11px; padding:10px;">Nenhum dispositivo MIDI disponível.</div>`;
                return;
            }

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
                    <span style="font-size:14px; color:white;">${device.name || 'Disp. Desconhecido'}</span>
                    <small style="opacity:0.5; font-size:9px;">${device.manufacturer || 'MIDI Port'} (${type})</small>
                </div>
                <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
            </div>`;
    },

    async scanUSB(e) {
        this.log("Forçando reinicialização do motor...");
        await WebMidi.disable(); // Desliga para limpar o cache de portas
        await MidiEngine.start();
        this.updateDeviceLists();
    },

    async scanBLE(e) {
        if (!navigator.bluetooth) return this.log("Navegador não suporta Bluetooth.");
        
        try {
            this.log("Iniciando busca (Modo Aberto)...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['03b80100-8366-4e49-b312-331dee746c28']
            });

            this.log(`Conectando a: ${device.name}`);
            const server = await device.gatt.connect();
            
            this.log("GATT Conectado! Sincronizando com Android...");
            
            // Loop de Redetecção Agressivo
            let checkCount = 0;
            const checkInterval = setInterval(async () => {
                checkCount++;
                
                // Força o sistema a re-escanear dispositivos MIDI
                await WebMidi.enable(); 
                await MidiEngine.start();
                this.updateDeviceLists();
                
                if (WebMidi.inputs.length > 0) {
                    clearInterval(checkInterval);
                    this.log("Controlador detectado com sucesso!");
                } else if (checkCount >= 6) {
                    clearInterval(checkInterval);
                    this.log("Conectado, mas o Android ainda não criou a porta MIDI.");
                } else {
                    this.log(`Buscando porta MIDI... (Tentativa ${checkCount})`);
                }
            }, 1000);

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
    }
};
