/**
 * MIDI Engine - Versão Direct-Connect v3
 */
const MidiEngine = (() => {
    const state = {
        mainOutput: null,
        mainInput: null,
        mutedChannels: new Set(),
        soloedChannels: new Set()
    };

    const init = async () => {
        try {
            // Se já estiver ativado, retorna ok
            if (WebMidi.enabled) return true;

            // Ativação direta conforme padrão WebMidi v3
            await WebMidi.enable({ sysex: true });
            console.log("WebMidi: ON");
            
            _setupRouting();
            return true;
        } catch (err) {
            console.warn("Erro Sysex, tentando básico...");
            try {
                await WebMidi.enable();
                _setupRouting();
                return true;
            } catch (e) {
                console.error("Falha total na ativação MIDI");
                return false;
            }
        }
    };

    const _setupRouting = () => {
        // Monitora entrada/saída de cabos
        WebMidi.addListener("connected", () => {
            _updatePorts();
            if (window.MidiConfig) window.MidiConfig.updateDeviceLists();
        });
        WebMidi.addListener("disconnected", () => {
            _updatePorts();
            if (window.MidiConfig) window.MidiConfig.updateDeviceLists();
        });
        _updatePorts();
    };

    const _updatePorts = () => {
        // Na v3, acessamos as portas assim:
        state.mainInput = WebMidi.inputs[0] || null;
        state.mainOutput = WebMidi.outputs[0] || null;
        _applyListeners();
    };

    const _applyListeners = () => {
        WebMidi.inputs.forEach(input => input.removeListener());
        if (state.mainInput) {
            state.mainInput.addListener("midimessage", (e) => {
                // Na v3, o canal é e.message.channel
                const channel = e.message.channel;
                const status = e.data[0] & 0xF0;
                
                if ((status === 0x90 || status === 0xB0) && typeof window.triggerVisualFeedback === "function") {
                    window.triggerVisualFeedback(channel);
                }
                
                if (state.mainOutput) {
                    state.mainOutput.send(e.data);
                }
            });
        }
    };

    return {
        start: init,
        getRouting: () => ({ 
            inId: state.mainInput ? state.mainInput.id : null, 
            outId: state.mainOutput ? state.mainOutput.id : null 
        }),
        setRouting: (inId, outId) => {
            state.mainInput = WebMidi.getInputById(inId) || null;
            state.mainOutput = WebMidi.getOutputById(outId) || null;
            _applyListeners();
        },
        sendControl: (ch, cc, val) => {
            if (state.mainOutput) {
                // Na v3, enviamos para o canal específico assim:
                state.mainOutput.channels[ch].sendControlChange(parseInt(cc), parseInt(val));
            }
        },
        panic: () => {
            if (state.mainOutput) {
                for (let i = 1; i <= 16; i++) {
                    state.mainOutput.channels[i].sendControlChange(123, 0);
                }
            }
        }
    };
})();
