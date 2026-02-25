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
        // Pequeno delay para garantir estabilidade do hardware no carregamento
        setTimeout(async () => {
            try {
                // Tenta iniciar com Sysex para compatibilidade total com teclados avançados
                await WebMidi.enable({ sysex: true });
                console.log("WebMidi ativado com sucesso.");
                _setupRouting();
            } catch (err) {
                console.warn("Sysex não suportado ou negado, tentando modo básico...");
                try {
                    await WebMidi.enable();
                    _setupRouting();
                } catch (retryErr) {
                    console.error("Erro crítico: WebMidi não disponível.", retryErr);
                }
            }
        }, 500);
    };

    const _setupRouting = () => {
        // Escuta conexões físicas em tempo real
        WebMidi.addListener("connected", () => {
            _updatePorts();
            if (window.refreshDeviceLists) window.refreshDeviceLists();
        });
        WebMidi.addListener("disconnected", () => {
            _updatePorts();
            if (window.refreshDeviceLists) window.refreshDeviceLists();
        });
        _updatePorts();
    };

    const _updatePorts = () => {
        // Prioridade: 1. Preferência salva | 2. Primeiro dispositivo disponível | 3. Nulo
        const savedIn = localStorage.getItem('pref_midi_in');
        const savedOut = localStorage.getItem('pref_midi_out');

        state.mainInput = WebMidi.getInputById(savedIn) || WebMidi.inputs[0] || null;
        state.mainOutput = WebMidi.getOutputById(savedOut) || WebMidi.outputs[0] || null;

        _applyListeners();
    };

    const _applyListeners = () => {
        // Limpa listeners existentes em TODAS as entradas para evitar processamento duplicado
        WebMidi.inputs.forEach(input => input.removeListener());

        if (state.mainInput) {
            state.mainInput.addListener("midimessage", (e) => {
                const channel = (e.data[0] & 0x0F) + 1;
                const status = e.data[0] & 0xF0;

                // 1. Feedback Visual: Dispara se for NoteOn ou ControlChange
                if ((status === 0x90 || status === 0xB0) && typeof window.triggerVisualFeedback === "function") {
                    window.triggerVisualFeedback(channel);
                }

                // 2. MIDI THRU: Repassa a mensagem se o canal estiver ativo e houver saída
                if (_isChannelActive(channel) && state.mainOutput) {
                    state.mainOutput.send(e.data);
                }
            });
        }
    };

    const _isChannelActive = (channel) => {
        // Lógica de Solo: Se houver algum canal em Solo, apenas eles passam
        if (state.soloedChannels.size > 0) return state.soloedChannels.has(channel);
        // Lógica de Mute: Se não estiver mutado, passa
        return !state.mutedChannels.has(channel);
    };

    // Interface Pública
    return {
        start: init,

        // Fornece o estado atual para o seletor de dispositivos
        getRouting: () => ({
            inId: state.mainInput ? state.mainInput.id : null,
            outId: state.mainOutput ? state.mainOutput.id : null,
            inName: state.mainInput ? state.mainInput.name : "Nenhum",
            outName: state.mainOutput ? state.mainOutput.name : "Nenhum"
        }),

        // Altera o roteamento e aplica imediatamente
        setRouting: (inId, outId) => {
            state.mainInput = WebMidi.getInputById(inId) || null;
            state.mainOutput = WebMidi.getOutputById(outId) || null;
            _applyListeners();
        },

        // Envia Control Change (Volume, Cutoff, etc)
        sendControl: (channel, cc, value) => {
            if (!state.mainOutput) return;
            // WebMidi.js lida com canais de 1-16
            state.mainOutput.channels[channel].sendControlChange(parseInt(cc), parseInt(value));
        },

        mute: (channel) => {
            state.mutedChannels.has(channel) ?
                state.mutedChannels.delete(channel) :
                state.mutedChannels.add(channel);
        },

        solo: (channel) => {
            state.soloedChannels.has(channel) ?
                state.soloedChannels.delete(channel) :
                state.soloedChannels.add(channel);
        },

        panic: () => {
            if (!state.mainOutput) return;
            console.warn("Panic enviado!");
            for (let i = 1; i <= 16; i++) {
                // All Notes Off + Reset All Controllers
                state.mainOutput.channels[i].sendControlChange(MIDI_CC.ALL_NOTES_OFF, 0);
                state.mainOutput.channels[i].sendControlChange(121, 0);
            }
        }
    };
})();

// Auto-start
window.addEventListener('load', MidiEngine.start);