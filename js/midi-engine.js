/**
 * MIDI Engine - Inicialização à Prova de Falhas
 */
const MidiEngine = (() => {
    const state = {
        mainOutput: null,
        mainInput: null,
        mutedChannels: new Set(),
        soloedChannels: new Set()
    };

    const init = async () => {
        return new Promise(async (resolve) => {
            console.log("Iniciando processo de ativação...");
            
            // Timeout de segurança: se em 3s não inicializar, ele força o erro para não travar
            const timeout = setTimeout(() => {
                console.error("Timeout na inicialização do WebMidi");
                resolve(false);
            }, 3000);

            try {
                // Se já estiver habilitado, reseta
                if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
                    await WebMidi.disable();
                }

                // Tenta primeiro com Sysex (ideal para Roland)
                await WebMidi.enable({ sysex: true });
                console.log("WebMidi: ON com Sysex");
            } catch (err) {
                console.warn("Sysex negado, tentando modo básico...");
                try {
                    // Tenta sem Sysex (mais compatível)
                    await WebMidi.enable();
                    console.log("WebMidi: ON (Básico)");
                } catch (e) {
                    clearTimeout(timeout);
                    resolve(false);
                    return;
                }
            }

            clearTimeout(timeout);
            _setupRouting();
            resolve(true);
        });
    };

    const _setupRouting = () => {
        WebMidi.removeListener("connected");
        WebMidi.removeListener("disconnected");
        
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
        const savedIn = localStorage.getItem('pref_midi_in');
        const savedOut = localStorage.getItem('pref_midi_out');
        
        state.mainInput = WebMidi.getInputById(savedIn) || WebMidi.inputs[0] || null;
        state.mainOutput = WebMidi.getOutputById(savedOut) || WebMidi.outputs[0] || null;
        
        _applyListeners();
    };

    const _applyListeners = () => {
        WebMidi.inputs.forEach(input => input.removeListener());
        if (state.mainInput) {
            state.mainInput.addListener("midimessage", (e) => {
                const channel = (e.data[0] & 0x0F) + 1;
                const status = e.data[0] & 0xF0;
                if ((status === 0x90 || status === 0xB0) && typeof window.triggerVisualFeedback === "function") {
                    window.triggerVisualFeedback(channel);
                }
                if (_isChannelActive(channel) && state.mainOutput) {
                    state.mainOutput.send(e.data);
                }
            });
        }
    };

    const _isChannelActive = (ch) => state.soloedChannels.size > 0 ? state.soloedChannels.has(ch) : !state.mutedChannels.has(ch);

    return {
        start: init,
        getRouting: () => ({ inId: state.mainInput?.id, outId: state.mainOutput?.id }),
        setRouting: (inId, outId) => {
            state.mainInput = WebMidi.getInputById(inId) || null;
            state.mainOutput = WebMidi.getOutputById(outId) || null;
            _applyListeners();
        },
        sendControl: (ch, cc, val) => {
            if (state.mainOutput) {
                state.mainOutput.channels[ch].sendControlChange(parseInt(cc), parseInt(val));
            }
        },
        panic: () => {
            if (state.mainOutput) {
                for (let i = 1; i <= 16; i++) state.mainOutput.channels[i].sendControlChange(123, 0);
            }
        }
    };
})();
