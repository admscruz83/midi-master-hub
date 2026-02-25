/**
 * MIDI Engine Pro - Performance Edition
 */
const MidiEngine = (() => {
    const state = {
        mainOutput: null,
        mainInput: null,
        mutedChannels: new Set(),
        soloedChannels: new Set()
    };

    const init = async () => {
        console.log("Iniciando WebMidi...");
        try {
            // Se já estiver habilitado, tenta apenas reconfigurar as portas
            if (typeof WebMidi !== 'undefined' && WebMidi.enabled) {
                _setupRouting();
                return true;
            }
            
            await WebMidi.enable({ sysex: true });
            console.log("WebMidi ativado com sucesso.");
            _setupRouting();
            return true;
        } catch (err) {
            console.warn("Falha no Sysex, tentando modo simples...");
            try {
                await WebMidi.enable();
                _setupRouting();
                return true;
            } catch (retryErr) {
                console.error("WebMidi indisponível:", retryErr);
                return false;
            }
        }
    };

    const _setupRouting = () => {
        WebMidi.removeListener("connected");
        WebMidi.removeListener("disconnected");

        WebMidi.addListener("connected", () => {
            _updatePorts();
            if (typeof MidiConfig !== 'undefined') MidiConfig.updateDeviceLists();
        });
        WebMidi.addListener("disconnected", () => {
            _updatePorts();
            if (typeof MidiConfig !== 'undefined') MidiConfig.updateDeviceLists();
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
