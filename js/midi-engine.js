/**
 * MIDI Engine - Suporte Hot-Swap BLE/USB
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
            // Se já estiver ativo, não desabilita, apenas garante a ativação
            await WebMidi.enable({ sysex: true });
            console.log("WebMidi: Ativo");
            _setupRouting();
            return true;
        } catch (err) {
            try {
                await WebMidi.enable();
                _setupRouting();
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    const _setupRouting = () => {
        // Remove ouvintes antigos para evitar duplicidade ao reconectar BLE
        WebMidi.removeListener("connected");
        WebMidi.addListener("connected", (e) => {
            console.log(`Dispositivo conectado: ${e.port.name}`);
            _updatePorts();
            if (window.MidiConfig) window.MidiConfig.updateDeviceLists();
        });

        WebMidi.removeListener("disconnected");
        WebMidi.addListener("disconnected", () => {
            _updatePorts();
            if (window.MidiConfig) window.MidiConfig.updateDeviceLists();
        });

        _updatePorts();
    };

    const _updatePorts = () => {
        // Prioriza dispositivos selecionados ou pega o primeiro disponível
        const savedIn = localStorage.getItem('pref_midi_in');
        const savedOut = localStorage.getItem('pref_midi_out');
        
        state.mainInput = WebMidi.getInputById(savedIn) || WebMidi.inputs[0] || null;
        state.mainOutput = WebMidi.getOutputById(savedOut) || WebMidi.outputs[0] || null;
        
        _applyListeners();
    };

    const _applyListeners = () => {
        // Escuta TODAS as entradas ativas para feedback visual, 
        // mas só faz o roteamento (THRU) da entrada selecionada
        WebMidi.inputs.forEach(input => {
            input.removeListener("midimessage");
            input.addListener("midimessage", (e) => {
                const channel = e.message.channel;
                const status = e.data[0] & 0xF0;

                // Feedback visual para qualquer nota em qualquer controlador
                if ((status === 0x90) && typeof window.triggerVisualFeedback === "function") {
                    window.triggerVisualFeedback(channel);
                }

                // Roteamento: Se for a entrada principal, manda para a saída
                if (input === state.mainInput && state.mainOutput) {
                    state.mainOutput.send(e.data);
                }
            });
        });
    };

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
            WebMidi.outputs.forEach(out => {
                for (let i = 1; i <= 16; i++) out.channels[i].sendControlChange(123, 0);
            });
        }
    };
})();
