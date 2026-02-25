/**
 * MIDI Engine Pro - Performance Edition
 * Gerencia roteamento de dispositivos, Mute/Solo e Feedback Visual
 */
const MidiEngine = (() => {
    const state = {
        mainOutput: null,
        mainInput: null,
        mutedChannels: new Set(),
        soloedChannels: new Set()
    };

    const MIDI_CC = {
        VOLUME: 7,
        PAN: 10,
        CUTOFF: 74,
        RESONANCE: 71,
        ATTACK: 73,
        RELEASE: 72,
        ALL_NOTES_OFF: 123
    };

    const init = async () => {
        try {
            // Se já estiver habilitado, desabilita para forçar o refresh do hardware no Android
            if (WebMidi.enabled) await WebMidi.disable();

            // Tenta iniciar (Sysex é importante para teclados como Juno-D)
            await WebMidi.enable({ sysex: true });
            console.log("WebMidi ativado com sucesso.");
            _setupRouting();
            return true;
        } catch (err) {
            console.warn("Sysex negado ou erro no MIDI, tentando modo básico...");
            try {
                await WebMidi.enable();
                _setupRouting();
                return true;
            } catch (retryErr) {
                console.error("Erro crítico: WebMidi não disponível.", retryErr);
                return false;
            }
        }
    };

    const _setupRouting = () => {
        // Remove ouvintes antigos para não duplicar se clicar em Detectar várias vezes
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

                // Feedback Visual
                if ((status === 0x90 || status === 0xB0) && typeof window.triggerVisualFeedback === "function") {
                    window.triggerVisualFeedback(channel);
                }

                // MIDI THRU
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
            outId: state.mainOutput ? state.mainOutput.id : null,
            inName: state.mainInput ? state.mainInput.name : "Nenhum",
            outName: state.mainOutput ? state.mainOutput.name : "Nenhum"
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

        mute: (channel) => {
            state.mutedChannels.has(channel) ? state.mutedChannels.delete(channel) : state.mutedChannels.add(channel);
        },

        solo: (channel) => {
            state.soloedChannels.has(channel) ? state.soloedChannels.delete(channel) : state.soloedChannels.add(channel);
        },

        panic: () => {
            if (!state.mainOutput) return;
            for (let i = 1; i <= 16; i++) {
                state.mainOutput.channels[i].sendControlChange(MIDI_CC.ALL_NOTES_OFF, 0);
                state.mainOutput.channels[i].sendControlChange(121, 0);
            }
        }
    };
})();

window.addEventListener('load', () => MidiEngine.start());