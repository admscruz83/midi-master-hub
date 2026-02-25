/**
 * MIDI Engine Pro - Performance Edition (Fix Juno-D)
 */
const MidiEngine = (() => {
    const state = {
        mainOutput: null,
        mainInput: null,
        mutedChannels: new Set(),
        soloedChannels: new Set()
    };

    const init = async () => {
        console.log("Tentando habilitar WebMidi...");
        try {
            // Se já estiver ligado, desliga para limpar o cache de hardware do Android
            if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
                await WebMidi.disable();
            }

            // Tentativa 1: Com Sysex (Ideal para Roland)
            await WebMidi.enable({ sysex: true });
            console.log("WebMidi ativado com Sysex.");
        } catch (err) {
            console.warn("Erro no Sysex, tentando modo básico...");
            try {
                // Tentativa 2: Sem Sysex (Fallback)
                await WebMidi.enable();
                console.log("WebMidi ativado no modo básico.");
            } catch (retryErr) {
                console.error("WebMidi falhou totalmente.", retryErr);
                return false;
            }
        }

        _setupRouting();
        return true;
    };

    const _setupRouting = () => {
        WebMidi.removeListener("connected");
        WebMidi.addListener("connected", (e) => {
            console.log("Conectado:", e.port.name);
            _updatePorts();
            if (typeof MidiConfig !== 'undefined') MidiConfig.updateDeviceLists();
        });
        _updatePorts();
    };

    const _updatePorts = () => {
        const savedIn = localStorage.getItem('pref_midi_in');
        const savedOut = localStorage.getItem('pref_midi_out');

        // Se o Juno-D aparecer, ele será capturado aqui
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

    const _isChannelActive = (channel) => {
        if (state.soloedChannels.size > 0) return state.soloedChannels.has(channel);
        return !state.mutedChannels.has(channel);
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
        sendControl: (channel, cc, value) => {
            if (!state.mainOutput) return;
            state.mainOutput.channels[channel].sendControlChange(parseInt(cc), parseInt(value));
        },
        panic: () => {
            if (!state.mainOutput) return;
            for (let i = 1; i <= 16; i++) {
                state.mainOutput.channels[i].sendControlChange(123, 0);
                state.mainOutput.channels[i].sendControlChange(121, 0);
            }
        }
    };
})();

window.addEventListener('load', () => MidiEngine.start());
