/**
 * MIDI Engine - Versão Desbloqueio Chrome Android
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
            // Se já estiver ligado, não faz nada
            if (typeof WebMidi !== 'undefined' && WebMidi.enabled) return true;

            // Tenta habilitar com uma promessa que não trava o resto do código
            await WebMidi.enable({ sysex: true });
            console.log("WebMidi: OK (Sysex)");
        } catch (err) {
            console.warn("Tentando sem Sysex...");
            try {
                await WebMidi.enable();
            } catch (e) {
                console.error("WebMidi falhou criticamente.");
                return false;
            }
        }
        _setupRouting();
        return true;
    };

    const _setupRouting = () => {
        WebMidi.removeListener("connected");
        WebMidi.addListener("connected", () => {
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

    const _isChannelActive = (ch) => state.soloedChannels.size > 0 ? state.soloedChannels.has(ch) : !state.mutedChannels.has(ch);

    return {
        start: init,
        getRouting: () => ({ inId: state.mainInput?.id, outId: state.mainOutput?.id }),
        setRouting: (inId, outId) => {
            state.mainInput = WebMidi.getInputById(inId) || null;
            state.mainOutput = WebMidi.getOutputById(outId) || null;
            _applyListeners();
        },
        sendControl: (ch, cc, val) => state.mainOutput?.channels[ch].sendControlChange(parseInt(cc), parseInt(val)),
        panic: () => {
            if (!state.mainOutput) return;
            for (let i = 1; i <= 16; i++) {
                state.mainOutput.channels[i].sendControlChange(123, 0);
            }
        }
    };
})();
